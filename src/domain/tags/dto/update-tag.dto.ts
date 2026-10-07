import { Transform } from 'class-transformer';
import { IsHexColor, IsOptional, IsString, Matches } from 'class-validator';
import { normalizeTagName, TAG_NAME_REGEX } from '../utils/tag-name';

export class UpdateTagDto {
  @Transform(({ value }: { value: unknown }) => normalizeTagName(value))
  @Matches(TAG_NAME_REGEX, {
    message:
      'name must be 1-32 characters: letters, digits, "_" or "-" (spaces become "_")',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @IsHexColor()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color must be in #RRGGBB format' })
  @IsOptional()
  color?: string;
}
