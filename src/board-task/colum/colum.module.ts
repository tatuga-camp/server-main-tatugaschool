import { Module } from '@nestjs/common';
import { ColumService } from './colum.service';
import { ColumController } from './colum.controller';
import { UsersService } from '../../users/users.service';

@Module({
  providers: [ColumService, UsersService],
  controllers: [ColumController],
})
export class ColumModule {}
