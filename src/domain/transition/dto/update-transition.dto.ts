import { IsDefined, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateTransitionDto {
  @IsString()
  @IsOptional()
  fromAccountId?: string;

  @IsString()
  @IsOptional()
  toAccountId?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsInt()
  @IsDefined()
  amount: string;

  @IsString()
  @IsOptional()
  description?: null;
}
