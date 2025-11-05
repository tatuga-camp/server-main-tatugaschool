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
import { PrismaService } from '../prisma/prisma.service';
import { MemberOnSchool, Student, User } from '@prisma/client';
import { InputDeleteFileOnStorage } from './interfaces';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private logger: Logger;
  private bucketName: string;
  private r2PublicDomain: string;
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.logger = new Logger(StorageService.name);

    if (this.configService.get('NODE_ENV') !== 'test') {
      this.initializeR2Storage();
    } else {
      console.log('Initial R2 Storage will not work under testing');
    }
  }

  /**
   * Initializes cloud storage
   */
  private initializeR2Storage() {
    try {
      const endpoint_api = this.configService.get('CLOUDFLARE_API_ENDPOINT');
      if (!endpoint_api) {
        throw new Error('CLOUDFLARE_API_ENDPOINT is not configured.');
      }

      const accessKeyId = this.configService.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get(
        'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
      );
      this.bucketName = this.configService.get('CLOUDFLARE_R2_MEDIA_BUCKET');
      this.r2PublicDomain = this.configService.get(
        'CLOUDFLARE_R2_PUBLIC_DOMAIN',
      );

      if (!accessKeyId || !secretAccessKey || !this.bucketName) {
        throw new Error(
          'R2 credentials or bucket name are not fully configured.',
        );
      }

      const s3Config: S3ClientConfig = {
        region: 'auto',
        endpoint: endpoint_api,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
      };

      this.s3Client = new S3Client(s3Config);
      this.logger.log('Cloudflare R2 storage initialized: ' + this.bucketName);

      // Note: CORS configuration for R2 is managed in the Cloudflare Dashboard,
      // not via the API like GCS.
    } catch (err) {
      console.error('Error initializing R2 storage:', err);
      throw new BadGatewayException(
        'Error initializing R2 storage:',
        err.message,
      );
    }
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
   * Gets a pre-signed URL for client-side uploads to R2.
   * @param {
   *fileName,
   *fileType,
   *userId,
   *schoolId,
   *fileSize,
   *}
   * @param [user]
   * @param [student]
   * @returns
   */
  async getUploadSignedUrl(
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
  ) {
    try {
      const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB in bytes
      if (fileSize > MAX_FILE_SIZE) {
        throw new BadRequestException('File size cannot exceed 200 MB.');
      }

      // --- Validation logic remains identical ---
      if (schoolId && user) {
        const school = await this.prisma.school.findUnique({
          where: { id: schoolId },
        });
        if (!school) {
          throw new NotFoundException('No School Found');
        }
        await this.validateAccess({ user, schoolId: school.id });
        if (school.totalStorage + fileSize > school.limitTotalStorage) {
          throw new BadRequestException(
            'You have exceeded size limit on the school please upgrade a plan',
          );
        }
      } else if (schoolId && student) {
        const school = await this.prisma.school.findUnique({
          where: { id: schoolId },
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
      // --- End of validation logic ---

      const replacedString = fileName.replace(/ /g, '0');
      const id = crypto.randomBytes(12).toString('hex');
      const r2FileName = schoolId
        ? `schoolId:${schoolId}/ID:${id}/${replacedString}`
        : `userId:${userId}/ID:${id}/${replacedString}`;

      // Create the command for a PutObject operation
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: r2FileName,
        ContentType: fileType,
        ContentLength: fileSize, // ContentLength is often useful for upload policies
      });

      // Generate the pre-signed URL
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: 60 * 10,
      }); // 10 minutes

      // Construct the public URL (assuming R2 bucket is public or you have a public domain)
      // If your bucket is not public, you might not need this.
      const originalURL = `https://${this.r2PublicDomain}/${r2FileName}`;

      return {
        signURL: url,
        originalURL: originalURL,
        contentType: fileType,
        fileName: replacedString,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  /**
   * Generates a pre-signed URL for reading a file from R2.
   * @param filePath The full path to the file in the bucket (e.g., "folder/subfolder/file.jpg").
   * @param durationInMinutes The duration for which the URL will be valid (default: 15 minutes).
   * @returns A promise that resolves to the signed URL string.
   */
  async getReadSignedUrl(
    filePath: string,
    durationInMinutes: number = 15,
  ): Promise<string> {
    if (!this.s3Client) {
      this.logger.error('R2 client not initialized.');
      throw new BadGatewayException(
        'Storage service not properly initialized.',
      );
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: durationInMinutes * 60,
      });
      this.logger.log(`Generated R2 read signed URL for: ${filePath}`);
      return url;
    } catch (error) {
      this.logger.error(`Error generating signed URL for ${filePath}:`, error);
      throw new BadGatewayException('Could not generate file access URL.');
    }
  }

  /**
   * Uploads a file from the server to R2.
   * @param filePath The desired path and filename in the R2 bucket (e.g., "uploads/my_document.pdf").
   * @param fileContent The file content as a Buffer.
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
      return `${this.r2PublicDomain}/${filePath}`;
    }

    if (!this.s3Client) {
      this.logger.error('R2 client not initialized.');
      throw new BadGatewayException(
        'Storage service not properly initialized.',
      );
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
      Body: fileContent,
      ContentType: contentType,
    });

    try {
      await this.s3Client.send(command);

      this.logger.log(
        `File uploaded successfully to R2: ${this.bucketName}/${filePath}`,
      );
      return `https://${this.r2PublicDomain}/${filePath}`;
    } catch (error) {
      this.logger.error(`Error uploading file to R2: ${filePath}`, error);
      throw new BadGatewayException('Failed to upload file to storage.');
    }
  }

  /**
   * Deletes a file from R2 storage.
   * @param input : InputDeleteFileOnStorage
   * @returns A promise resolving to a success message.
   */
  async DeleteFileOnStorage(
    input: InputDeleteFileOnStorage,
  ): Promise<{ message: string }> {
    try {
      if (this.configService.get('NODE_ENV') === 'test') {
        this.logger.log('You are in test ENV; no file is being deleted');
        return { message: 'URL file is not from R2 storage (test env)' };
      }
      const fullPublicUrlPrefix = `https://${this.r2PublicDomain}`;

      if (
        !this.r2PublicDomain ||
        !input.fileName.startsWith(fullPublicUrlPrefix)
      ) {
        this.logger.warn(
          `File ${input.fileName} is not from configured R2 domain.`,
        );
        return { message: 'URL file is not from R2 storage' };
      }

      // MODIFICATION: Extract key based on the new full prefix length
      const fileName = input.fileName.substring(fullPublicUrlPrefix.length + 1); // +1 for the '/'

      if (!fileName) {
        throw new BadRequestException('Could not extract file key from URL.');
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      await this.s3Client.send(command);
      this.logger.log(`R2 file deleted: ${this.bucketName}/${fileName}`);

      return { message: `file ${input.fileName} has been deleted` };
    } catch (error) {
      this.logger.error(
        `Failed to delete file ${input.fileName}: ${error.message}`,
      );
      // Don't throw an error if the file just wasn't found,
      // but do throw on other errors.
      if (error.name === 'NoSuchKey') {
        this.logger.error(`${input.fileName} : file not found in R2`);
        return { message: `file ${input.fileName} not found` };
      }
      throw error; // Re-throw other errors
    }
  }
}
