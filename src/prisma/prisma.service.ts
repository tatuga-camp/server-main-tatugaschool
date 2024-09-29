import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private logger: Logger = new Logger(PrismaService.name);
  async onModuleInit() {
    this.logger.log('Initializing Prisma Client');
    await this.$connect();
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting Prisma Client');
    await this.$disconnect();
  }
}
