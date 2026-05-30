abstract class InstancesError extends Error {
  abstract readonly kind: string;
  abstract readonly statusCode: number;
}

export class InstanceNotFoundError extends InstancesError {
  readonly kind = 'InstanceNotFound';
  readonly statusCode = 404;
}

export class InvalidTransitionError extends InstancesError {
  readonly kind = 'InvalidTransition';
  readonly statusCode = 409;
}
