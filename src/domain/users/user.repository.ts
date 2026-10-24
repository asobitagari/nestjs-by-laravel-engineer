import type {
  CreateUserInput,
  UpdateUserInput,
  User,
  UserWithPassword,
} from './user.js';

export abstract class UserRepository {
  abstract findAll(): Promise<User[]>;
  abstract findById(id: number): Promise<User | null>;
  abstract findByEmail(email: string): Promise<UserWithPassword | null>;
  abstract create(input: CreateUserInput): Promise<User>;
  abstract update(id: number, input: UpdateUserInput): Promise<User | null>;
  abstract updateName(id: number, name: string): Promise<User | null>;
  abstract updatePassword(id: number, hashedPassword: string): Promise<void>;
  abstract delete(id: number): Promise<boolean>;
}
