abstract class DevicesError extends Error {
  abstract readonly kind: string;
  abstract readonly statusCode: number;
}

export class DeviceNotFoundError extends DevicesError {
  readonly kind = 'DeviceNotFound';
  readonly statusCode = 404;
}

export class DeviceRevokedError extends DevicesError {
  readonly kind = 'DeviceRevoked';
  readonly statusCode = 410;
}

export class ChildNotAttachedError extends DevicesError {
  readonly kind = 'ChildNotAttachedToDevice';
  readonly statusCode = 403;
}

export class InvalidDeviceTokenError extends DevicesError {
  readonly kind = 'InvalidDeviceToken';
  readonly statusCode = 401;
}
