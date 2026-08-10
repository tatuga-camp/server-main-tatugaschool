import { MemberOnSchool, Prisma } from '@prisma/client';

// MemberOnSchool.userId is optional, so Prisma-generated filters on it compile
// to `$expr`/`$ne: [field, "$$REMOVE"]` pipelines MongoDB cannot serve from an
// index — and these membership lookups run on nearly every authorized request.
// The helpers below use findRaw with plain filters against the
// { userId, schoolId } index (userId-only lookups use the index prefix).

type RawObjectId = { $oid: string };
type RawDate = { $date: string | { $numberLong: string } };

type RawMemberOnSchool = {
  _id: RawObjectId;
  createAt: RawDate;
  updateAt: RawDate;
  status?: MemberOnSchool['status'];
  role?: MemberOnSchool['role'];
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  photo?: string | null;
  blurHash?: string | null;
  phone?: string | null;
  invitationToken?: string | null;
  invitationTokenExpiresAt?: RawDate | null;
  userId?: RawObjectId | null;
  schoolId: RawObjectId;
};

function fromRawDate(raw: RawDate): Date {
  return typeof raw.$date === 'string'
    ? new Date(raw.$date)
    : new Date(Number(raw.$date.$numberLong));
}

function fromRawMemberOnSchool(doc: RawMemberOnSchool): MemberOnSchool {
  return {
    id: doc._id.$oid,
    createAt: fromRawDate(doc.createAt),
    updateAt: fromRawDate(doc.updateAt),
    status: doc.status ?? 'PENDDING',
    role: doc.role ?? 'TEACHER',
    firstName: doc.firstName ?? null,
    lastName: doc.lastName ?? null,
    email: doc.email,
    photo: doc.photo ?? null,
    blurHash: doc.blurHash ?? null,
    phone: doc.phone ?? null,
    invitationToken: doc.invitationToken ?? null,
    invitationTokenExpiresAt: doc.invitationTokenExpiresAt
      ? fromRawDate(doc.invitationTokenExpiresAt)
      : null,
    userId: doc.userId?.$oid ?? null,
    schoolId: doc.schoolId.$oid,
  };
}

export type MemberOnSchoolUserFilter = {
  userId: string;
  schoolId?: string;
  status?: MemberOnSchool['status'];
};

type PrismaMemberOnSchoolRaw = {
  memberOnSchool: {
    findRaw(args: {
      filter: Prisma.InputJsonObject;
      options?: Prisma.InputJsonObject;
    }): Promise<unknown>;
  };
};

function buildFilter(filter: MemberOnSchoolUserFilter): Prisma.InputJsonObject {
  return {
    userId: { $oid: filter.userId },
    ...(filter.schoolId !== undefined && {
      schoolId: { $oid: filter.schoolId },
    }),
    ...(filter.status !== undefined && { status: filter.status }),
  };
}

export async function findFirstMemberOnSchoolByUser(
  prisma: PrismaMemberOnSchoolRaw,
  filter: MemberOnSchoolUserFilter,
): Promise<MemberOnSchool | null> {
  const docs = (await prisma.memberOnSchool.findRaw({
    filter: buildFilter(filter),
    options: { limit: 1 },
  })) as unknown as RawMemberOnSchool[];
  return docs.length > 0 ? fromRawMemberOnSchool(docs[0]) : null;
}

export async function findManyMemberOnSchoolByUser(
  prisma: PrismaMemberOnSchoolRaw,
  filter: MemberOnSchoolUserFilter,
): Promise<MemberOnSchool[]> {
  const docs = (await prisma.memberOnSchool.findRaw({
    filter: buildFilter(filter),
  })) as unknown as RawMemberOnSchool[];
  return docs.map(fromRawMemberOnSchool);
}

export async function findMemberOnSchoolByInvitationToken(
  prisma: PrismaMemberOnSchoolRaw,
  token: string,
): Promise<MemberOnSchool | null> {
  // A raw {invitationToken: null/undefined} filter would match rows that never
  // carried a token (or any row at all) — never let a falsy token through.
  if (!token) {
    return null;
  }
  const docs = (await prisma.memberOnSchool.findRaw({
    filter: { invitationToken: token },
    options: { limit: 1 },
  })) as unknown as RawMemberOnSchool[];
  return docs.length > 0 ? fromRawMemberOnSchool(docs[0]) : null;
}

// Raw `userId: null` matches both explicit-null and missing userId, whereas
// Prisma's `userId: null` matches only explicit null. Invitation rows are
// created without a linked user, so matching missing too is the intended
// "invite not yet linked" semantics.
export async function findPendingInvitationsByUserOrEmail(
  prisma: PrismaMemberOnSchoolRaw,
  request: { userId: string; email: string },
): Promise<MemberOnSchool[]> {
  const docs = (await prisma.memberOnSchool.findRaw({
    filter: {
      status: 'PENDDING',
      $or: [
        { userId: { $oid: request.userId } },
        { userId: null, email: request.email },
      ],
    },
  })) as unknown as RawMemberOnSchool[];
  return docs.map(fromRawMemberOnSchool);
}
