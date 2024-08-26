import { Provider, UserRole } from '@prisma/client';

export type RequestFindByEmail = {
  email: string;
};

export type RequestUpdateResetToken = {
  query: {
    email: string;
  };
  data: {
    resetPasswordToken: string;
    resetPasswordTokenExpiresAt: string;
  };
};

export type RequestCreateUser = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role?: UserRole;
  provider: Provider;
  providerId?: string;
  photo: string;
  verifyEmailToken: string;
  verifyEmailTokenExpiresAt: string;
};
export type RequestUpdateUser = {
  query: {
    userId: string;
  };
  body: {
    firstName?: string;
    lastName?: string;
    email?: string;
    photo?: string;
    phone?: string;
  };
};

export type RequestFindByVerifyToken = {
  verifyEmailToken: string;
};

export type RequestUpdateVerified = {
  email: string;
};

export type RequestFindByResetToken = {
  resetPasswordToken: string;
};

export type RequestUpdatePassword = {
  email: string;
  password: string;
};

export type RequestUpdateLastActiveAt = {
  email: string;
};

export type RequestFindById = {
  id: string;
};
