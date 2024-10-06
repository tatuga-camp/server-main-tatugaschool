import { Module } from '@nestjs/common';
import { CareerService } from './career.service';
import { CareerController } from './career.controller';

@Module({
  providers: [CareerService],
  controllers: [CareerController]
})
export class CareerModule {}
