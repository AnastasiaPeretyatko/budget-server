import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { TransactionType } from '../transition.entity';

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

  @IsString()
  @IsOptional()
  amount?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  date?: Date;

  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;
}
