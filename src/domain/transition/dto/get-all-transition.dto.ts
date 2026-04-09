import {
  IsOptional,
  IsString,
  IsNumber,
  IsObject,
  IsDefined,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class PagingDto {
  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;
}

class FilterDateDto {
  @IsDefined()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  between!: string[];
}

class FilterDto {
  @IsOptional()
  @IsString()
  fromAccountId?: string;

  @IsOptional()
  @IsString()
  toAccountId?: string;

  @IsString()
  categoryId!: string;

  @IsDefined()
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @Type(() => FilterDateDto)
  date!: FilterDateDto;
}

export class FindTransitionsDto {
  @IsOptional()
  @IsObject()
  @Type(() => PagingDto)
  paging?: PagingDto;

  @IsOptional()
  @IsObject()
  sorting?: Record<string, any>;

  @IsOptional()
  @Type(() => FilterDto)
  filter!: FilterDto;

  @IsOptional()
  @IsString()
  search?: string;
}
