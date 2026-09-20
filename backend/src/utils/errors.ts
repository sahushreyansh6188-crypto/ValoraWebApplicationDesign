export type ErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'RESOURCE_CONFLICT'
  | 'VALIDATION_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_SERVER_ERROR';

export interface ErrorDetail {
  field?: string;
  message: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details: ErrorDetail[];

  constructor(statusCode: number, code: ErrorCode, message: string, details: ErrorDetail[] = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message: string, details: ErrorDetail[] = []): AppError {
    return new AppError(400, 'VALIDATION_FAILED', message, details);
  }

  static unauthorized(message: string = 'Authentication required'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static invalidCredentials(): AppError {
    return new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  static forbidden(message: string = 'You do not have permission to perform this action'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message: string = 'Resource not found'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string): AppError {
    return new AppError(409, 'RESOURCE_CONFLICT', message);
  }

  static unprocessable(message: string, details: ErrorDetail[] = []): AppError {
    return new AppError(422, 'VALIDATION_FAILED', message, details);
  }

  static rateLimited(): AppError {
    return new AppError(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests. Please try again later.');
  }

  static internal(message: string = 'An unexpected error occurred'): AppError {
    return new AppError(500, 'INTERNAL_SERVER_ERROR', message);
  }
}
