import build from 'pino-abstract-transport';

const LEVEL_LABELS: Record<number, string> = {
  10: 'TRACE',
  20: 'DEBUG',
  30: 'INFO ',
  40: 'WARN ',
  50: 'ERROR',
  60: 'FATAL',
};

const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  level: {
    10: '\x1b[90m',
    20: '\x1b[36m',
    30: '\x1b[32m',
    40: '\x1b[33m',
    50: '\x1b[31m',
    60: '\x1b[41;37m',
  } as Record<number, string>,
};

const KNOWN_KEYS = new Set([
  'level',
  'time',
  'pid',
  'hostname',
  'msg',
  'context',
  'req',
  'res',
  'responseTime',
  'err',
  'stack',
  'reqId',
  'v',
  'name',
]);

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

function formatTimestamp(epoch: number): string {
  const d = new Date(epoch);
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  );
}

interface LogObject {
  level: number;
  time: number;
  msg?: string;
  context?: string;
  responseTime?: number;
  err?: { message?: string; stack?: string; type?: string };
  [key: string]: unknown;
}

function formatLog(obj: LogObject, colorize: boolean): string {
  const level = obj.level ?? 30;
  const label = LEVEL_LABELS[level] ?? 'INFO ';
  const ts = formatTimestamp(obj.time ?? Date.now());
  const ctx = obj.context ?? 'App';
  let msg = obj.msg ?? '';

  if (obj.responseTime != null) {
    msg += ` (${Math.round(obj.responseTime)}ms)`;
  }

  let line: string;
  if (colorize) {
    const lc = C.level[level] ?? '';
    line =
      `${C.dim}[${ts}]${C.reset} ` +
      `${lc}${label}${C.reset} ` +
      `${C.cyan}[${ctx}]${C.reset} ${msg}`;
  } else {
    line = `[${ts}] ${label} [${ctx}] ${msg}`;
  }

  if (obj.err?.message) {
    const errType = obj.err.type ?? 'Error';
    line += `\n  ${errType}: ${obj.err.message}`;
    if (obj.err.stack) {
      const stackLines = obj.err.stack
        .split('\n')
        .slice(1)
        .map((l: string) => '  ' + l.trim())
        .join('\n');
      if (stackLines) line += '\n' + stackLines;
    }
  } else if (typeof obj.stack === 'string') {
    const stackLines = obj.stack
      .split('\n')
      .map((l: string) => '  ' + l)
      .join('\n');
    line += '\n' + stackLines;
  }

  const extraKeys = Object.keys(obj).filter((k) => !KNOWN_KEYS.has(k));
  for (const key of extraKeys) {
    const val = obj[key];
    const str = typeof val === 'string' ? val : JSON.stringify(val);
    line += `\n  ${key}: ${str}`;
  }

  return line;
}

export default function (opts: { colorize?: boolean }) {
  const useColor = opts.colorize ?? false;

  return build(async function (source) {
    for await (const obj of source) {
      const line = formatLog(obj as LogObject, useColor);
      process.stdout.write(line + '\n');
    }
  });
}
