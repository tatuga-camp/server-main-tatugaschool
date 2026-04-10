import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaReadService } from './prisma-read.service';

@Global()
@Module({
  providers: [PrismaService, PrismaReadService],
  exports: [PrismaService, PrismaReadService],
})
export class PrismaModule {}
