import { v7 as uuidv7 } from 'uuid';
import type { FastifyInstance } from 'fastify';
import type { Database_, UserRow } from '@kidsprogress/db';
import type { AppConfig } from '../../config.js';
import { makeHasher, type Hasher } from '../../lib/argon2.js';
import { generateRefreshToken, hashToken, parseDurationSeconds } from '../../lib/tokens.js';
import { createAuditLogger, type AuditLogger } from '../../lib/audit.js';
import { createAuthRepo, type AuthRepo } from './auth.repo.js';
import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  InvalidPinError,
  InvalidRefreshTokenError,
  PinNotSetError,
} from './auth.errors.js';

export interface IssuedTokens {
  accessToken: string;
  accessExpiresAt: string;
  refreshToken: string;
  refreshExpiresAt: string;
}

export interface AuthContext {
  ip?: string;
  userAgent?: string;
}

export function createAuthService(opts: {
  db: Database_;
  jwt: FastifyInstance['jwt'];
  config: AppConfig;
  hasher?: Hasher;
  repo?: AuthRepo;
  audit?: AuditLogger;
}) {
  const config = opts.config;
  const hasher = opts.hasher ?? makeHasher(config);
  const repo = opts.repo ?? createAuthRepo(opts.db);
  const audit = opts.audit ?? createAuditLogger(opts.db);

  function issueAccessToken(user: Pick<UserRow, 'id' | 'email' | 'role'>) {
    const accessToken = opts.jwt.sign(
      { sub: user.id, email: user.email, role: user.role, type: 'access' },
      { expiresIn: config.JWT_ACCESS_TTL },
    );
    const accessExpiresAt = new Date(
      Date.now() + parseDurationSeconds(config.JWT_ACCESS_TTL) * 1000,
    ).toISOString();
    return { accessToken, accessExpiresAt };
  }

  async function issueRefreshToken(opts2: {
    userId: string;
    familyId: string;
    ctx: AuthContext;
  }): Promise<{ refreshToken: string; refreshExpiresAt: string }> {
    const { token, tokenHash } = generateRefreshToken();
    const refreshExpiresAt = new Date(
      Date.now() + parseDurationSeconds(config.JWT_REFRESH_TTL) * 1000,
    ).toISOString();
    await repo.insertRefreshToken({
      id: uuidv7(),
      userId: opts2.userId,
      tokenHash,
      familyId: opts2.familyId,
      expiresAt: refreshExpiresAt,
      userAgent: opts2.ctx.userAgent ?? null,
      ipAddress: opts2.ctx.ip ?? null,
    });
    return { refreshToken: token, refreshExpiresAt };
  }

  async function issueTokens(
    user: Pick<UserRow, 'id' | 'email' | 'role'>,
    ctx: AuthContext,
    familyId = uuidv7(),
  ): Promise<IssuedTokens> {
    const access = issueAccessToken(user);
    const refresh = await issueRefreshToken({ userId: user.id, familyId, ctx });
    return { ...access, ...refresh };
  }

  return {
    async register(
      params: { email: string; password: string; displayName: string },
      ctx: AuthContext,
    ): Promise<{ user: UserRow; tokens: IssuedTokens }> {
      const existing = await repo.findUserByEmail(params.email);
      if (existing) {
        await audit.write({
          event: 'auth.register',
          outcome: 'failure',
          actorEmail: params.email,
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
          meta: { reason: 'email_taken' },
        });
        throw new EmailAlreadyRegisteredError('Email already registered');
      }
      const passwordHash = await hasher.hash(params.password);
      const user = await repo.insertUser({
        id: uuidv7(),
        email: params.email,
        passwordHash,
        displayName: params.displayName,
        role: 'parent',
      });
      const tokens = await issueTokens(user, ctx);
      await audit.write({
        event: 'auth.register',
        outcome: 'success',
        actorUserId: user.id,
        actorEmail: user.email,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return { user, tokens };
    },

    async login(
      params: { email: string; password: string },
      ctx: AuthContext,
    ): Promise<{ user: UserRow; tokens: IssuedTokens }> {
      const user = await repo.findUserByEmail(params.email);
      if (!user) {
        // Run a hash anyway to keep timing constant (avoid email-enumeration via response time).
        await hasher.verify(
          '$argon2id$v=19$m=19456,t=2,p=1$ZHVtbXk$cElxRkRMQzVCb2J2YkRlYW9aSEZ4UQ',
          params.password,
        );
        await audit.write({
          event: 'auth.login',
          outcome: 'failure',
          actorEmail: params.email,
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
          meta: { reason: 'no_such_user' },
        });
        throw new InvalidCredentialsError('Invalid email or password');
      }
      const ok = await hasher.verify(user.passwordHash, params.password);
      if (!ok) {
        await audit.write({
          event: 'auth.login',
          outcome: 'failure',
          actorUserId: user.id,
          actorEmail: user.email,
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
          meta: { reason: 'bad_password' },
        });
        throw new InvalidCredentialsError('Invalid email or password');
      }
      const tokens = await issueTokens(user, ctx);
      await audit.write({
        event: 'auth.login',
        outcome: 'success',
        actorUserId: user.id,
        actorEmail: user.email,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return { user, tokens };
    },

    /**
     * Refresh-token rotation: the presented token is single-use. We issue a
     * new refresh token in the same family and mark the old one revoked.
     * If a revoked token is replayed → revoke the entire family (someone
     * else is holding a stolen copy). Audit fix #10.
     */
    async refresh(
      refreshToken: string,
      ctx: AuthContext,
    ): Promise<{ user: UserRow; tokens: IssuedTokens }> {
      const tokenHash = hashToken(refreshToken);
      const row = await repo.findRefreshTokenByHash(tokenHash);
      if (!row) throw new InvalidRefreshTokenError('Invalid refresh token');

      // Replay detection: revoked or expired tokens trigger family revocation.
      const now = new Date();
      if (row.revokedAt || new Date(row.expiresAt) <= now) {
        await repo.revokeFamily(row.familyId);
        await audit.write({
          event: 'auth.refresh',
          outcome: 'failure',
          actorUserId: row.userId,
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
          meta: { reason: row.revokedAt ? 'replay_detected' : 'expired', familyId: row.familyId },
        });
        throw new InvalidRefreshTokenError('Invalid refresh token');
      }

      const user = await repo.findUserById(row.userId);
      if (!user) throw new InvalidRefreshTokenError('Invalid refresh token');

      // Rotate: issue new refresh in same family, revoke the old one with a pointer.
      const newRefresh = await issueRefreshToken({
        userId: user.id,
        familyId: row.familyId,
        ctx,
      });
      const access = issueAccessToken(user);
      // We need the new row's id to set replacedById; the simplest is to look it up by hash.
      const newRow = await repo.findActiveRefreshTokenByHash(hashToken(newRefresh.refreshToken));
      await repo.revokeRefreshToken(row.id, newRow?.id);

      await audit.write({
        event: 'auth.refresh',
        outcome: 'success',
        actorUserId: user.id,
        actorEmail: user.email,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return {
        user,
        tokens: { ...access, ...newRefresh },
      };
    },

    async logout(refreshToken: string, ctx: AuthContext): Promise<void> {
      const tokenHash = hashToken(refreshToken);
      const row = await repo.findRefreshTokenByHash(tokenHash);
      if (row && !row.revokedAt) {
        await repo.revokeRefreshToken(row.id);
      }
      await audit.write({
        event: 'auth.logout',
        outcome: 'success',
        actorUserId: row?.userId,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
    },

    async setPin(userId: string, pin: string, ctx: AuthContext): Promise<void> {
      const pinHash = await hasher.hash(pin);
      await repo.setUserPinHash(userId, pinHash);
      await audit.write({
        event: 'auth.parent_pin_verify',
        outcome: 'success',
        actorUserId: userId,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        meta: { action: 'set' },
      });
    },

    async verifyPin(userId: string, pin: string, ctx: AuthContext): Promise<void> {
      const user = await repo.findUserById(userId);
      if (!user) throw new InvalidPinError('Invalid PIN');
      if (!user.pinHash) throw new PinNotSetError('PIN not set');
      const ok = await hasher.verify(user.pinHash, pin);
      if (!ok) {
        await audit.write({
          event: 'auth.parent_pin_verify',
          outcome: 'failure',
          actorUserId: userId,
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
        });
        throw new InvalidPinError('Invalid PIN');
      }
      await audit.write({
        event: 'auth.parent_pin_verify',
        outcome: 'success',
        actorUserId: userId,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
