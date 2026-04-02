import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(config: ConfigService) {
    // 1. Initialize the connection
    super(config.get('REDIS_URL'));

    // 2. Attach listeners immediately so we don't miss the initial 'connect' event
    this.on('connect', () => {
      this.logger.log(
        `Successfully connected to Redis at ${this.options.host}:${this.options.port} (DB: ${this.options.db || 0})`,
      );
    });

    this.on('ready', () => {
      this.logger.log('Redis connection is ready to receive commands.');
    });

    this.on('error', (error: Error) => {
      this.logger.error(
        `Redis connection error: ${error.message}`,
        error.stack,
      );
    });

    this.on('reconnecting', () => {
      this.logger.warn('Redis is attempting to reconnect...');
    });

    this.on('close', () => {
      this.logger.warn('Redis connection has been closed.');
    });
  }

  // Gracefully disconnect when the application shuts down
  onModuleDestroy() {
    this.logger.log('Shutting down Redis connection...');
    this.disconnect();
  }
}
