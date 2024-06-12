import { Module } from '@nestjs/common';
import { AttendanceTableService } from './attendance-table.service';
import { AttendanceTableController } from './attendance-table.controller';

@Module({
  providers: [AttendanceTableService],
  controllers: [AttendanceTableController]
})
export class AttendanceTableModule {}
