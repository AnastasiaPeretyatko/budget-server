import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsDefined,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
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

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(',', '.') : value,
  )
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'amount must be a valid number' })
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
