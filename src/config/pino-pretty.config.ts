import type { Options as PinoHttpOptions } from 'pino-http';

const isDev = process.env.NODE_ENV !== 'production';

const devTransport = {
  target: 'pino-pretty',
  options: {
    singleLine: true,
    colorize: true,
    levelFirst: true,
    ignore: 'pid,hostname',
    translateTime: 'SYS:HH:MM:ss.l',
    messageFormat: '[{context}] {msg}',
    customColors:
      'fatal:bgRed,error:red,warn:yellow,info:green,debug:blue,trace:gray',
  },
};

export const pinoHttpConfig: PinoHttpOptions = {
  level: isDev ? 'debug' : 'info',
  transport: isDev ? devTransport : undefined,

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

  customProps: (req) => ({
    context: getControllerName(req),
  }),
};

function getControllerName(req: { url?: string; routerPath?: string }): string {
  const url = req.url || req.routerPath || '';
  const pathMatch = url.match(/^\/([^/?]+)/);
  if (!pathMatch) return 'HTTP';

  return (
    pathMatch[1]
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('') + 'Controller'
  );
}
