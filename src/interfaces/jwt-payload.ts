export type UserJwtPayload = {
  id: string;
  email: string;
};

export type StudentJwtPayload = {
  id: string;
  schoolId: string;
};
