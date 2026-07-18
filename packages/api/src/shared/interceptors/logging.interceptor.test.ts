import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

function createContext(request: {
  method: string;
  originalUrl: string;
  body: unknown;
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ statusCode: 200 }),
    }),
  } as unknown as ExecutionContext;
}

function createHandler(responseBody: unknown): CallHandler {
  return { handle: () => of(responseBody) } as CallHandler;
}

describe('LoggingInterceptor', () => {
  it('logs the request body with long values redacted', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const interceptor = new LoggingInterceptor();

    const context = createContext({
      method: 'POST',
      originalUrl: '/api/v1/tenants',
      body: {
        name: 'Acme',
        apiKey: 'sk_1f71988715a3a164e1e9e928c11920023beb8a97bc1038',
      },
    });

    interceptor.intercept(context, createHandler({})).subscribe();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('--> POST /api/v1/tenants'),
    );
    const requestLog = logSpy.mock.calls[0][0] as string;
    expect(requestLog).not.toContain(
      'sk_1f71988715a3a164e1e9e928c11920023beb8a97bc1038',
    );
    expect(requestLog).toMatch(/\[Redacted \d+ chars long]/);

    logSpy.mockRestore();
  });

  it('logs the response body with long values redacted', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const interceptor = new LoggingInterceptor();

    const context = createContext({
      method: 'GET',
      originalUrl: '/api/v1/flags',
      body: {},
    });

    const responseBody = {
      data: [
        {
          key: 'new-checkout',
          createdBy: 'sk_1f71988715a3a164e1e9e928c11920023beb8a97bc1038',
        },
      ],
    };

    interceptor
      .intercept(context, createHandler(responseBody))
      .subscribe();

    expect(logSpy).toHaveBeenCalledTimes(2);
    const responseLog = logSpy.mock.calls[1][0] as string;
    expect(responseLog).toContain('<-- GET /api/v1/flags 200');
    expect(responseLog).toContain('new-ch******');
    expect(responseLog).not.toContain(
      'sk_1f71988715a3a164e1e9e928c11920023beb8a97bc1038',
    );

    logSpy.mockRestore();
  });
});
