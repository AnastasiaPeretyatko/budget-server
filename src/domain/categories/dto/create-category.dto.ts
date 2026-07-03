import { IsDefined, IsOptional, IsString } from 'class-validator';

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
}
