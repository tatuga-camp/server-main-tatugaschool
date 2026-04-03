import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(config: ConfigService) {
    // 1. Initialize the connection
    super(config.get('REDIS_URL'));
  }

  // Gracefully disconnect when the application shuts down
  onModuleDestroy() {
    this.disconnect();
  }
}
