import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserRepository } from './users.repository';
const prisma = new PrismaClient();

describe('Users repository', () => {
  let userRepository: UserRepository;
  const prismaService = new PrismaService();
  let userId: string;
  let userEmail: string;
  let userResetPasswordToken: string;
  let userResetPasswordTokenExpiresAt: Date;

  beforeAll(async () => {
    userRepository = new UserRepository(prismaService);
  });

  describe('createUser', () => {
    it('should create user', async () => {
      try {
        userEmail = `johnwick+${Date.now()}@email.com`;
        const user = await userRepository.createUser({
          firstName: 'Jonathan',
          lastName: 'Wick',
          email: userEmail,
          phone: '0812345678',
          password: 'secret_password123',
          provider: 'LOCAL',
          role: 'USER',
          photo:
            'https://storage.googleapis.com/public-tatugaschool/avatars/15.png',
        });

        expect(user.firstName).toBe('Jonathan');
        expect(user.lastName).toBe('Wick');
        expect(user.email).toBe(userEmail);
        expect(user.phone).toBe('0812345678');
        expect(user.password).toBe('secret_password123');
        expect(user.provider).toBe('LOCAL');
        expect(user.role).toBe('USER');
        expect(user.photo).toBe(
          'https://storage.googleapis.com/public-tatugaschool/avatars/15.png',
        );
        userId = user.id;
        userEmail = user.email;
      } catch (error) {
        console.log(error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should get user array', async () => {
      try {
        const users = await userRepository.findMany({
          where: { email: userEmail },
        });
        const match = users.find((u) => u.email === userEmail);
        expect(match).toBeDefined();
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('findById', () => {
    it('should get user by userId', async () => {
      try {
        const user = await userRepository.findById({
          id: userId,
        });
        expect(user.id).toBe(userId);
        expect(user.email).toBe(userEmail);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });
    it('should not found user (by incorrect Id)', async () => {
      try {
        const user = await userRepository.findById({
          id: '123456789012345678901234',
        });
        expect(user).toBeNull;
      } catch (error) {
        console.log(error);
        throw error;
      }
    });
  });

  describe('findByEmail', () => {
    it('should get user by Email', async () => {
      try {
        const user = await userRepository.findByEmail({
          email: userEmail,
        });
        expect(user.id).toBe(userId);
        expect(user.email).toBe(userEmail);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });
    it('should not found user (by Email)', async () => {
      try {
        const user = await userRepository.findByEmail({
          email: 'LnwZa007@gmail.com',
        });
        expect(user).toBeNull;
      } catch (error) {
        console.log(error);
        throw error;
      }
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      try {
        const userUpdate = await userRepository.update({
          where: { id: userId },
          data: {
            firstName: 'Thanathorn 666666',
            lastName: 'Chulay',
            email: 'thanathorn.c@gmail.com',
            phone: '0652345678',
            photo:
              'https://storage.googleapis.com/public-tatugaschool/avatars/14.png',
            blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
          },
        });
        const user = await userRepository.findById({
          id: userId,
        });

        expect(user.id).toBe(userUpdate.id);
        expect(user.firstName).toBe(userUpdate.firstName);
        expect(user.lastName).toBe(userUpdate.lastName);
        expect(user.email).toBe(userUpdate.email);
        expect(user.phone).toBe(userUpdate.phone);
        expect(user.photo).toBe(userUpdate.photo);
        expect(user.blurHash).toBe(userUpdate.blurHash);

        userId = userUpdate.id;
        userEmail = userUpdate.email;
      } catch (error) {
        console.log(error);
        throw error;
      }
    });
  });

  describe('updateVerified', () => {
    it('should update verified', async () => {
      try {
        const userVerified = await userRepository.updateVerified({
          email: userEmail,
        });
        const user = await userRepository.findByEmail({
          email: userEmail,
        });
        expect(user.isVerifyEmail).toBe(true);
        expect(user.verifyEmailToken).toBeNull();
        expect(user.verifyEmailTokenExpiresAt).toBeNull();
      } catch (error) {
        console.log(error);
        throw error;
      }
    });
  });

  describe('updateResetToken', () => {
    it('should update reset token', async () => {
      try {
        const email = userEmail;
        const expiresAt = new Date().toISOString();

        await userRepository.updateResetToken({
          query: { email: email },
          data: {
            resetPasswordToken: 'reset-password-token-123',
            resetPasswordTokenExpiresAt: expiresAt,
          },
        });

        const user = await userRepository.findByEmail({ email });

        expect(user.resetPasswordToken).toBe('reset-password-token-123');
        expect(user.resetPasswordTokenExpiresAt.toISOString()).toBe(expiresAt);

        userResetPasswordToken = user.resetPasswordToken;
        userResetPasswordTokenExpiresAt = user.resetPasswordTokenExpiresAt;
      } catch (error) {
        console.log(error);
        throw error;
      }
    });
  });

  describe('updatePassword', () => {
    it('should update password', async () => {
      try {
        const userUpdate = await userRepository.updatePassword({
          email: userEmail,
          password: 'new_password_after_update234',
        });
        const user = await userRepository.findByEmail({ email: userEmail });
        expect(user.id).toBe(userId);
        expect(user.email).toBe(userEmail);
        expect(user.password).toBe('new_password_after_update234');
      } catch (error) {
        console.log(error);
        throw error;
      }
    });
  });

  describe('updateLastActiveAt', () => {
    it('should update last activeAt', async () => {
      try {
        let email = userEmail;
        const userUpdate = await userRepository.updateLastActiveAt({
          email: email,
        });
        const user = await userRepository.findByEmail({ email: userEmail });
        expect(user.email).toBe(email);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });
  });
});
