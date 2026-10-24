import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

// 失効したら使えない方がよいので SoftDeletes を付けず物理削除する
@Entity('refresh_tokens')
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @Column({ type: 'text', unique: true })
  token: string;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
