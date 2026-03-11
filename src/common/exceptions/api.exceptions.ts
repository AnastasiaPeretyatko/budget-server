import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiException extends HttpException {
  constructor(message: string, status: HttpStatus) {
    super(message, status);
  }

  static badRequest(message: string): ApiException {
    return new ApiException(message, HttpStatus.BAD_REQUEST);
  }

  static notAllowed(message: string): ApiException {
    return new ApiException(message, HttpStatus.FORBIDDEN);
  }

  static notFound(message: string): ApiException {
    return new ApiException(message, HttpStatus.NOT_FOUND);
  }

  static unautorized(message: string): ApiException {
    return new ApiException(message, HttpStatus.UNAUTHORIZED);
  }

  static serverError(message: string): ApiException {
    return new ApiException(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  static conflictError(message: string): ApiException {
    return new ApiException(message, HttpStatus.CONFLICT);
  }
}
