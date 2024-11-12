import { Module } from '@nestjs/common';
import { AttendanceStatusListService } from './attendance-status-list.service';

@Module({
  providers: [AttendanceStatusListService]
})
export class AttendanceStatusListModule {}
