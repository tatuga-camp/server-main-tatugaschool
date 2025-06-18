import { Global, Module } from '@nestjs/common';
import { GoogleStorageController } from './google-storage.controller';
import { GoogleStorageService } from './google-storage.service';

@Global()
@Module({
  providers: [GoogleStorageService],
  exports: [GoogleStorageService],
  controllers: [GoogleStorageController],
})
export class GoogleStorageModule {}
