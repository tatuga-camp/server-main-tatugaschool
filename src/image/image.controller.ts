import { Controller, Get, Query, Res } from '@nestjs/common';
import { ImageService } from './image.service';
import { Response } from 'express';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('image')
export class ImageController {
  constructor(private readonly base64ImageService: ImageService) {}

  @Public()
  @Get()
  generateImage(@Query('letter') letter: string, @Res() res: Response): void {
    try {
      const base64Image = this.base64ImageService.generateBase64Image(
        letter.toUpperCase(),
      );
      res.send({ image: base64Image });
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
}
