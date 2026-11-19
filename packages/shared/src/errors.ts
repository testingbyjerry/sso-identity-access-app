export interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details?: ErrorDetail[],
    isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    if (
      typeof (
        Error as unknown as { captureStackTrace?: (target: object, constructor: unknown) => void }
      ).captureStackTrace === 'function'
    ) {
      (
        Error as unknown as { captureStackTrace: (target: object, constructor: unknown) => void }
      ).captureStackTrace(this, this.constructor);
    }
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', code = 'BAD_REQUEST', details?: ErrorDetail[]) {
    super(message, 400, code, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED', details?: ErrorDetail[]) {
    super(message, 401, code, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN', details?: ErrorDetail[]) {
    super(message, 403, code, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND', details?: ErrorDetail[]) {
    super(message, 404, code, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code = 'CONFLICT', details?: ErrorDetail[]) {
    super(message, 409, code, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: ErrorDetail[]) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details?: ErrorDetail[]) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details, false);
  }
}
