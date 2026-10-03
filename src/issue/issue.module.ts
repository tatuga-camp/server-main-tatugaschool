import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../prisma/prisma.module';
import { IssueController } from './issue.controller';
import { IssueRepository } from './issue.repository';
import { IssueService } from './issue.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}),
    // Only the public report route uses ThrottlerGuard; nothing else in the
    // app is throttled. Fastify runs with trustProxy: true so the tracked IP
    // is the client's, not the load balancer's.
    ThrottlerModule.forRoot([{ name: 'issueReport', ttl: 60000, limit: 5 }]),
  ],
  controllers: [IssueController],
  providers: [IssueService, IssueRepository],
  exports: [IssueService],
})
export class IssueModule {}
