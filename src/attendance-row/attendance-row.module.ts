import { Module } from '@nestjs/common';
import { AttendanceRowService } from './attendance-row.service';
import { AttendanceRowController } from './attendance-row.controller';

@Module({
  providers: [AttendanceRowService],
  controllers: [AttendanceRowController]
})
export class AttendanceRowModule {}
