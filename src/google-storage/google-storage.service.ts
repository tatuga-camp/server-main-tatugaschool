import {
  Injectable,
  Inject,
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import { Storage, Bucket, GetSignedUrlConfig } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { InputDeleteFileOnStorage } from './interfaces';

@Injectable()
export class GoogleStorageService {
  private bucket: Bucket;
  logger: Logger;
  constructor(
    private configService: ConfigService,
    private config: ConfigService,
  ) {
    this.initializeCloudStorage();
    this.logger = new Logger();
  }

  private async initializeCloudStorage() {
    try {
      const encode = atob(
        this.configService.get('GOOGLE_CLOUD_PRIVATE_KEY_ENCODE'),
      );
      const storage = new Storage({
        projectId: this.configService.get('GOOGLE_CLOUD_PROJECT_ID'),
        credentials: {
          type: 'service_account',
          private_key: encode,
          client_email: this.configService.get('GOOGLE_CLOUD_CLIENT_EMAIL'),
          client_id: this.configService.get('GOOGLE_CLOUD_CLIENT_ID'),
        },
      });
      this.bucket = storage.bucket(
        this.configService.get('GOOGLE_CLOUD_STORAGE_MEDIA_BUCKET'),
      );
      const isDevelopment = process.env.DEV_ORIGIN === 'development';
      // Determine the allowed origins
      const allowedOrigins = isDevelopment
        ? ['*']
        : ['https://tatuga-school.com', 'https://www.tatuga-school.com'];
      const corsConfiguration = [
        {
          maxAgeSeconds: 3600,
          method: ['PUT'],
          origin: allowedOrigins,
          responseHeader: ['content-type'],
        },
      ];

      await this.setCorsConfiguration(corsConfiguration);
    } catch (err) {
      console.error('Error initializing cloud storage:', err.message);
      throw new BadGatewayException(
        'Error initializing cloud storage:',
        err.message,
      );
    }
  }

  private async setCorsConfiguration(corsConfiguration: any) {
    return new Promise<void>((resolve, reject) => {
      this.bucket.setCorsConfiguration(
        corsConfiguration,
        (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });
  }

  getBucket(): Bucket {
    return this.bucket;
  }

  async GetSignURL({
    fileName,
    fileType,
    userId,
  }: {
    fileName: string;
    fileType: string;
    userId: string;
  }) {
    try {
      const bucket = this.getBucket();
      const options: GetSignedUrlConfig = {
        version: 'v4',
        action: 'write',
        expires: Date.now() + 10 * 60 * 1000,
        contentType: fileType,
      };
      const replacedString = fileName.replace(/ /g, '0');
      const id = crypto.randomBytes(12).toString('hex');
      const gcsFileName = `userId:${userId}/ID:${id}/${replacedString}`;
      const blob = bucket.file(gcsFileName);
      const urlPicture = `https://storage.googleapis.com/${this.config.get(
        'GOOGLE_CLOUD_STORAGE_MEDIA_BUCKET',
      )}/${gcsFileName}`;
      const [url] = await blob.getSignedUrl(options);
      return {
        signURL: url,
        originalURL: urlPicture,
        contentType: fileType,
        fileName: replacedString,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async UploadFileGoogleStroage(input: {
    userId: string;
    fileName: string;
    cryptoId: string;
    file: Express.Multer.File;
  }): Promise<string> {
    try {
      const bucket = this.getBucket();
      const gcsFileName = `userId:${input.userId}/ID:${input.cryptoId}/${input.fileName}`;
      const blob = bucket.file(gcsFileName);
      const blobStream = blob.createWriteStream();
      blobStream.on('finish', async () => {});
      blobStream.end(input.file.buffer);
      return `https://storage.googleapis.com/${this.config.get(
        'STORAGE_MEDIA_BUCKET',
      )}/${gcsFileName}`;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async DeleteFileOnStorage(
    input: InputDeleteFileOnStorage,
  ): Promise<{ message: string }> {
    try {
      const bucket = this.getBucket();
      const parts = input.fileName.split('/');
      const fileName = parts.slice(4).join('/');
      bucket
        .file(fileName)
        .delete()
        .then(() => {
          this.logger.log(`gs://${bucket.name}/${fileName} deleted.`);
        })
        .catch((err) => {
          this.logger.error(err.message);
          this.logger.error(`${input.fileName} : file not fond`);
        });

      return { message: `file ${input.fileName} has been deleted` };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}