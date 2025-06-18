import { Module } from '@nestjs/common';
import { TeachingMaterialService } from './teaching-material.service';
import { TeachingMaterialController } from './teaching-material.controller';
import { FileOnTeachingMaterialService } from '../file-on-teaching-material/file-on-teaching-material.service';

@Module({
  providers: [TeachingMaterialService, FileOnTeachingMaterialService],
  controllers: [TeachingMaterialController],
})
export class TeachingMaterialModule {}
