import { LoggerService } from '@nestjs/common';
import type { FastifyBaseLogger } from 'fastify';

type PinoLevel = 'info' | 'warn' | 'debug' | 'trace' | 'error' | 'fatal';

export class PinoLoggerService implements LoggerService {
  constructor(private readonly pino: FastifyBaseLogger) {}

  log(message: any, context?: string): void {
    this.forward('info', { context }, message);
  }

  error(message: any, stackOrContext?: string, context?: string): void {
    if (message instanceof Error) {
      const resolvedContext =
        context ??
        (typeof stackOrContext === 'string' ? stackOrContext : undefined);
      this.forward(
        'error',
        { err: message, context: resolvedContext },
        message.message,
      );
      return;
    }
    this.forward('error', { context, stack: stackOrContext }, message);
  }

  warn(message: any, context?: string): void {
    this.forward('warn', { context }, message);
  }

  debug(message: any, context?: string): void {
    this.forward('debug', { context }, message);
  }

  verbose(message: any, context?: string): void {
    this.forward('trace', { context }, message);
  }

  fatal(message: any, context?: string): void {
    this.forward('fatal', { context }, message);
  }

  private forward(
    level: PinoLevel,
    merge: Record<string, unknown>,
    message: unknown,
  ): void {
    try {
      (this.pino[level] as (m: object, msg: unknown) => void)(merge, message);
    } catch (bridgeError) {
      const payload = {
        level,
        time: new Date().toISOString(),
        msg: message,
        ...merge,
        bridge_error:
          bridgeError instanceof Error
            ? bridgeError.message
            : String(bridgeError),
      };
      try {
        process.stdout.write(JSON.stringify(payload) + '\n');
      } catch {
        // Absolute last resort — swallow rather than crash the process.
      }
    }
  }
}
