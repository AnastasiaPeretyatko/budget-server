import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';
import { MacroFund } from '../types';

// Поле не передано (undefined) — не менять.
// Поле передано как null — сбросить (только color и defaultLimit).
export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsHexColor()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color must be in #RRGGBB format' })
  @IsOptional()
  color?: string | null;

  // IsOptional пропускает и null — а macroFund сбрасывать нельзя, поэтому ValidateIf
  @IsEnum(MacroFund)
  @ValidateIf((_, value) => value !== undefined)
  macroFund?: MacroFund;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(',', '.') : value,
  )
  @Matches(/^\d{1,10}(\.\d{1,2})?$/, {
    message: 'defaultLimit must be a non-negative number with up to 2 decimals',
  })
  @IsOptional()
  defaultLimit?: string | null;

  @IsBoolean()
  @ValidateIf((_, value) => value !== undefined)
  rolloverToReserve?: boolean;

  @IsBoolean()
  @ValidateIf((_, value) => value !== undefined)
  allowOverspendFromFund?: boolean;
}
