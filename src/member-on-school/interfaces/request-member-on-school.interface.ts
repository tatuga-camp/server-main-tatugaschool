import { Status, MemberRole } from '@prisma/client';

export interface RequestCreateMemberOnSchool {
  status?: Status;
  role?: MemberRole;
  firstName: string | null;
  lastName: string | null;
  email: string;
  photo: string | null;
  phone: string | null;
  userId: string | null;
  schoolId: string;
  blurHash?: string | null;
  invitationToken?: string | null;
  invitationTokenExpiresAt?: Date | null;
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
