import type { Options as PinoHttpOptions } from 'pino-http';
import { join } from 'node:path';

const isDev = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

export const pinoHttpConfig: PinoHttpOptions = {
  level: isTest ? 'silent' : isDev ? 'debug' : 'info',

  // The pretty transport runs in a worker thread which conflicts with Jest's
  // teardown ("the worker has exited"), so it is disabled during tests.
  transport: isTest
    ? undefined
    : {
        target: join(__dirname, 'pino-transport'),
        options: { colorize: isDev },
      },

  autoLogging: {
    ignore: (req) => req.url === '/health',
  },

  serializers: {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    req: (req: any) => ({
      method: req.method as string,
      url: req.url as string,
    }),
    res: (res: any) => ({
      statusCode: res.statusCode as number,
    }),
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
  },

  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} → ${res.statusCode}`,

  customErrorMessage: (req, res) =>
    `${req.method} ${req.url} → ${res.statusCode}`,

  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },

  customProps: () => ({
    context: 'HTTP',
  }),
};
