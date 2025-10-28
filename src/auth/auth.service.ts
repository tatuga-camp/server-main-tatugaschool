import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Student, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Request, Response } from 'express';
import { Auth, google } from 'googleapis';
import { EmailService } from '../email/email.service';
import { GoogleStorageService } from '../google-storage/google-storage.service';
import { ImageService } from '../image/image.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRepository } from '../users/users.repository';
import { StudentRepository } from './../student/student.repository';
import {
  ForgotPasswordDto,
  RefreshTokenDto,
  ResetPasswordDto,
  SignInDto,
  SignUpDto,
  StudentSignInDto,
  VerifyEmailDto,
} from './dto';
import { GoogleProfile } from './strategy/google-oauth.strategy';

@Injectable()
export class AuthService {
  logger: Logger;
  usersRepository: UserRepository;
  studentRepository: StudentRepository;
  oauth2Client: Auth.GoogleAuth;
  constructor(
    private emailService: EmailService,
    private jwtService: JwtService,
    private base64ImageService: ImageService,
    private config: ConfigService,
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
  ) {
    this.initializeGoogleAuth();
    this.logger = new Logger(AuthService.name);
    this.usersRepository = new UserRepository(prisma);
    this.studentRepository = new StudentRepository(
      this.prisma,
      this.googleStorageService,
    );
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
      const lastUpdate = new Date(user.updateAt).getTime();

      if (new Date().getTime() - lastUpdate < 60000) {
        throw new BadRequestException(
          'Please wait 1 minute before trying again',
        );
      }

      if (user.provider !== 'LOCAL') {
        throw new BadRequestException('รหัสผ่านของคุณถูกควบคุมโดย Google');
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiration = new Date();
      expiration.setMinutes(expiration.getMinutes() + 5);
      await this.usersRepository.updateResetToken({
        query: { email: dto.email },
        data: {
          resetPasswordToken: token,
          resetPasswordTokenExpiresAt: expiration.toISOString(),
        },
      });

      const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password?token=${token}`;

      const emailHTML = `
         <body style="background-color: #f8f9fa;">
       <div style="margin: 0 auto; max-width: 600px; padding: 20px;">
         <img class="ax-center" style="display: block; margin: 40px auto 0; width: 96px;" src="https://storage.googleapis.com/public-tatugaschool/logo-tatugaschool.png" />
         <div style="background-color: #ffffff; padding: 24px 32px; margin: 40px 0; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
           <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">
          Reset your password
           </h1>
           <p style="margin: 0 0 16px;">
           Hello ${user.firstName} ${user.lastName},<br>
            You requested a password reset. Click button below to reset your password
           You have 5 minutes to reset your password. It Will be expired at ${expiration.toUTCString()}  
           </p>
            <p style="margin: 0 0 16px; color: #6c757d">
            Do not reply to this email, this email is automatically generated.
            If you have any questions, please contact this email permlap@tatugacamp.com or the address below
           </p>
           <a style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 12px 24px; font-weight: 700; text-decoration: none; border-radius: 4px;" href="${resetUrl}">Click!</a>
         </div>
         <img class="ax-center" style="display: block; margin: 40px auto 0; width: 160px;" src="https://storage.googleapis.com/public-tatugaschool/banner-tatugaschool.jpg" />
         <div style="color: #6c757d; text-align: center; margin: 24px 0;">
         Tatuga School - ห้างหุ้นส่วนจำกัด ทาทูก้าแคมป์ <br>
         879 หมู่3 ตำบลโพธิ์กลาง อำเภอเมืองนครราชสีมา จ.นครราชสีมา 30000<br>
         โทร 0610277960 Email: permlap@tatugacamp.com<br>
         </div>
       </div>
     </body>
     `;
      await this.emailService.sendMail({
        to: user.email,
        subject: 'Reset your password',
        html: emailHTML,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async signup(dto: SignUpDto, res: Response): Promise<Response> {
    try {
      const existingUser = await this.usersRepository.findByEmail({
        email: dto.email,
      });
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      let hashedPassword = null;
      if (
        dto.provider === 'LOCAL' &&
        (!dto.password || dto.password.length < 8)
      ) {
        throw new BadRequestException(
          'Password is required and must be more than 7 long',
        );
      }

      if (dto.provider === 'LOCAL') {
        hashedPassword = await bcrypt.hash(dto.password, 10);
      }

      let photo = this.base64ImageService.generateBase64Image(
        dto.email.charAt(0).toUpperCase(),
      );

      if (dto.photo) {
        photo = dto.photo;
      }

      delete dto.password;
      const user = await this.usersRepository.createUser({
        ...dto,
        photo,
        password: hashedPassword,
      });

      const accessToken = await this.GenerateAccessToken(user);
      const refreshToken = await this.GenerateRefreshToken(user);
      const token = await this.sendVerifyEmail(user);
      this.setCookieAccessToken(res, accessToken);
      this.setCookieRefreshToken(res, refreshToken);

      return res.json({
        redirectUrl: `${process.env.CLIENT_URL}/auth/wait-verify-email`,
        token: token.token,
      });
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
        throw new NotFoundException("Can't find user with this token");
      }

      if (user.verifyEmailTokenExpiresAt < new Date()) {
        throw new ForbiddenException('Token expired');
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
        throw new NotFoundException("Token isn't valid");
      }
      if (user.resetPasswordTokenExpiresAt < new Date()) {
        throw new ForbiddenException('Token expired');
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

  async signIn(dto: SignInDto, res: Response) {
    try {
      const user = await this.usersRepository.findByEmail({
        email: dto.email,
      });
      if (!user) {
        throw new NotFoundException('No user found with this email');
      }
      if (user.provider !== 'LOCAL') {
        throw new BadRequestException('Please sign in with google');
      }

      const accessToken = await this.GenerateAccessToken(user);
      const refreshToken = await this.GenerateRefreshToken(user);

      const isMatch = await bcrypt.compare(dto.password, user.password);
      if (!isMatch) {
        throw new BadRequestException('Password is NOT Correct');
      }

      await this.usersRepository.updateLastActiveAt({
        email: user.email,
      });

      this.setCookieAccessToken(res, accessToken);
      this.setCookieRefreshToken(res, refreshToken);

      if (!user.isVerifyEmail) {
        return res.json({
          redirectUrl: `${process.env.CLIENT_URL}/auth/wait-verify-email`,
        });
      }

      return res.json({
        redirectUrl: process.env.CLIENT_URL,
        refreshToken: refreshToken,
        accessToken: accessToken,
      });
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
        throw new NotFoundException("Student isn't found");
      }

      if (student.password && !dto.password) {
        throw new BadRequestException('Please enter your password');
      }

      if (student.password) {
        const isMatch = await bcrypt.compare(dto.password, student.password);
        if (!isMatch) {
          throw new BadRequestException("Password isn't correct");
        }
      }

      return {
        accessToken: await this.GenerateStudentAccessToken(student),
        refreshToken: await this.GenerateStudentRefreshToken(student),
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async UserRefreshToken(dto: RefreshTokenDto, res: Response) {
    try {
      const verify = await this.jwtService
        .verifyAsync<User>(dto.refreshToken, {
          secret: this.config.get('JWT_REFRESH_SECRET'),
        })
        .catch(() => {
          throw new BadRequestException('Refresh token is Expired or Invalid');
        });

      const user = await this.usersRepository.findById({
        id: verify.id,
      });
      if (!user) {
        throw new BadRequestException('Refresh token is invalid');
      }
      const accessToken = await this.GenerateAccessToken(user);
      return res.json({ accessToken: accessToken });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async StudnetRefreshToken(
    dto: RefreshTokenDto,
  ): Promise<{ accessToken: string }> {
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

      return {
        accessToken: await this.GenerateStudentAccessToken(student),
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async googleLogin(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw new NotFoundException('ไม่พบผู้ใช้งานนี้ใน google');
      }
      const data = req.user as GoogleProfile;

      let user = await this.usersRepository.findByEmail({
        email: data.email,
      });

      if (user) {
        if (user.provider !== 'GOOGLE') {
          return res.redirect(
            `${process.env.CLIENT_URL}/auth/sign-in?error=Please sign in with email and password`,
          );
        }

        const accessToken = await this.GenerateAccessToken(user);
        const refreshToken = await this.GenerateRefreshToken(user);

        this.setCookieAccessToken(res, accessToken);
        this.setCookieRefreshToken(res, refreshToken);

        if (!user.isVerifyEmail) {
          return res.redirect(
            `${process.env.CLIENT_URL}/auth/wait-verify-email`,
          );
        }
        await this.usersRepository.updateLastActiveAt({ email: user.email });
        const url = user.favoritSchool
          ? `${process.env.CLIENT_URL}/school/${user.favoritSchool}`
          : `${process.env.CLIENT_URL}`;
        return res.redirect(url);
      }

      return res.redirect(
        `${process.env.CLIENT_URL}/auth/sign-up?email=${data.email}&firstName=${data.firstName}&lastName=${data.lastName}&provider=google&providerId=${data.providerId}&photo=${data.photo}`,
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async sendVerifyEmail(user: User): Promise<{ token: string }> {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expiration = new Date();
      expiration.setHours(expiration.getDate() + 1 * 30 * 12); // Token valid for 12 months

      const update = await this.usersRepository.update({
        where: {
          id: user.id,
        },
        data: {
          verifyEmailToken: token,
          verifyEmailTokenExpiresAt: expiration.toISOString(),
        },
      });

      const resetUrl = `${process.env.CLIENT_URL}/auth/verify-email?token=${token}`;

      const emailHTML = `
         <body style="background-color: #f8f9fa;">
       <div style="margin: 0 auto; max-width: 600px; padding: 20px;">
         <img class="ax-center" style="display: block; margin: 40px auto 0; width: 96px;" src="https://storage.googleapis.com/public-tatugaschool/logo-tatugaschool.png" />
         <div style="background-color: #ffffff; padding: 24px 32px; margin: 40px 0; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
           <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">
          Verify your email to login on Tatuga School
           </h1>
           <p style="margin: 0 0 16px;">
           Hello ${update.firstName},<br>
           Thank you for signing up! Click button below to verify your e-mail
           </p>
            <p style="margin: 0 0 16px; color: #6c757d">
            Do not reply to this email, this email is automatically generated.
            If you have any questions, please contact this email permlap@tatugacamp.com or the address below
           </p>
           <a style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 12px 24px; font-weight: 700; text-decoration: none; border-radius: 4px;" href="${resetUrl}">Verify Email</a>
         </div>
         <img class="ax-center" style="display: block; margin: 40px auto 0; width: 160px;" src="https://storage.googleapis.com/public-tatugaschool/banner-tatugaschool.jpg" />
         <div style="color: #6c757d; text-align: center; margin: 24px 0;">
         Tatuga School - ห้างหุ้นส่วนจำกัด ทาทูก้าแคมป์ <br>
         879 หมู่3 ตำบลโพธิ์กลาง อำเภอเมืองนครราชสีมา จ.นครราชสีมา 30000<br>
         โทร 0610277960 Email: permlap@tatugacamp.com<br>
         </div>
       </div>
     </body>
     `;
      this.emailService.sendMail({
        to: update.email,
        subject: 'Verify your email to login on Tatuga School',
        html: emailHTML,
      });
      return { token };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
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

  async GenerateAccessToken(user: User): Promise<string> {
    try {
      const payload = {
        id: user.id,
        email: user.email,
      };

      return await this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: '5h',
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async GenerateStudentAccessToken(student: Student): Promise<string> {
    try {
      const payload = {
        id: student.id,
        schoolId: student.schoolId,
      };

      return await this.jwtService.signAsync(payload, {
        secret: this.config.get('STUDENT_JWT_ACCESS_SECRET'),
        expiresIn: '5h',
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async GenerateRefreshToken(user: User): Promise<string> {
    try {
      const payload = {
        id: user.id,
        email: user.email,
      };
      return await this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: '3d',
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  setCookieAccessToken(res: Response, accessToken: string) {
    res.cookie('access_token', accessToken, {
      maxAge: 1000 * 60 * 60 * 24 * 3,
      secure: true,
      sameSite: 'none',
      ...(this.config.get('NODE_ENV') === 'production' && {
        domain: '.tatugaschool.com',
      }),
    });
  }

  setCookieRefreshToken(res: Response, refreshToken: string) {
    res.cookie('refresh_token', refreshToken, {
      maxAge: 1000 * 60 * 60 * 24 * 3,
      secure: true,
      sameSite: 'none',
      ...(this.config.get('NODE_ENV') === 'production' && {
        domain: '.tatugaschool.com',
      }),
    });
  }

  async GenerateStudentRefreshToken(student: Student): Promise<string> {
    try {
      const payload = {
        id: student.id,
        schoolId: student.schoolId,
      };
      return await this.jwtService.signAsync(payload, {
        secret: this.config.get('STUDENT_JWT_REFRESH_SECRET'),
        expiresIn: '3d',
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
