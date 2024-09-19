import { Module } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';
import { TeamRepository } from './team.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';

@Module({
  imports: [PrismaModule, UsersModule],
  providers: [TeamService, TeamRepository, UsersService],
  controllers: [TeamController],
})
export class TeamModule {}
