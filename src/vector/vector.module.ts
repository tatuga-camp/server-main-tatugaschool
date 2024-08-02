import { Global, Module } from '@nestjs/common';
import { VectorService } from './vector.service';
import { HttpModule } from '@nestjs/axios';

@Global()
@Module({
  imports: [HttpModule],
  providers: [VectorService],
  exports: [VectorService],
})
export class VectorModule {}
