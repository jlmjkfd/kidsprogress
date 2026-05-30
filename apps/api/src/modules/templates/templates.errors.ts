abstract class TemplatesError extends Error {
  abstract readonly kind: string;
  abstract readonly statusCode: number;
}

export class TemplateNotFoundError extends TemplatesError {
  readonly kind = 'TemplateNotFound';
  readonly statusCode = 404;
}

export class UnknownHandlerError extends TemplatesError {
  readonly kind = 'UnknownHandler';
  readonly statusCode = 400;
}

export class InvalidConfigError extends TemplatesError {
  readonly kind = 'InvalidConfig';
  readonly statusCode = 400;
  constructor(
    message: string,
    public readonly issues: ReadonlyArray<{ path: string; message: string }>,
  ) {
    super(message);
  }
}
