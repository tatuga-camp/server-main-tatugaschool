import { Module } from '@nestjs/common';
import { WheelOfNameService } from './wheel-of-name.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [WheelOfNameService],
})
export class WheelOfNameModule {}
