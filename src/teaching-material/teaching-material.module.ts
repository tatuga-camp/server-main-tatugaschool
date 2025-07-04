import { Module } from '@nestjs/common';
import { TeachingMaterialService } from './teaching-material.service';
import { TeachingMaterialController } from './teaching-material.controller';
import { FileOnTeachingMaterialService } from '../file-on-teaching-material/file-on-teaching-material.service';
import { ImageService } from '../image/image.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [
    TeachingMaterialService,
    FileOnTeachingMaterialService,
    ImageService,
  ],
  controllers: [TeachingMaterialController],
})
export class TeachingMaterialModule {}
