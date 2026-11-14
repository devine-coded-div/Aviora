/**
 * Console-compatible logger. In production it writes one JSON object per line (level, time,
 * msg, details) so a log platform can index it; in development it stays human-readable.
 * Never pass request headers, tokens, payment signatures or images to it.
 */
export type Logger = Pick<Console, 'info' | 'warn' | 'error'>

function detail(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...(value.cause !== undefined ? { cause: detail(value.cause) } : {}),
    }
  }
  return value
}

export function createLogger(
  format: 'json' | 'text',
  write: (line: string) => void = (line) => process.stdout.write(`${line}\n`),
): Logger {
  if (format === 'text') return console
  const emit =
    (level: 'info' | 'warn' | 'error') =>
    (msg?: unknown, ...rest: unknown[]) => {
      const entry: Record<string, unknown> = {
        level,
        time: new Date().toISOString(),
        msg: typeof msg === 'string' ? msg : String(msg),
      }
      // A single plain object is merged as fields; anything else is kept as `details`.
      const only = rest.length === 1 ? rest[0] : undefined
      if (only && typeof only === 'object' && !(only instanceof Error) && !Array.isArray(only)) {
        Object.assign(entry, only)
      } else if (rest.length > 0) {
        entry['details'] = rest.length === 1 ? detail(rest[0]) : rest.map(detail)
      }
      write(JSON.stringify(entry))
    }
  return { info: emit('info'), warn: emit('warn'), error: emit('error') }
}
