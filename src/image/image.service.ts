import { Injectable, Logger } from '@nestjs/common';
import { encode } from 'blurhash';
import {
  Canvas,
  CanvasRenderingContext2D,
  createCanvas,
  loadImage,
} from 'canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

@Injectable()
export class ImageService {
  logger: Logger = new Logger(ImageService.name);
  private canvas: Canvas;
  private context: CanvasRenderingContext2D;

  constructor() {
    this.canvas = createCanvas(200, 200); // Set the dimensions as needed
    this.context = this.canvas.getContext('2d');
  }

  generateBase64Image(letter: string): string {
    try {
      if (!/^[A-Z]$/.test(letter)) {
        letter = 'A';
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

  /**
   * Generates a thumbnail (data URL) from the first page of a PDF.
   * @param pdfUrl The URL of the PDF file.
   * @param desiredWidth The desired width for the thumbnail image.
   * @returns A Promise that resolves to a data URL (string) of the generated thumbnail.
   * @throws {Error} If PDF loading or rendering fails.
   */

  async generatePdfThumbnail(
    pdfUrl: string,
    options?: {
      scale?: number;
      format?: 'jpeg';
      quality?: number; // For JPEG
    },
  ): Promise<Buffer> {
    try {
      const { quality = 80 } = options || {};

      // Fetch the PDF data from the URL
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch PDF from ${pdfUrl}: ${response.statusText}`,
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      const pdfDocument = await pdfjsLib.getDocument({ data: data }).promise;

      const page = await pdfDocument.getPage(1);
      // Render the page on a Node canvas with 100% scale.

      const canvasFactory = pdfDocument.canvasFactory as any;
      const viewport = page.getViewport({ scale: 1.0 });
      const canvasAndContext = canvasFactory.create(
        viewport.width,
        viewport.height,
      );
      const renderContext = {
        canvasContext: canvasAndContext.context,
        viewport,
      };

      const renderTask = page.render(renderContext);
      await renderTask.promise;
      // Convert the canvas to an image buffer.
      const image = canvasAndContext.canvas.toBuffer('image/png', {
        quality: quality / 100,
      });

      return image;
    } catch (error) {
      console.error('Error in generatePdfThumbnail:', error);
      throw error; // Re-throw the error so the calling component can handle it
    }
  }

  /**
   * Loads an image from a URL and encodes it to a blurhash string.
   * @param imageUrl URL of the image (can be local or external)
   * @returns The encoded blurhash string
   */
  async encodeImageToBlurhash(imageUrl: string): Promise<string> {
    const image = await loadImage(imageUrl);

    const canvas = createCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, image.width, image.height);

    const imageData = context.getImageData(0, 0, image.width, image.height);

    return encode(imageData.data, imageData.width, imageData.height, 4, 4);
  }
}
