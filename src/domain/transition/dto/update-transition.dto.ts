import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

import { TransactionType } from '../transition.entity';

export class UpdateTransitionDto {
  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  fromAccountId?: string | null;

  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  toAccountId?: string | null;

  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  categoryId?: string | null;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(',', '.') : value,
  )
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'amount must be a valid number' })
  @IsOptional()
  amount?: string;

  @IsString()
  @IsOptional()
  description?: null;

  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  tagIds?: string[];

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  date?: Date;
}
