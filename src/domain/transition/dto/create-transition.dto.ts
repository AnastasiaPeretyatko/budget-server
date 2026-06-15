import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsDefined,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
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

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  tagIds?: string[];
}
