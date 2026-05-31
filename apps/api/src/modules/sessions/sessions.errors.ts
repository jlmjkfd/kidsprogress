abstract class SessionsError extends Error {
  abstract readonly kind: string;
  abstract readonly statusCode: number;
}

export class SessionInstanceNotFoundError extends SessionsError {
  readonly kind = 'SessionInstanceNotFound';
  readonly statusCode = 404;
}

export class PluginVersionMismatchError extends SessionsError {
  readonly kind = 'PluginVersionMismatch';
  readonly statusCode = 409;
}
