import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class UpdateBookRequest {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  @Min(1)
  authorId: number;

  @IsInt()
  @Min(1)
  price: number;
}
