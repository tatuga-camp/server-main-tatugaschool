import { Express } from 'express';
import {
  Injectable,
  Inject,
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import { Storage, Bucket, GetSignedUrlConfig } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
// This is a hack to make Multer available in the Express namespace
import { InputDeleteFileOnStorage } from './interfaces';

@Injectable()
export class GoogleStorageService {
  private bucket: Bucket;
  logger: Logger;
  constructor(private configService: ConfigService) {
    const isTest = process.env.NODE_ENV === 'test';
    if (isTest == false) {
      this.initializeCloudStorage();
    }
    this.logger = new Logger(GoogleStorageService.name);
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
      const isDevelopment = process.env.NODE_ENV !== 'production';
      // Determine the allowed origins
      const allowedOrigins = isDevelopment
        ? ['*', 'http://localhost:8081']
        : ['https://tatugaschool.com', 'https://www.tatugaschool.com'];
      const corsConfiguration = [
        {
          maxAgeSeconds: 3600,
          responseHeader: ['Content-Type'],
          method: ['GET', 'PUT'],
          origin: allowedOrigins,
        },
      ];

      await this.setCorsConfiguration(corsConfiguration);
      this.logger.log('Cloud storage initialized: ' + this.bucket.name);
    } catch (err) {
      console.error('Error initializing cloud storage:', err);
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
    studentId,
  }: {
    fileName: string;
    fileType: string;
    userId?: string;
    studentId?: string;
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
      const gcsFileName = userId
        ? `userId:${userId}/ID:${id}/${replacedString}`
        : `studentId:${studentId}/ID:${id}/${replacedString}`;
      const blob = bucket.file(gcsFileName);
      const urlPicture = `https://storage.googleapis.com/${this.configService.get(
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
      return `https://storage.googleapis.com/${this.configService.get(
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
