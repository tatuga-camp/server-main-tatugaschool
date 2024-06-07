import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { createCanvas } from 'canvas';

@Injectable()
export class ImageService {
  logger: Logger = new Logger(ImageService.name);
  private canvas: any;
  private context: any;

  constructor() {
    this.canvas = createCanvas(200, 200); // Set the dimensions as needed
    this.context = this.canvas.getContext('2d');
  }

  generateBase64Image(letter: string): string {
    try {
      if (!/^[A-Z]$/.test(letter)) {
        throw new ForbiddenException('กรุณาใส่ตัวอักษรภาษาอังกฤษเท่านั้น');
      }

      // Set background color
      this.context.fillStyle = '#FFFFFF'; // White background
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Set text style
      this.context.fillStyle = '#000000'; // Black text
      this.context.font = 'bold 150px Arial';
      this.context.textAlign = 'center';
      this.context.textBaseline = 'middle';

      // Draw the letter
      this.context.fillText(
        letter,
        this.canvas.width / 2,
        this.canvas.height / 2,
      );

      // Get Base64 string
      return this.canvas.toDataURL();
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
