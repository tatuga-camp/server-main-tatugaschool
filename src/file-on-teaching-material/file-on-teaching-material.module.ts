import { Module } from '@nestjs/common';
import { FileOnTeachingMaterialService } from './file-on-teaching-material.service';
import { FileOnTeachingMaterialController } from './file-on-teaching-material.controller';
import { TeachingMaterialService } from '../teaching-material/teaching-material.service';
import { ImageService } from '../image/image.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [
    FileOnTeachingMaterialService,
    TeachingMaterialService,
    ImageService,
  ],
  controllers: [FileOnTeachingMaterialController],
})
export class FileOnTeachingMaterialModule {}
