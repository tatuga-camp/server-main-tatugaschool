import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { EmailService } from 'src/email/email.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserRepository, UserRepositoryType } from 'src/users/users.repository';
import { ImageService } from 'src/image/image.service';
import {
  ForgotPasswordDto,
  RefreshTokenDto,
  ResetPasswordDto,
  SignInDto,
  SignUpDto,
  VerifyEmailDto,
} from './dto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  logger: Logger;
  usersRepository: UserRepositoryType;
  constructor(
    private emailService: EmailService,
    private jwtService: JwtService,
    private base64ImageService: ImageService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.logger = new Logger(AuthService.name);
    this.usersRepository = new UserRepository(prisma);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    try {
      const user = await this.usersRepository.findByEmail({
        email: dto.email,
      });
      if (!user) {
        throw new NotFoundException('ไม่พบผู้ใช้งานนี้ในระบบ');
      }

      if (user.isDeleted) {
        throw new ForbiddenException(
          'บัญชีของคุณถูกปิดการใช้งาน โปรดติดต่อผู้ดูแลระบบ',
        );
      }

      if (!user.isVerifyEmail) {
        throw new ForbiddenException('กรุณายืนยันอีเมลก่อน');
      }

      if (user.resetPasswordToken) {
        throw new ConflictException('การรีเซ็ตรหัสผ่านของคุณได้ถูกส่งไปแล้ว');
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiration = new Date();
      expiration.setHours(expiration.getHours() + 1); // Token valid for 1 hour

      await this.usersRepository.updateResetToken({
        query: { email: dto.email },
        data: {
          resetPasswordToken: token,
          resetPasswordTokenExpiresAt: expiration.toISOString(),
        },
      });

      await this.sendResetEmail(dto.email, token);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async sendResetEmail(email: string, token: string): Promise<void> {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
      await this.emailService.sendMail(
        email,
        'Welcome to TATUGA SCHOOL',
        `You requested a password reset. Click here to reset your password: ${resetUrl}`,
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async signup(dto: SignUpDto): Promise<void> {
    try {
      const existingUser = await this.usersRepository.findByEmail({
        email: dto.email,
      });
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiration = new Date();
      expiration.setHours(expiration.getDate() + 1 * 30 * 12); // Token valid for 12 months

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const photo = this.base64ImageService.generateBase64Image(
        dto.email.charAt(0).toUpperCase(),
      );

      await this.usersRepository.createUser({
        ...dto,
        photo,
        verifyEmailToken: token,
        verifyEmailTokenExpiresAt: expiration.toISOString(),
        password: hashedPassword,
      });
      const resetUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;

      await this.emailService.sendMail(
        dto.email,
        'Welcome to TATUGA SCHOOL',
        `Hello ${dto.firstName},\n\nThank you for signing up! Click here to verify your e-mail: ${resetUrl}`,
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    try {
      const user = await this.usersRepository.findByVerifyToken({
        verifyEmailToken: dto.token,
      });
      if (!user) {
        throw new NotFoundException('ไม่พบผู้ใช้งานนี้ในระบบ');
      }

      if (user.verifyEmailTokenExpiresAt < new Date()) {
        throw new UnauthorizedException('Token expired');
      }

      await this.usersRepository.updateVerified({
        email: user.email,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    try {
      const user = await this.usersRepository.findByResetToken({
        resetPasswordToken: dto.token,
      });
      if (!user) {
        throw new NotFoundException('ไม่พบผู้ใช้งานนี้ในระบบ');
      }
      if (user.resetPasswordTokenExpiresAt < new Date()) {
        throw new UnauthorizedException('Token expired');
      }

      await this.usersRepository.updatePassword({
        email: user.email,
        password: await bcrypt.hash(dto.password, 10),
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async signIn(
    dto: SignInDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const user = await this.usersRepository.findByEmail({
        email: dto.email,
      });
      if (!user) {
        throw new NotFoundException('ไม่พบผู้ใช้งานนี้ในระบบ');
      }

      if (!user.isVerifyEmail) {
        throw new UnauthorizedException('ยังไม่ได้ยืนยันอีเมล');
      }

      const isMatch = await bcrypt.compare(dto.password, user.password);
      if (!isMatch) {
        throw new UnauthorizedException('รหัสผ่านไม่ถูกต้อง');
      }

      await this.usersRepository.updateLastActiveAt({
        email: user.email,
      });
      delete user.password;
      delete user.verifyEmailToken;
      delete user.verifyEmailTokenExpiresAt;
      delete user.resetPasswordToken;
      delete user.resetPasswordTokenExpiresAt;
      return {
        accessToken: await this.jwtService.signAsync(user),
        refreshToken: await this.jwtService.signAsync(user, {
          secret: this.config.get('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        }),
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async refreshToken(
    dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const verify = await this.jwtService.verifyAsync<User>(dto.refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersRepository.findByEmail({
        email: verify.email,
      });
      if (!user) {
        throw new BadRequestException('Refresh token is invalid');
      }
      delete user.password;
      delete user.verifyEmailToken;
      delete user.verifyEmailTokenExpiresAt;
      delete user.resetPasswordToken;
      delete user.resetPasswordTokenExpiresAt;
      return {
        accessToken: await this.jwtService.signAsync(user),
        refreshToken: await this.jwtService.signAsync(user, {
          secret: this.config.get('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        }),
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
