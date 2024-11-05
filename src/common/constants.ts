import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export const DEFAULT_PASSWORD = async () => await bcrypt.hash('123456', 10);
export const VERIFY_EMAIL_TOKEN = async () =>
  await crypto.randomBytes(32).toString('hex');
export const VERIFY_EMAIL_TOKEN_EXPIRES_AT = async () => {
  const expiration = new Date();
  expiration.setHours(expiration.getDate() + 1 * 30 * 12);
  return expiration.toISOString();
};

export const userId = '6713ef9b80aea63b7c5ee6b5';
export const anotherUserId = '6714cf954dddbfc4f917087b';
export const subjectId = '6724508e1aa74ef682e62ba5';
export const assignmentIdNotFound = '66ebc40ead22355cc1e8e13b';
export const userIdOutsideSchool = '6714d0fa2f1de16d9e8d08c8';
export const userIdOutsideSubject = '671e1421c43468567e75b854';
export const pendingOnSchoolMemberUserId = '6724b6567c6e4b52cde2e43b';
export const attendanceId = '67289307cd36984a01ac2b43';
export const notFoundAttendanceId = '66ec4ab87e1d88db2d7fd9ca';
export const skillId: string = '672893d2d387442ed0c4b29f';
export const studentOnAssignmentId = '67289465977091eba7538b09';
export const studentId: string = '67189da5223841aa75f55ef8';
