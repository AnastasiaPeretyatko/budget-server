import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsUUID,
} from 'class-validator';

class DateRangeDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsDateString({}, { each: true })
  between!: [string, string];
}

export class StatisticsByCategoryDto {
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @Type(() => DateRangeDto)
  date?: DateRangeDto;
}

export interface CategoryStatisticsItem {
  categoryId: string;
  categoryName: string;
  total: string;
  count: number;
  percent: number;
}

export interface UncategorizedStatistics {
  total: string;
  count: number;
  percent: number;
}

export interface StatisticsByCategoryResponse {
  totalSpent: string;
  items: CategoryStatisticsItem[];
  uncategorized: UncategorizedStatistics | null;
}
