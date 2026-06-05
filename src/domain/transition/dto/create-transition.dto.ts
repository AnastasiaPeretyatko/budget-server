import { Type } from 'class-transformer';
import {
  IsDate,
  IsDefined,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { TransactionType } from '../transition.entity';

export class CreateTransitionDto {
  @IsString()
  @IsOptional()
  fromAccountId?: string;

  @IsString()
  @IsOptional()
  toAccountId?: string;

  @IsString()
  @IsDefined()
  categoryId!: string;

  @IsString()
  @IsDefined()
  amount!: string;

  @IsString()
  @IsOptional()
  description?: null;

  @IsDate()
  @Type(() => Date)
  @IsDefined()
  date!: Date;

  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;
}
