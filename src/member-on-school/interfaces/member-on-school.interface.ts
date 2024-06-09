import { Status, MemberRole } from '@prisma/client';

export interface RequestCreateMemberOnSchool {
  status?: Status;
  role?: MemberRole;
  firstName: string;
  lastName: string;
  email: string;
  photo: string;
  phone: string;
  userId: string;
  schoolId: string;
}
