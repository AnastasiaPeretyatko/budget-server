import {
  IsOptional,
  IsString,
  IsNumber,
  IsObject,
  IsArray,
  IsEnum,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '../transition.entity';

class PagingDto {
  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;
}

class FilterDateDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  between!: string[];
}

class FilterDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  fromAccountId?: string;

  @IsOptional()
  @IsString()
  toAccountId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Type(() => FilterDateDto)
  date?: FilterDateDto;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;
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
