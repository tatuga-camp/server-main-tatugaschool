import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Language, Prisma, User } from '@prisma/client';
import {
  RequestCreateUser,
  RequestFindByEmail,
  RequestFindById,
  RequestFindByResetToken,
  RequestFindByVerifyToken,
  RequestFindManyVerifiedByEmailPrefix,
  RequestUpdateLastActiveAt,
  RequestUpdatePassword,
  RequestUpdateResetToken,
  RequestUpdateUser,
  RequestUpdateVerified,
} from './interfaces';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// verifyEmailToken/resetPasswordToken are optional fields, so Prisma findFirst
// filters on them compile to `$expr`/`$ne: [field, "$$REMOVE"]` pipelines that
// MongoDB cannot serve from the token indexes — every verify/reset click would
// scan the whole User collection. The token lookups use findRaw instead.

type RawObjectId = { $oid: string };
type RawDate = { $date: string | { $numberLong: string } };

type RawUser = {
  _id: RawObjectId;
  createAt: RawDate;
  updateAt: RawDate;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photo: string;
  blurHash?: string | null;
  password?: string | null;
  role: User['role'];
  createBySchoolId?: RawObjectId | null;
  isVerifyEmail?: boolean;
  verifyEmailToken?: string | null;
  verifyEmailTokenExpiresAt?: RawDate | null;
  language?: User['language'];
  isDoneSurvey?: boolean;
  lastActiveAt: RawDate;
  isResetPassword?: boolean;
  provider: User['provider'];
  providerId?: string | null;
  isDeleted?: boolean;
  deleteAt?: RawDate | null;
  resetPasswordToken?: string | null;
  resetPasswordTokenExpiresAt?: RawDate | null;
  favoritSchool?: RawObjectId | null;
};

function fromRawDate(raw: RawDate): Date {
  return typeof raw.$date === 'string'
    ? new Date(raw.$date)
    : new Date(Number(raw.$date.$numberLong));
}

function fromRawUser(doc: RawUser): User {
  return {
    id: doc._id.$oid,
    createAt: fromRawDate(doc.createAt),
    updateAt: fromRawDate(doc.updateAt),
    firstName: doc.firstName,
    lastName: doc.lastName,
    email: doc.email,
    phone: doc.phone,
    photo: doc.photo,
    blurHash: doc.blurHash ?? null,
    password: doc.password ?? null,
    role: doc.role ?? 'USER',
    createBySchoolId: doc.createBySchoolId?.$oid ?? null,
    isVerifyEmail: doc.isVerifyEmail ?? false,
    verifyEmailToken: doc.verifyEmailToken ?? null,
    verifyEmailTokenExpiresAt: doc.verifyEmailTokenExpiresAt
      ? fromRawDate(doc.verifyEmailTokenExpiresAt)
      : null,
    language: doc.language ?? 'en',
    isDoneSurvey: doc.isDoneSurvey ?? false,
    lastActiveAt: fromRawDate(doc.lastActiveAt),
    isResetPassword: doc.isResetPassword ?? false,
    provider: doc.provider,
    providerId: doc.providerId ?? null,
    isDeleted: doc.isDeleted ?? false,
    deleteAt: doc.deleteAt ? fromRawDate(doc.deleteAt) : null,
    resetPasswordToken: doc.resetPasswordToken ?? null,
    resetPasswordTokenExpiresAt: doc.resetPasswordTokenExpiresAt
      ? fromRawDate(doc.resetPasswordTokenExpiresAt)
      : null,
    favoritSchool: doc.favoritSchool?.$oid ?? null,
  };
}

type Repository = {
  findMany(request: Prisma.UserFindManyArgs): Promise<User[]>;
  findManyVerifiedByEmailPrefix(
    request: RequestFindManyVerifiedByEmailPrefix,
  ): Promise<User[]>;
  findById(request: RequestFindById): Promise<User | null>;
  findByEmail(request: RequestFindByEmail): Promise<User>;
  update(request: Prisma.UserUpdateArgs): Promise<User>;
  updateResetToken(request: RequestUpdateResetToken): Promise<void>;
  createUser(request: RequestCreateUser): Promise<User>;
  findByVerifyToken(request: RequestFindByVerifyToken): Promise<User>;
  updateVerified(request: RequestUpdateVerified): Promise<void>;
  findByResetToken(request: RequestFindByResetToken): Promise<User>;
  updatePassword(request: RequestUpdatePassword): Promise<void>;
  updateLastActiveAt(request: RequestUpdateLastActiveAt): Promise<void>;
  findActiveRecipients(
    thresholdDays?: number,
  ): Promise<{ email: string; language: Language }[]>;
};

@Injectable()
export class UserRepository implements Repository {
  private logger: Logger = new Logger(UserRepository.name);
  constructor(private prisma: PrismaService) {}

  async findMany(request: Prisma.UserFindManyArgs): Promise<User[]> {
    try {
      return await this.prisma.user.findMany(request);
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  // Prisma `email: { contains }` compiles to an unanchored $regexMatch inside
  // a non-index-eligible `$expr` pipeline — every invite-teacher email search
  // scanned the entire User collection. A plain prefix-anchored, case-sensitive
  // $regex plus a { email: 1 } sort lets the { email } unique index serve the
  // match, the sort, and the limit.
  async findManyVerifiedByEmailPrefix(
    request: RequestFindManyVerifiedByEmailPrefix,
  ): Promise<User[]> {
    if (!request.email) {
      return [];
    }
    const escaped = request.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      const docs = (await this.prisma.user.findRaw({
        filter: {
          email: { $regex: `^${escaped}` },
          isVerifyEmail: true,
        },
        options: { limit: request.limit ?? 5, sort: { email: 1 } },
      })) as unknown as RawUser[];
      return docs.map(fromRawUser);
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async findActiveRecipients(
    thresholdDays = 30,
  ): Promise<{ email: string; language: Language }[]> {
    const since = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);
    return this.prisma.user.findMany({
      where: {
        lastActiveAt: { gte: since },
        isDeleted: false,
        isVerifyEmail: true,
      },
      select: { email: true, language: true },
    });
  }

  async findById(request: RequestFindById): Promise<User> {
    try {
      return await this.prisma.user.findUnique({
        where: {
          id: request.id,
        },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async findByEmail(request: RequestFindByEmail): Promise<User> {
    try {
      return await this.prisma.user.findUnique({
        where: {
          ...request,
        },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async update(request: Prisma.UserUpdateArgs): Promise<User> {
    try {
      const user = await this.prisma.user.update(request);
      const data: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        photo?: string;
        blurHash?: string;
      } = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        photo: user.photo,
        blurHash: user.blurHash,
      };
      await Promise.allSettled([
        // userId is optional on MemberOnSchool, so Prisma's updateMany filter
        // compiles to a $expr/$ne-$$REMOVE pipeline MongoDB cannot serve from
        // the userId index — a raw plain filter is index-eligible.
        this.prisma.$runCommandRaw({
          update: 'MemberOnSchool',
          updates: [
            {
              q: { userId: { $oid: user.id } },
              u: {
                $set: {
                  ...data,
                  updateAt: { $date: new Date().toISOString() },
                },
              },
              multi: true,
            },
          ],
        }),
        this.prisma.teacherOnSubject.updateMany({
          where: {
            userId: user.id,
          },
          data: data,
        }),
        // userId is optional on CommentOnAssignment, so Prisma's updateMany
        // filter compiles to a $expr/$ne-$$REMOVE pipeline MongoDB cannot serve
        // from the userId index — a raw plain filter is index-eligible.
        this.prisma.$runCommandRaw({
          update: 'CommentOnAssignment',
          updates: [
            {
              q: { userId: { $oid: user.id } },
              u: {
                $set: {
                  ...data,
                  updateAt: { $date: new Date().toISOString() },
                },
              },
              multi: true,
            },
          ],
        }),
      ]);

      return user;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        if (
          error.code === 'P2002' &&
          (error.meta?.target as string)?.includes('email')
        ) {
          throw new BadRequestException('Email is already taken');
        }
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async updateResetToken(request: RequestUpdateResetToken): Promise<void> {
    try {
      await this.prisma.user.update({
        where: {
          ...request.query,
        },
        data: {
          ...request.data,
        },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async createUser(request: RequestCreateUser): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          ...request,
          lastActiveAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async findByVerifyToken(request: RequestFindByVerifyToken): Promise<User> {
    // A raw {verifyEmailToken: null/undefined} filter would match token-less
    // users (or anyone at all) — never let a falsy token through.
    if (!request.verifyEmailToken) {
      return null;
    }
    try {
      const docs = (await this.prisma.user.findRaw({
        filter: { verifyEmailToken: request.verifyEmailToken },
        options: { limit: 1 },
      })) as unknown as RawUser[];
      return docs.length > 0 ? fromRawUser(docs[0]) : null;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async updateVerified(request: RequestUpdateVerified): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { email: request.email },
        data: {
          isVerifyEmail: true,
          verifyEmailToken: null,
          verifyEmailTokenExpiresAt: null,
        },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async findByResetToken(request: RequestFindByResetToken): Promise<User> {
    // Same guard as findByVerifyToken: a falsy token must never reach the
    // raw filter.
    if (!request.resetPasswordToken) {
      return null;
    }
    try {
      const docs = (await this.prisma.user.findRaw({
        filter: { resetPasswordToken: request.resetPasswordToken },
        options: { limit: 1 },
      })) as unknown as RawUser[];
      return docs.length > 0 ? fromRawUser(docs[0]) : null;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }
  async updatePassword(request: RequestUpdatePassword): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { email: request.email },
        data: {
          password: request.password,
          resetPasswordToken: null,
          resetPasswordTokenExpiresAt: null,
        },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }
  async updateLastActiveAt(request: RequestUpdateLastActiveAt): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { ...request },
        data: {
          lastActiveAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }
}
