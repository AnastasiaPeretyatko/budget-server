import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDefined,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { TransactionType } from 'src/domain/transition/transition.entity';

export class CreateTemplateDto {
  @IsUUID()
  @IsOptional()
  fromAccountId: string | null = null;

  @IsUUID()
  @IsOptional()
  toAccountId: string | null = null;

  @IsUUID()
  @IsOptional()
  categoryId: string | null = null;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(',', '.') : value,
  )
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'amount must be a valid number' })
  @IsDefined()
  amount!: string;

  @IsString()
  @IsDefined()
  name!: string;

  @IsString()
  @IsDefined()
  icon!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TransactionType)
  @IsDefined()
  type!: TransactionType;

  @IsUUID('all', { each: true })
  @ArrayUnique()
  @IsArray()
  @IsOptional()
  tagIds?: string[] | null;
}
