import { Global, Module } from '@nestjs/common';
import { GoogleStorageService } from './google-storage.service';
import { GoogleStorageController } from './google-storage.controller';

@Global()
@Module({
  providers: [GoogleStorageService],
  exports: [GoogleStorageService],
  controllers: [GoogleStorageController],
})
export class GoogleStorageModule {}
