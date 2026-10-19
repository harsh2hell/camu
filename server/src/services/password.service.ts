import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export class PasswordService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) return false;
    return bcrypt.compare(password, hash);
  }
}

export const passwordService = new PasswordService();
