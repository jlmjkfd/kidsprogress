/**
 * Children-module errors. Messages are deliberately generic so the API
 * doesn't leak whether a child exists, whether a PIN is set, or how many
 * attempts remain.
 */
abstract class ChildrenError extends Error {
  abstract readonly kind: string;
  abstract readonly statusCode: number;
}

export class ChildNotFoundError extends ChildrenError {
  readonly kind = 'ChildNotFound';
  readonly statusCode = 404;
}

export class ChildLockedError extends ChildrenError {
  readonly kind = 'ChildLocked';
  readonly statusCode = 423;
  /** Seconds until the lockout clears. Surfaced so the UI can render a countdown. */
  constructor(
    message: string,
    public readonly retryAfterSeconds: number,
  ) {
    super(message);
  }
}

export class InvalidChildPinError extends ChildrenError {
  readonly kind = 'InvalidChildPin';
  readonly statusCode = 401;
}

export class ChildPinNotSetError extends ChildrenError {
  readonly kind = 'ChildPinNotSet';
  readonly statusCode = 409;
}

export class InvalidPinResetCodeError extends ChildrenError {
  readonly kind = 'InvalidPinResetCode';
  readonly statusCode = 401;
}
