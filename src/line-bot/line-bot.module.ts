import { Global, Module } from '@nestjs/common';
import { LineBotService } from './line-bot.service';

@Global()
@Module({
  providers: [LineBotService],
  exports: [LineBotService],
})
export class LineBotModule {}
