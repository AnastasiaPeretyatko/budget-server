import { IsOptional, IsString, IsNumber, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class PagingDto {
  @IsOptional()
  @IsNumber()
  limit?: number;
}

class FilterDto {
  @IsOptional()
  @IsString()
  fromAccountId?: string;

  @IsOptional()
  @IsString()
  toAccountId?: string;

  @IsString()
  categoryId: string;
}

export class FindTransitionsDto {
  @IsOptional()
  @IsObject()
  @Type(() => PagingDto)
  paging: PagingDto;

  @IsOptional()
  @IsObject()
  sorting?: Record<string, any>;

  @IsOptional()
  @Type(() => FilterDto)
  filter?: FilterDto;

  @IsOptional()
  @IsString()
  search?: string;
}
