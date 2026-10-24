import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { RefreshToken } from '../../domain/refreshTokens/refresh-token.js';
import { RefreshTokenRepository } from '../../domain/refreshTokens/refresh-token.repository.js';
import { RefreshTokenEntity } from '../entities/refresh-token.entity.js';

@Injectable()
export class TypeOrmRefreshTokenRepository extends RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly tokens: Repository<RefreshTokenEntity>,
  ) {
    super();
  }

  async create(
    userId: number,
    token: string,
    expiresAt: Date,
  ): Promise<RefreshToken> {
    const entity = await this.tokens.save(
      this.tokens.create({ userId, token, expiresAt }),
    );
    return toDomain(entity);
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    const entity = await this.tokens.findOneBy({ token });
    return entity ? toDomain(entity) : null;
  }

  async deleteByToken(token: string): Promise<void> {
    await this.tokens.delete({ token });
  }

  async deleteByUserId(userId: number): Promise<void> {
    await this.tokens.delete({ userId });
  }
}

function toDomain(entity: RefreshTokenEntity): RefreshToken {
  return {
    userId: entity.userId,
    token: entity.token,
    expiresAt: entity.expiresAt,
  };
}
