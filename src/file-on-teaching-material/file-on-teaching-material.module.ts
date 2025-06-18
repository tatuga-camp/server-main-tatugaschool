import { Module } from '@nestjs/common';
import { FileOnTeachingMaterialService } from './file-on-teaching-material.service';
import { FileOnTeachingMaterialController } from './file-on-teaching-material.controller';
import { TeachingMaterialService } from '../teaching-material/teaching-material.service';

@Module({
  providers: [FileOnTeachingMaterialService, TeachingMaterialService],
  controllers: [FileOnTeachingMaterialController],
})
export class FileOnTeachingMaterialModule {}
