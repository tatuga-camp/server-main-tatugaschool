import { Global, Module } from '@nestjs/common';
import { GoogleStorageService } from './google-storage.service';
import { GoogleStorageController } from './google-storage.controller';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { SchoolRepository } from '../school/school.repository';

@Global()
@Module({
  providers: [GoogleStorageService],
  exports: [GoogleStorageService],
  controllers: [GoogleStorageController],
})
export class GoogleStorageModule {}
