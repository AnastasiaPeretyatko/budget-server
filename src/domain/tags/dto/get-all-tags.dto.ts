import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { TagSort } from '../types';

export class GetAllTagsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsUUID()
  @IsOptional()
  periodId?: string;

  @IsEnum(TagSort)
  @IsOptional()
  sort?: TagSort;
}
