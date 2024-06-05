import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Provider, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './users.repository';

interface CreateUserModel {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role?: string;
  provider?: Provider;
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private userRepository: UserRepository,
  ) {}

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findByEmail(email);
  }

  async updateResetToken(
    email: string,
    token: string,
    expiration: Date,
  ): Promise<void> {
    await this.userRepository.updateResetToken(email, token, expiration);
  }

  async createUser(
    data: CreateUserModel,
    token: string,
    expiration: Date,
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.userRepository.createUser(
      data,
      token,
      expiration,
      hashedPassword,
    );
  }
  async findByVerifyToken(token: string): Promise<User> {
    return this.userRepository.findByVerifyToken(token);
  }
  async updateVerified(email: string): Promise<void> {
    await this.userRepository.updateVerified(email);
  }
  async findByResetToken(token: string): Promise<User> {
    return this.userRepository.findByResetToken(token);
  }
  async updatePassword(email: string, password: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(password, 10);
    await this.userRepository.updatePassword(email, hashedPassword);
  }
  async updateLastActiveAt(email: string): Promise<void> {
    await this.userRepository.updateLastActiveAt(email);
  }
}
