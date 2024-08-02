import { StudentRepository } from './../student/student.repository';
import {
  BadGatewayException,
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
  StudentSignInDto,
  VerifyEmailDto,
} from './dto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Student, User } from '@prisma/client';
import { Auth, google, GoogleApis } from 'googleapis';

@Injectable()
export class AuthService {
  logger: Logger;
  usersRepository: UserRepositoryType;
  studentRepository: StudentRepository;
  oauth2Client: Auth.GoogleAuth;
  constructor(
    private emailService: EmailService,
    private jwtService: JwtService,
    private base64ImageService: ImageService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.initializeGoogleAuth();
    this.logger = new Logger(AuthService.name);
    this.usersRepository = new UserRepository(prisma);
    this.studentRepository = new StudentRepository(prisma);
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
      const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password?token=${token}`;
      await this.emailService.sendMail({
        to: email,
        subject: 'Reset your password',
        html: `You requested a password reset. Click here to reset your password: ${resetUrl}`,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async signup(dto: SignUpDto): Promise<User> {
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

      const user = await this.usersRepository.createUser({
        ...dto,
        photo,
        verifyEmailToken: token,
        verifyEmailTokenExpiresAt: expiration.toISOString(),
        password: hashedPassword,
      });
      const resetUrl = `${process.env.CLIENT_URL}/auth/verify-email?token=${token}`;

      this.emailService.sendMail({
        to: dto.email,
        subject: 'Welcome to TATUGA SCHOOL',
        html: `Hello ${dto.firstName},\n\nThank you for signing up! Click here to verify your e-mail: ${resetUrl}`,
      });
      return user;
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
      delete user.photo;
      return {
        accessToken: await this.jwtService.signAsync(user, {
          secret: this.config.get('JWT_ACCESS_SECRET'),
          expiresIn: '15m',
        }),
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

  async studentSignIn(dto: StudentSignInDto) {
    try {
      const student = await this.studentRepository.findById({
        studentId: dto.studentId,
      });
      if (!student) {
        throw new NotFoundException('ไม่พบผู้ใช้งานนี้ในระบบ');
      }

      if (student.password && !dto.password) {
        throw new UnauthorizedException('กรุณากรอกรหัสผ่าน');
      }

      if (student.password) {
        const isMatch = await bcrypt.compare(dto.password, student.password);
        if (!isMatch) {
          throw new UnauthorizedException('รหัสผ่านไม่ถูกต้อง');
        }
      }

      delete student.password;

      return {
        accessToken: await this.jwtService.signAsync(student, {
          secret: this.config.get('STUDENT_JWT_ACCESS_SECRET'),
          expiresIn: '15m',
        }),
        refreshToken: await this.jwtService.signAsync(student, {
          secret: this.config.get('STUDENT_JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        }),
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async UserRefreshToken(
    dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const verify = await this.jwtService
        .verifyAsync<User>(dto.refreshToken, {
          secret: this.config.get('JWT_REFRESH_SECRET'),
        })
        .catch(() => {
          throw new BadRequestException('Refresh token is Expired or Invalid');
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
      delete user.photo;
      return {
        accessToken: await this.jwtService.signAsync(user, {
          secret: this.config.get('JWT_ACCESS_SECRET'),
          expiresIn: '15m',
        }),
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

  async StudnetRefreshToken(
    dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const verify = await this.jwtService
        .verifyAsync<Student>(dto.refreshToken, {
          secret: this.config.get('STUDENT_JWT_REFRESH_SECRET'),
        })
        .catch(() => {
          throw new BadRequestException('Refresh token is Expired or Invalid');
        });

      const student = await this.studentRepository.findById({
        studentId: verify.id,
      });
      if (!student) {
        throw new BadRequestException('Refresh token is invalid');
      }
      delete student.password;

      return {
        accessToken: await this.jwtService.signAsync(student, {
          secret: this.config.get('STUDENT_JWT_ACCESS_SECRET'),
          expiresIn: '15m',
        }),
        refreshToken: await this.jwtService.signAsync(student, {
          secret: this.config.get('STUDENT_JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        }),
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async googleLogin(req) {
    if (!req.user) {
      throw new NotFoundException('ไม่พบผู้ใช้งานนี้ใน google');
    }
    const data = req.user;

    const user = await this.usersRepository.findByEmail({ email: data.email });
    if (user) {
      if (!user.isVerifyEmail) {
        throw new UnauthorizedException('ยังไม่ได้ยืนยันอีเมล');
      }

      await this.usersRepository.updateLastActiveAt({ email: user.email });
      delete user.password;
      delete user.verifyEmailToken;
      delete user.verifyEmailTokenExpiresAt;
      delete user.resetPasswordToken;
      delete user.resetPasswordTokenExpiresAt;
      delete user.photo;
      return {
        accessToken: await this.jwtService.signAsync(user, {
          secret: this.config.get('JWT_ACCESS_SECRET'),
          expiresIn: '15m',
        }),
        refreshToken: await this.jwtService.signAsync(user, {
          secret: this.config.get('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        }),
      };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiration = new Date();
    expiration.setHours(expiration.getDate() + 1 * 30 * 12); // Token valid for 12 months
    const hashedPassword = null;

    const photo = data.photo;

    await this.usersRepository.createUser({
      ...data,
      photo,
      token,
      expiration,
      hashedPassword,
    });
    const resetUrl = `${process.env.CLIENT_URL}/auth/verify-email?token=${token}`;

    await this.emailService.sendMail({
      to: data.email,
      subject: 'Welcome to TATUGA SCHOOL',
      html: `Hello ${data.firstName},\n\nThank you for signing up! Click here to verify your e-mail: ${resetUrl}`,
    });
  }

  async initializeGoogleAuth() {
    try {
      const encode = atob(this.config.get('GOOGLE_CLOUD_PRIVATE_KEY_ENCODE'));
      this.oauth2Client = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        credentials: {
          type: 'service_account',
          private_key: encode,
          client_email: this.config.get('GOOGLE_CLOUD_CLIENT_EMAIL'),
          client_id: this.config.get('GOOGLE_CLOUD_CLIENT_ID'),
        },
      });
    } catch (error) {
      this.logger.error('Error initializing google auth:', error);
      throw new BadGatewayException('Error initializing google auth');
    }
  }

  async getGoogleAccessToken(): Promise<string> {
    try {
      const client = await this.oauth2Client.getClient();
      const accessToken = await client.getAccessToken();
      return accessToken.token;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
