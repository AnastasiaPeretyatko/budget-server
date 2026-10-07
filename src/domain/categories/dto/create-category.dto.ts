import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';
import { MacroFund } from '../types';

export class CreateCategoryDto {
  @IsString()
  @IsDefined()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsHexColor()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color must be in #RRGGBB format' })
  @IsOptional()
  color?: string;

  @IsEnum(MacroFund)
  @IsDefined()
  macroFund!: MacroFund;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(',', '.') : value,
  )
  @Matches(/^\d{1,10}(\.\d{1,2})?$/, {
    message: 'defaultLimit must be a non-negative number with up to 2 decimals',
  })
  @IsOptional()
  defaultLimit?: string | null;

  // IsOptional пропускает и null, а колонка NOT NULL — поэтому ValidateIf
  @IsBoolean()
  @ValidateIf((_, value) => value !== undefined)
  rolloverToReserve?: boolean;

  @IsBoolean()
  @ValidateIf((_, value) => value !== undefined)
  allowOverspendFromFund?: boolean;
}
