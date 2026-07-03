import { Transform } from 'class-transformer';
import {
  IsArray,
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
  fromAccountId?: string;

  @IsString()
  @IsOptional()
  toAccountId?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

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
}
