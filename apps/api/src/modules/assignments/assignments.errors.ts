abstract class AssignmentsError extends Error {
  abstract readonly kind: string;
  abstract readonly statusCode: number;
}

export class AssignmentNotFoundError extends AssignmentsError {
  readonly kind = 'AssignmentNotFound';
  readonly statusCode = 404;
}

export class InvalidAssignmentTargetError extends AssignmentsError {
  readonly kind = 'InvalidAssignmentTarget';
  readonly statusCode = 400;
}
