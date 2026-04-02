import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClient } from 'bun';

@Injectable()
export class RedisService extends RedisClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {
    // 1. Retrieve the Redis URL from your environment variables
    const redisUrl = configService.get<string>('REDIS_URL')
    
    // 2. Pass the URL to the underlying Bun RedisClient constructor
    super(redisUrl);
  }

  async onModuleInit() {
    try {
      // 3. Explicitly establish the connection when the module initializes
      await this.connect();
      this.logger.log('Successfully connected to Redis via Bun native client');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
    }
  }

  onModuleDestroy() {
    // 4. Clean up the connection when the NestJS application shuts down
    this.logger.log('Closing Redis connection');
    this.close();
  }
}