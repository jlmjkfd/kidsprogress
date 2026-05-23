/**
 * Auth-specific errors. The route layer maps each to an HTTP status.
 * Messages are intentionally generic so the API doesn't leak whether
 * an email exists or which credential was wrong.
 */

export class EmailAlreadyRegisteredError extends Error {
  readonly kind = 'EmailAlreadyRegistered';
  readonly status = 409;
}

export class InvalidCredentialsError extends Error {
  readonly kind = 'InvalidCredentials';
  readonly status = 401;
}

export class InvalidRefreshTokenError extends Error {
  readonly kind = 'InvalidRefreshToken';
  readonly status = 401;
}

export class PinNotSetError extends Error {
  readonly kind = 'PinNotSet';
  readonly status = 409;
}

export class InvalidPinError extends Error {
  readonly kind = 'InvalidPin';
  readonly status = 401;
}
