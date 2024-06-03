import { ConflictException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import * as nodemailer from 'nodemailer';
import { jwtConstants } from './constants';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
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
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'your-email@gmail.com',
        pass: 'your-email-password',
      },
    });

    const resetUrl = `http://localhost:3000/auth/reset-password?token=${token}`;
    const mailOptions = {
      from: 'your-email@gmail.com',
      to: email,
      subject: 'Password Reset',
      text: `You requested a password reset. Click here to reset your password: ${resetUrl}`,
    };

    await transporter.sendMail(mailOptions);
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
    await this.usersService.createUser(data);

    const token = await this.jwtService.signAsync(data, {
      secret: jwtConstants.accessTokenSecret,
      expiresIn: '365d',
    });

    const resetUrl = `http://localhost:3000/auth/verify?token=${token}`;

    await this.emailService.sendMail(
      data.email,
      'Welcome to TATUGA SCHOOL',
      `Hello ${data.firstName},\n\nThank you for signing up! Click here to verify your e-mail: ${resetUrl}`,
    );
  }
}
