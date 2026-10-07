import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

// Коды ошибок PostgreSQL, которые понятны пользователю
const PG_INVALID_TEXT_REPRESENTATION = '22P02'; // например, "" вместо uuid
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_NOT_NULL_VIOLATION = '23502';

@Catch(QueryFailedError)
export class QueryFailedFilter implements ExceptionFilter {
  private readonly logger = new Logger(QueryFailedFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const code = (exception.driverError as { code?: string } | undefined)?.code;

    // Полный текст ошибки пишем только в лог, клиенту отдаём короткое объяснение
    this.logger.error(exception.message, exception.stack);

    const { status, message } = this.toHttpError(code);

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status],
    });
  }

  private toHttpError(code?: string): { status: HttpStatus; message: string } {
    switch (code) {
      case PG_INVALID_TEXT_REPRESENTATION:
        return {
          status: HttpStatus.BAD_REQUEST,
          message:
            'Некорректное значение в одном из полей (например, пустой id вместо счёта или категории)',
        };
      case PG_FOREIGN_KEY_VIOLATION:
        return {
          status: HttpStatus.BAD_REQUEST,
          message:
            'Указанная связанная запись (счёт, категория и т.п.) не найдена',
        };
      case PG_NOT_NULL_VIOLATION:
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Не заполнено обязательное поле',
        };
      case PG_UNIQUE_VIOLATION:
        return {
          status: HttpStatus.CONFLICT,
          message: 'Такая запись уже существует',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Внутренняя ошибка сервера',
        };
    }
  }
}
