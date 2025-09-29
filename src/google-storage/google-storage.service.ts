import { Bucket, GetSignedUrlConfig, Storage } from '@google-cloud/storage';
import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from './../prisma/prisma.service';
import { MemberOnSchool, Student, User } from '@prisma/client';
import { InputDeleteFileOnStorage } from './interfaces';

@Injectable()
export class GoogleStorageService {
  private bucket: Bucket;
  private logger: Logger;
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    if (this.configService.get('NODE_ENV') !== 'test') {
      this.initializeCloudStorage();
    } else {
      console.log('Initial Google Stroage will not work under testing');
    }

    this.logger = new Logger(GoogleStorageService.name);
  }

  /**
   * Initializes cloud storage
   */
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
        ? ['*', 'http://localhost:8181']
        : [
            'https://tatugaschool.com',
            'https://www.tatugaschool.com',
            'https://app.tatugaschool.com',
            'https://student.tatugaschool.com',
          ];
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

  /**
   * Validates access
   * @param {
   *     user,
   *     schoolId,
   *   }
   * @returns access
   */
  async validateAccess({
    user,
    schoolId,
  }: {
    user: User;
    schoolId: string;
  }): Promise<MemberOnSchool> {
    try {
      const memberOnSchool = await this.prisma.memberOnSchool.findFirst({
        where: {
          userId: user.id,
          schoolId: schoolId,
        },
      });

      if (!memberOnSchool || memberOnSchool.status !== 'ACCEPT') {
        throw new ForbiddenException(
          'Access denied: User is not a member of the school',
        );
      }

      return memberOnSchool;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  /**
   * Gets sign url for client to upload
   * @param {
   *       fileName,
   *       fileType,
   *       userId,
   *       schoolId,
   *       fileSize,
   *     }
   * @param [user]
   * @param [student]
   * @returns
   */
  async GetSignURL(
    {
      fileName,
      fileType,
      userId,
      schoolId,
      fileSize,
    }: {
      fileName: string;
      fileSize: number;
      fileType: string;
      userId?: string;
      schoolId?: string;
    },
    user?: User,
    student?: Student,
    destination?: 'teaching_material',
  ) {
    try {
      const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB in bytes
      if (fileSize > MAX_FILE_SIZE) {
        throw new BadRequestException('File size cannot exceed 200 MB.');
      }

      if (schoolId && user) {
        const school = await this.prisma.school.findUnique({
          where: {
            id: schoolId,
          },
        });
        if (!school) {
          throw new NotFoundException('No School Found');
        }

        await this.validateAccess({
          user,
          schoolId: school.id,
        });

        if (school.totalStorage + fileSize > school.limitTotalStorage) {
          throw new BadRequestException(
            'You have exceeded size limit on the school please upgrade a plan',
          );
        }
      } else if (schoolId && student) {
        const school = await this.prisma.school.findUnique({
          where: {
            id: schoolId,
          },
        });

        if (!school) {
          throw new NotFoundException('No School Found');
        }

        if (school.id !== student.schoolId) {
          throw new ForbiddenException('Access Denied');
        }

        if (school.totalStorage + fileSize > school.limitTotalStorage) {
          throw new BadRequestException(
            'You have exceeded size limit on the school please upgrade a plan',
          );
        }
      }

      const bucket = this.getBucket();
      const options: GetSignedUrlConfig = {
        version: 'v4',
        action: 'write',
        expires: Date.now() + 10 * 60 * 1000,
        contentType: fileType,
      };
      const replacedString = fileName.replace(/ /g, '0');
      const id = crypto.randomBytes(12).toString('hex');
      const gcsFileName = schoolId
        ? `schoolId:${schoolId}/ID:${id}/${replacedString}`
        : `userId:${userId}/ID:${id}/${replacedString}`;
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

  /**
   * Generates a V4 signed URL for reading a file from GCS.
   * @param filePath The full path to the file in the bucket (e.g., "folder/subfolder/file.jpg").
   * @param durationInMinutes The duration for which the URL will be valid (default: 15 minutes).
   * @returns A promise that resolves to the signed URL string.
   */
  async generateV4ReadSignedUrl(
    filePath: string,
    durationInMinutes: number = 15,
  ): Promise<string> {
    if (!this.bucket) {
      this.logger.error(
        'Bucket not initialized. Call initializeCloudStorage first.',
      );
      throw new BadGatewayException(
        'Storage service not properly initialized.',
      );
    }

    const options: GetSignedUrlConfig = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + durationInMinutes * 60 * 1000, // 15 minutes by default
    };

    try {
      // Get a v4 signed URL for reading the file
      const [url] = await this.bucket.file(filePath).getSignedUrl(options);
      this.logger.log(`Generated V4 read signed URL for: ${filePath}`);
      return url;
    } catch (error) {
      this.logger.error(`Error generating signed URL for ${filePath}:`, error);
      throw new BadGatewayException('Could not generate file access URL.');
    }
  }

  /**
   * Uploads a file from the server to Google Cloud Storage.
   * @param filePath The desired path and filename in the GCS bucket (e.g., "uploads/my_document.pdf").
   * @param fileContent The file content as a Buffer
   * @param contentType The MIME type of the file (e.g., "application/pdf", "image/jpeg").
   * @returns A promise that resolves to the public URL of the uploaded file.
   */
  async uploadFile(
    filePath: string,
    fileContent: Buffer,
    contentType: string,
  ): Promise<string> {
    if (this.configService.get('NODE_ENV') === 'test') {
      this.logger.log('Skipping file upload in test environment.');
      // Return a dummy URL for testing purposes
      return `https://storage.googleapis.com/${this.configService.get(
        'GOOGLE_CLOUD_STORAGE_MEDIA_BUCKET',
      )}/${filePath}`;
    }

    if (!this.bucket) {
      this.logger.error(
        'Bucket not initialized. Call initializeCloudStorage first.',
      );
      throw new BadGatewayException(
        'Storage service not properly initialized.',
      );
    }

    const file = this.bucket.file(filePath);

    try {
      await file.save(fileContent, {
        metadata: {
          contentType: contentType,
        },
      });

      this.logger.log(
        `File uploaded successfully to gs://${this.bucket.name}/${filePath}`,
      );
      return `https://storage.googleapis.com/${this.configService.get(
        'GOOGLE_CLOUD_STORAGE_MEDIA_BUCKET',
      )}/${filePath}`;
    } catch (error) {
      this.logger.error(`Error uploading file to GCS: ${filePath}`, error);
      throw new BadGatewayException('Failed to upload file to storage.');
    }
  }

  /**
   * Deletes file on storage
   * @param input : InputDeleteFileOnStorage
   * @returns file on storage
   */
  async DeleteFileOnStorage(
    input: InputDeleteFileOnStorage,
  ): Promise<{ message: string }> {
    try {
      if (this.configService.get('NODE_ENV') === 'test') {
        this.logger.log('You are in test ENV no file is being deleted');
        return { message: 'URL file is not from google storage' };
      }
      if (!input.fileName.includes('storage.googleapis.com')) {
        return { message: 'URL file is not from google storage' };
      }

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
