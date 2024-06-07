import { Injectable, Logger } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './users.repository';
import { ImageService } from 'src/image/image.service';
import {
  CreateUserDto,
  FindByEmailDto,
  FindByResetTokenDto,
  FindByVerifyTokenDto,
  UpdateLastActiveAtDto,
  UpdatePasswordDto,
  UpdateResetTokenDto,
  UpdateVerifiedDto,
} from './dto/user.dto';

@Injectable()
export class UsersService {
  logger: Logger = new Logger(UsersService.name);
  constructor(
    private userRepository: UserRepository,
    private base64ImageService: ImageService,
  ) {}

  async findByEmail(email: FindByEmailDto['email']): Promise<User> {
    try {
      return this.userRepository.findByEmail(email);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateResetToken(
    email: UpdateResetTokenDto['email'],
    token: UpdateResetTokenDto['token'],
    expiration: UpdateResetTokenDto['expiration'],
  ): Promise<void> {
    try {
      await this.userRepository.updateResetToken(email, token, expiration);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createUser(
    data: CreateUserDto,
    token: CreateUserDto['token'],
    expiration: CreateUserDto['expiration'],
  ): Promise<User> {
    try {
      const hashedPassword = await bcrypt.hash(data.password, 10);

      const photo = this.base64ImageService.generateBase64Image(
        data.email.toUpperCase(),
      );
      return this.userRepository.createUser(
        data,
        photo,
        token,
        expiration,
        hashedPassword,
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findByVerifyToken(token: FindByVerifyTokenDto['token']): Promise<User> {
    try {
      return this.userRepository.findByVerifyToken(token);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async updateVerified(email: UpdateVerifiedDto['email']): Promise<void> {
    try {
      await this.userRepository.updateVerified(email);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async findByResetToken(token: FindByResetTokenDto['token']): Promise<User> {
    try {
      return this.userRepository.findByResetToken(token);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async updatePassword(
    email: UpdatePasswordDto['email'],
    password: UpdatePasswordDto['password'],
  ): Promise<void> {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      await this.userRepository.updatePassword(email, hashedPassword);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async updateLastActiveAt(
    email: UpdateLastActiveAtDto['email'],
  ): Promise<void> {
    await this.userRepository.updateLastActiveAt(email);
  }
}
