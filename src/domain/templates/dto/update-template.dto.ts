import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';
import { TransactionType } from 'src/domain/transition/transition.entity';

// Поле не передано (undefined) — не менять.
// Поле передано как null — сбросить (только счета, категория и описание:
// остальные колонки не допускают null). tagIds: [] — убрать все теги.
export class UpdateTemplateDto {
  @IsString()
  @ValidateIf((_, value) => value !== undefined)
  name?: string;

  @IsString()
  @ValidateIf((_, value) => value !== undefined)
  icon?: string;

  @IsUUID()
  @IsOptional()
  fromAccountId?: string | null;

  @IsUUID()
  @IsOptional()
  toAccountId?: string | null;

  @IsUUID()
  @IsOptional()
  categoryId?: string | null;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(',', '.') : value,
  )
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'amount must be a valid number' })
  @ValidateIf((_, value) => value !== undefined)
  amount?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsEnum(TransactionType)
  @ValidateIf((_, value) => value !== undefined)
  type?: TransactionType;

  @IsUUID('all', { each: true })
  @ArrayUnique()
  @IsArray()
  @ValidateIf((_, value) => value !== undefined)
  tagIds?: string[];
}
