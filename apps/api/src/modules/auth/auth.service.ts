import { v7 as uuidv7 } from 'uuid';
import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';
import type { Database_, UserRow } from '@kidsprogress/db';
import { makeHasher, type Hasher } from '../../lib/argon2.js';
import { generateRefreshToken, hashToken, parseDurationSeconds } from '../../lib/tokens.js';
import { createAuditLogger, type AuditLogger } from '../../lib/audit.js';
import type { AccessRole, AccessTokenPayload } from '../../plugins/auth.js';
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

interface IssueOpts {
  subjectKind: 'parent' | 'child';
  subjectId: string;
  familyId: string;
  role: AccessRole;
  /** For `child-readonly` only — the parent user-id initiating view-as. */
  actorUserId?: string;
  deviceId?: string;
  ctx: AuthContext;
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

  function signAccess(payload: AccessTokenPayload): { accessToken: string; accessExpiresAt: string } {
    const accessToken = opts.jwt.sign(payload, { expiresIn: config.JWT_ACCESS_TTL });
    const accessExpiresAt = new Date(
      Date.now() + parseDurationSeconds(config.JWT_ACCESS_TTL) * 1000,
    ).toISOString();
    return { accessToken, accessExpiresAt };
  }

  async function issueTokens(io: IssueOpts): Promise<IssuedTokens> {
    const access = signAccess({
      type: 'access',
      role: io.role,
      sub: io.subjectId,
      family: io.familyId,
      ...(io.actorUserId ? { actorUserId: io.actorUserId } : {}),
    });

    const { token, tokenHash } = generateRefreshToken();
    const refreshExpiresAt = new Date(
      Date.now() + parseDurationSeconds(config.JWT_REFRESH_TTL) * 1000,
    ).toISOString();
    await repo.insertRefreshToken({
      id: uuidv7(),
      subjectKind: io.subjectKind,
      subjectId: io.subjectId,
      ...(io.deviceId ? { deviceId: io.deviceId } : {}),
      tokenHash,
      expiresAt: refreshExpiresAt,
    });
    return { ...access, refreshToken: token, refreshExpiresAt };
  }

  return {
    /**
     * Register a new parent. Each parent gets their own family (familyId = users.id).
     */
    async register(
      params: { email: string; password: string; displayName: string; locale?: 'en' | 'zh' },
      ctx: AuthContext,
    ): Promise<{ user: UserRow; tokens: IssuedTokens }> {
      const existing = await repo.findUserByEmail(params.email);
      if (existing) {
        await audit.write({
          kind: 'parent_register',
          outcome: 'failure',
          reason: 'email_taken',
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
        throw new EmailAlreadyRegisteredError('Email already registered');
      }
      const passwordHash = await hasher.hash(params.password);
      const userId = uuidv7();
      const user = await repo.insertUser({
        id: userId,
        familyId: userId, // single-family: id === familyId at insert time
        email: params.email,
        passwordHash,
        displayName: params.displayName,
        locale: params.locale ?? 'en',
      });

      const tokens = await issueTokens({
        subjectKind: 'parent',
        subjectId: user.id,
        familyId: user.familyId,
        role: 'parent',
        ctx,
      });

      await audit.write({
        kind: 'parent_register',
        outcome: 'success',
        familyId: user.familyId,
        actor: `parent:${user.id}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return { user, tokens };
    },

    async login(
      params: { email: string; password: string },
      ctx: AuthContext,
    ): Promise<{ user: UserRow; tokens: IssuedTokens }> {
      const user = await repo.findUserByEmail(params.email);
      // Constant-time hash even on no-such-user to avoid email enumeration.
      if (!user) {
        await hasher.verify(
          '$argon2id$v=19$m=19456,t=2,p=1$ZHVtbXk$cElxRkRMQzVCb2J2YkRlYW9aSEZ4UQ',
          params.password,
        );
        await audit.write({
          kind: 'parent_login',
          outcome: 'failure',
          reason: 'no_such_user',
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
        throw new InvalidCredentialsError('Invalid email or password');
      }
      const ok = await hasher.verify(user.passwordHash, params.password);
      if (!ok) {
        await audit.write({
          kind: 'parent_login',
          outcome: 'failure',
          familyId: user.familyId,
          actor: `parent:${user.id}`,
          reason: 'bad_password',
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
        throw new InvalidCredentialsError('Invalid email or password');
      }
      const tokens = await issueTokens({
        subjectKind: 'parent',
        subjectId: user.id,
        familyId: user.familyId,
        role: 'parent',
        ctx,
      });
      await audit.write({
        kind: 'parent_login',
        outcome: 'success',
        familyId: user.familyId,
        actor: `parent:${user.id}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return { user, tokens };
    },

    /**
     * Refresh-token rotation with replay detection.
     *
     * - Unknown hash → 401, no side-effect.
     * - Active token → issue new access + new refresh, revoke the old with
     *   `reason='rotated'`.
     * - Revoked token presented → ASSUME COMPROMISE: revoke every active
     *   refresh token for the subject with `reason='replay_detected'`.
     * - Expired (active but past expiresAt) → 401, single-row revoke.
     */
    async refresh(
      refreshToken: string,
      ctx: AuthContext,
    ): Promise<{ user: UserRow; tokens: IssuedTokens }> {
      const tokenHash = hashToken(refreshToken);
      const row = await repo.findRefreshTokenByHash(tokenHash);
      if (!row) throw new InvalidRefreshTokenError('Invalid refresh token');

      if (row.revokedAt) {
        await repo.revokeAllForSubject(
          row.subjectKind,
          row.subjectId,
          'replay_detected',
        );
        await audit.write({
          kind: 'token_replay_detected',
          outcome: 'failure',
          actor: `${row.subjectKind}:${row.subjectId}`,
          reason: 'replayed_revoked_token',
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
        throw new InvalidRefreshTokenError('Invalid refresh token');
      }

      if (new Date(row.expiresAt) <= new Date()) {
        await repo.revokeRefreshToken(row.id, 'expired');
        throw new InvalidRefreshTokenError('Refresh token expired');
      }

      const user = await repo.findUserById(row.subjectId);
      if (!user || row.subjectKind !== 'parent') {
        // Child refresh flow will land in Phase 1f.
        throw new InvalidRefreshTokenError('Invalid refresh token');
      }

      const tokens = await issueTokens({
        subjectKind: 'parent',
        subjectId: user.id,
        familyId: user.familyId,
        role: 'parent',
        ctx,
      });
      await repo.revokeRefreshToken(row.id, 'rotated');
      await audit.write({
        kind: 'token_refresh',
        outcome: 'success',
        familyId: user.familyId,
        actor: `parent:${user.id}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return { user, tokens };
    },

    async logout(refreshToken: string, ctx: AuthContext): Promise<void> {
      const tokenHash = hashToken(refreshToken);
      const row = await repo.findRefreshTokenByHash(tokenHash);
      if (row && !row.revokedAt) {
        await repo.revokeRefreshToken(row.id, 'logout');
      }
      await audit.write({
        kind: 'parent_logout',
        outcome: 'success',
        actor: row ? `${row.subjectKind}:${row.subjectId}` : null,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    },

    async setParentPin(userId: string, pin: string, ctx: AuthContext): Promise<void> {
      const user = await repo.findUserById(userId);
      if (!user) throw new InvalidPinError('Unknown user');
      const pinHash = await hasher.hash(pin);
      await repo.setParentPortalPinHash(userId, pinHash);
      await audit.write({
        kind: 'parent_pin_set',
        outcome: 'success',
        familyId: user.familyId,
        actor: `parent:${user.id}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    },

    async verifyParentPin(userId: string, pin: string, ctx: AuthContext): Promise<void> {
      const user = await repo.findUserById(userId);
      if (!user) throw new InvalidPinError('Unknown user');
      if (!user.parentPortalPinHash) throw new PinNotSetError('Parent portal PIN not set');
      const ok = await hasher.verify(user.parentPortalPinHash, pin);
      if (!ok) {
        await audit.write({
          kind: 'parent_pin_verify',
          outcome: 'failure',
          familyId: user.familyId,
          actor: `parent:${user.id}`,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
        throw new InvalidPinError('Invalid PIN');
      }
      await audit.write({
        kind: 'parent_pin_verify',
        outcome: 'success',
        familyId: user.familyId,
        actor: `parent:${user.id}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    },

    /**
     * Issue a read-only child-scoped JWT to the calling parent. Mutations on
     * child surfaces are rejected by the `child-readonly` block in the auth
     * plugin's preHandler.
     */
    async viewAsChild(
      parentId: string,
      familyId: string,
      childId: string,
      pin: string,
      ctx: AuthContext,
    ): Promise<IssuedTokens> {
      await this.verifyParentPin(parentId, pin, ctx);
      const tokens = await issueTokens({
        subjectKind: 'child',
        subjectId: childId,
        familyId,
        role: 'child-readonly',
        actorUserId: parentId,
        ctx,
      });
      await audit.write({
        kind: 'view_as_child',
        outcome: 'success',
        familyId,
        actor: `parent:${parentId}`,
        reason: childId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return tokens;
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
