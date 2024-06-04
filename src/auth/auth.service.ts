import { ConflictException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as crypto from 'crypto';
import { EmailService } from 'src/email/email.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from './constants';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private emailService: EmailService,
    private jwtService: JwtService,
  ) {}

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1); // Token valid for 1 hour

    await this.usersService.updateResetToken(email, token, expiration);

    await this.sendResetEmail(email, token);
  }

  private async sendResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
    await this.emailService.sendMail(
      email,
      'Welcome to TATUGA SCHOOL',
      `You requested a password reset. Click here to reset your password: ${resetUrl}`,
    );
  }

  async signup(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<void> {
    const existingUser = await this.usersService.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiration = new Date();
    expiration.setHours(expiration.getDate() + 1 * 30 * 12); // Token valid for 12 months
    await this.usersService.createUser(data, token, expiration);
    const resetUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;

    await this.emailService.sendMail(
      data.email,
      'Welcome to TATUGA SCHOOL',
      `Hello ${data.firstName},\n\nThank you for signing up! Click here to verify your e-mail: ${resetUrl}`,
    );
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.usersService.findByVerifyToken(token);
    if (!user) {
      throw new Error('Invalid token');
    }

    if (user.verifyEmailTokenExpiresAt < new Date()) {
      throw new Error('Token expired');
    }

    await this.usersService.updateVerified(user.email);
  }
  async resetPassword(token: string, password: string): Promise<void> {
    const user = await this.usersService.findByResetToken(token);
    if (!user) {
      throw new Error('Invalid token');
    }

    if (user.verifyEmailTokenExpiresAt < new Date()) {
      throw new Error('Token expired');
    }

    await this.usersService.updatePassword(user.email, password);
  }

  async signIn(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isVerifyEmail) {
      throw new Error('User not verified');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid password');
    }

    await this.usersService.updateLastActiveAt(user.email);
    return {
      accessToken: await this.jwtService.signAsync(user),
      refreshToken: await this.jwtService.signAsync(user, {
        secret: jwtConstants.refreshTokenSecret,
        expiresIn: '7d',
      }),
    };
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const verify = await this.jwtService.verifyAsync(refreshToken, {
      secret: jwtConstants.refreshTokenSecret,
    });

    const user = await this.usersService.findByEmail(verify.email);

    return {
      accessToken: await this.jwtService.signAsync(user),
      refreshToken: await this.jwtService.signAsync(user, {
        secret: jwtConstants.refreshTokenSecret,
        expiresIn: '7d',
      }),
    };
  }
}
