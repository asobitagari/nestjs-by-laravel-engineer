import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { EmailAlreadyExistsError } from '../../domain/errors.js';
import type {
  CreateUserInput,
  UpdateUserInput,
  User,
  UserWithPassword,
} from '../../domain/users/user.js';
import { UserRepository } from '../../domain/users/user.repository.js';
import { UserEntity } from '../entities/user.entity.js';

@Injectable()
export class TypeOrmUserRepository extends UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {
    super();
  }

  async findAll(): Promise<User[]> {
    const entities = await this.users.find({ order: { id: 'ASC' } });
    return entities.map(toDomain);
  }

  async findById(id: number): Promise<User | null> {
    const entity = await this.users.findOneBy({ id });
    return entity ? toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<UserWithPassword | null> {
    const entity = await this.users.findOneBy({ email });
    return entity ? { ...toDomain(entity), password: entity.password } : null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const entity = await saveUnique(() =>
      this.users.save(this.users.create(input)),
    );
    return toDomain(entity);
  }

  async update(id: number, input: UpdateUserInput): Promise<User | null> {
    const entity = await this.users.findOneBy({ id });
    if (!entity) return null;
    Object.assign(entity, input);
    return toDomain(await saveUnique(() => this.users.save(entity)));
  }

  async updateName(id: number, name: string): Promise<User | null> {
    const entity = await this.users.findOneBy({ id });
    if (!entity) return null;
    entity.name = name;
    return toDomain(await this.users.save(entity));
  }

  async updatePassword(id: number, hashedPassword: string): Promise<void> {
    await this.users.update({ id }, { password: hashedPassword });
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.users.softDelete(id);
    return (result.affected ?? 0) > 0;
  }
}

// 論理削除済みユーザーのメールは事前チェック（findByEmail）をすり抜けるので、
// UNIQUE 制約違反をドメイン例外に変換する（design D5）
async function saveUnique<T>(save: () => Promise<T>): Promise<T> {
  try {
    return await save();
  } catch (error) {
    if (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string } | undefined)?.code ===
        'SQLITE_CONSTRAINT_UNIQUE'
    ) {
      throw new EmailAlreadyExistsError();
    }
    throw error;
  }
}

function toDomain(entity: UserEntity): User {
  return {
    id: entity.id,
    name: entity.name,
    email: entity.email,
    isAdmin: entity.isAdmin,
  };
}
