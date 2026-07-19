import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { redactDeep } from './redact';

/** Logs every request's and response's body, with long/sensitive string values masked (see `redact.ts`). */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = request;
    const body: unknown = request.body;
    const startedAt = Date.now();

    this.logger.log(
      `--> ${method} ${originalUrl} | body: ${JSON.stringify(redactDeep(body))}`,
    );

    return next.handle().pipe(
      tap((responseBody: unknown) => {
        const response = context.switchToHttp().getResponse<Response>();
        const durationMs = Date.now() - startedAt;

        this.logger.log(
          `<-- ${method} ${originalUrl} ${response.statusCode} +${durationMs}ms | body: ${JSON.stringify(redactDeep(responseBody))}`,
        );
      }),
    );
  }
}
