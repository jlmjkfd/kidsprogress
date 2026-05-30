/**
 * Auth-specific errors. The route layer maps each to an HTTP status.
 * Messages are intentionally generic so the API doesn't leak whether
 * an email exists or which credential was wrong.
 */

abstract class AuthError extends Error {
  abstract readonly kind: string;
  abstract readonly statusCode: number;
}

export class EmailAlreadyRegisteredError extends AuthError {
  readonly kind = 'EmailAlreadyRegistered';
  readonly statusCode = 409;
}

export class InvalidCredentialsError extends AuthError {
  readonly kind = 'InvalidCredentials';
  readonly statusCode = 401;
}

export class InvalidRefreshTokenError extends AuthError {
  readonly kind = 'InvalidRefreshToken';
  readonly statusCode = 401;
}

export class PinNotSetError extends AuthError {
  readonly kind = 'PinNotSet';
  readonly statusCode = 409;
}

export class InvalidPinError extends AuthError {
  readonly kind = 'InvalidPin';
  readonly statusCode = 401;
}
