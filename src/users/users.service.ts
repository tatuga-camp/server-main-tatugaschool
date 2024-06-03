import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Provider, User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updateResetToken(
    email: string,
    token: string,
    expiration: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { email },
      data: {
        resetPasswordToken: token,
        resetPasswordTokenExpiresAt: expiration,
      },
    });
  }

  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    role?: string;
    provider?: Provider;
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
        role: UserRole.USER,
        photo: '',
        lastActiveAt: new Date(),
        provider: data.provider,
      },
    });
  }
}
