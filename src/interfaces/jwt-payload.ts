export type UserJwtPayload = {
  id: string;
  email: string;
  isVerifyEmail: boolean;
};

export type StudentJwtPayload = {
  id: string;
  schoolId: string;
};
