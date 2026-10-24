import bcrypt from 'bcrypt';

// Hash::make() 相当
export function hashPassword(plain: string, rounds: number): Promise<string> {
  return bcrypt.hash(plain, rounds);
}

// Hash::check() 相当
export function verifyPassword(
  plain: string,
  hashed: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}
