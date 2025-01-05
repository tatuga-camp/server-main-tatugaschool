import { Global, Module } from '@nestjs/common';
import { PushService } from './push.service';
import { PushController } from './push.controller';

@Global()
@Module({
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
