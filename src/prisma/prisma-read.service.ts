import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaReadService extends PrismaClient implements OnModuleInit {
  private logger: Logger = new Logger(PrismaReadService.name);

  constructor(config: ConfigService) {
    super({
      datasources: {
        db: {
          url: config.get('DATABASE_URL_READ'),
        },
      },
    });
  }

  async onModuleInit() {
    this.logger.log('Initializing Prisma Read Client');
    await this.$connect();
  }
}
