import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export type PushRepositoryType = {
  subscribe(request: any): Promise<any>;
};

@Injectable()
export class PushRepository implements PushRepositoryType {
  private logger: Logger;
  constructor(private prisma: PrismaService) {
    this.logger = new Logger(PushRepository.name);
  }

  async subscribe(request: any): Promise<any> {
    try {
      return await this.prisma.subscription.create({
        data: {
          ...request,
        },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }
}
