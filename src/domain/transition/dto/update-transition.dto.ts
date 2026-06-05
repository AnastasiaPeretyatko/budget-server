import {
  IsDefined,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
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

  @IsInt()
  @IsDefined()
  amount?: string;

  @IsString()
  @IsOptional()
  description?: null;

  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;
}
