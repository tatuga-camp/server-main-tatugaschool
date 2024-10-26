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
  blurHash?: string;
}

export interface RequestUpdateMemberOnSchool {
  query: {
    id: string;
  };
  data: {
    status?: Status;
    role?: MemberRole;
    billingManagerId?: string;
  };
}

export interface RequestGetMemberOnSchoolByEmail {
  email: string;
  schoolId: string;
}

export interface RequestDeleteMemberOnSchool {
  id: string;
}
