type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

type LogPayload = unknown;

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m', // gray
  info: '\x1b[36m', // cyan
  success: '\x1b[32m', // green
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
};

const LABELS: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO',
  success: 'OK',
  warn: 'WARN',
  error: 'ERROR',
};

function formatTag(tag: string) {
  return `${BOLD}${DIM}[${tag}]${RESET}`;
}

function formatLevel(level: LogLevel) {
  return `${BOLD}${COLORS[level]}${LABELS[level]}${RESET}`;
}

function write(level: LogLevel, tag: string, message: string, payload?: LogPayload) {
  if (!__DEV__) return;

  const prefix = `${formatTag(tag)} ${formatLevel(level)} ${COLORS[level]}${message}${RESET}`;
  const args = payload === undefined ? [prefix] : [prefix, payload];

  switch (level) {
    case 'warn':
      console.warn(...args);
      break;
    case 'error':
      console.error(...args);
      break;
    default:
      console.log(...args);
      break;
  }
}

export type Logger = {
  debug: (message: string, payload?: LogPayload) => void;
  info: (message: string, payload?: LogPayload) => void;
  success: (message: string, payload?: LogPayload) => void;
  warn: (message: string, payload?: LogPayload) => void;
  error: (message: string, payload?: LogPayload) => void;
};

/** Dev-only colored logger. Silent in production builds. */
export function createLogger(tag: string): Logger {
  return {
    debug: (message, payload) => write('debug', tag, message, payload),
    info: (message, payload) => write('info', tag, message, payload),
    success: (message, payload) => write('success', tag, message, payload),
    warn: (message, payload) => write('warn', tag, message, payload),
    error: (message, payload) => write('error', tag, message, payload),
  };
}

/** Default app logger. */
export const logger = createLogger('Fluent');
