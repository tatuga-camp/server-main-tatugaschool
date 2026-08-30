import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiService } from './ai.service';
import { SubjectQueryToolService } from './subject-query-tool';

@Global()
@Module({
  imports: [HttpModule],
  providers: [AiService, SubjectQueryToolService],
  exports: [AiService],
})
export class AiModule {}
