import {
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
import { jwtConstants } from './constants';
import { UserRepository } from 'src/users/users.repository';
import {
  ForgotPasswordDto,
  SignUpDto,
  VerifyEmailDto,
  ResetPasswordDto,
  SignInDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import { ImageService } from 'src/image/image.service';

@Injectable()
export class AuthService {
  logger: Logger;
  constructor(
    private usersRepository: UserRepository,
    private emailService: EmailService,
    private jwtService: JwtService,
    private base64ImageService: ImageService,
  ) {
    this.logger = new Logger(AuthService.name);
  }

  async forgotPassword(email: ForgotPasswordDto['email']): Promise<void> {
    try {
      const user = await this.usersRepository.findByEmail(email);
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

      await this.usersRepository.updateResetToken(email, token, expiration);

      await this.sendResetEmail(email, token);
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

  async signup(data: SignUpDto): Promise<void> {
    try {
      const existingUser = await this.usersRepository.findByEmail(data.email);
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiration = new Date();
      expiration.setHours(expiration.getDate() + 1 * 30 * 12); // Token valid for 12 months
      const hashedPassword = await bcrypt.hash(data.password, 10);

      const photo = this.base64ImageService.generateBase64Image(
        data.email.toUpperCase(),
      );

      await this.usersRepository.createUser(
        data,
        photo,
        token,
        expiration,
        hashedPassword,
      );
      const resetUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;

      await this.emailService.sendMail(
        data.email,
        'Welcome to TATUGA SCHOOL',
        `Hello ${data.firstName},\n\nThank you for signing up! Click here to verify your e-mail: ${resetUrl}`,
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async verifyEmail(token: VerifyEmailDto['token']): Promise<void> {
    try {
      const user = await this.usersRepository.findByVerifyToken(token);
      if (!user) {
        throw new NotFoundException('ไม่พบผู้ใช้งานนี้ในระบบ');
      }

      if (user.verifyEmailTokenExpiresAt < new Date()) {
        throw new UnauthorizedException('Token expired');
      }

      await this.usersRepository.updateVerified(user.email);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async resetPassword(
    token: ResetPasswordDto['token'],
    password: ResetPasswordDto['password'],
  ): Promise<void> {
    try {
      const user = await this.usersRepository.findByResetToken(token);
      if (!user) {
        throw new NotFoundException('ไม่พบผู้ใช้งานนี้ในระบบ');
      }

      if (user.verifyEmailTokenExpiresAt < new Date()) {
        throw new UnauthorizedException('Token expired');
      }

      await this.usersRepository.updatePassword(user.email, password);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async signIn(
    email: SignInDto['email'],
    password: SignInDto['password'],
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const user = await this.usersRepository.findByEmail(email);
      if (!user) {
        throw new NotFoundException('ไม่พบผู้ใช้งานนี้ในระบบ');
      }

      if (!user.isVerifyEmail) {
        throw new UnauthorizedException('ยังไม่ได้ยืนยันอีเมล');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new UnauthorizedException('รหัสผ่านไม่ถูกต้อง');
      }

      await this.usersRepository.updateLastActiveAt(user.email);
      delete user.password;
      delete user.verifyEmailToken;
      delete user.verifyEmailTokenExpiresAt;
      delete user.resetPasswordToken;
      delete user.resetPasswordTokenExpiresAt;
      return {
        accessToken: await this.jwtService.signAsync(user),
        refreshToken: await this.jwtService.signAsync(user, {
          secret: jwtConstants.refreshTokenSecret,
          expiresIn: '7d',
        }),
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async refreshToken(
    refreshToken: RefreshTokenDto['refreshToken'],
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const verify = await this.jwtService.verifyAsync(refreshToken, {
        secret: jwtConstants.refreshTokenSecret,
      });

      const user = await this.usersRepository.findByEmail(verify.email);

      delete user.password;
      delete user.verifyEmailToken;
      delete user.verifyEmailTokenExpiresAt;
      delete user.resetPasswordToken;
      delete user.resetPasswordTokenExpiresAt;
      return {
        accessToken: await this.jwtService.signAsync(user),
        refreshToken: await this.jwtService.signAsync(user, {
          secret: jwtConstants.refreshTokenSecret,
          expiresIn: '7d',
        }),
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
