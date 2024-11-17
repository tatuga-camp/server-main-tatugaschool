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
