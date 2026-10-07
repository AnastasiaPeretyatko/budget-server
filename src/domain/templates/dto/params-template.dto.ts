import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { TransactionType } from 'src/domain/transition/transition.entity';

// В query один элемент приходит строкой, а не массивом
const toArray = ({ value }: { value: unknown }): unknown[] =>
  Array.isArray(value) ? (value as unknown[]) : [value];

export class ParamsTemplateTemplatesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  limit: number = 10;

  @IsOptional()
  @IsString()
  order: 'DESC' | 'ASC' = 'DESC';

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  page: number = 1;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  // Шаблоны с любой из этих категорий
  @IsOptional()
  @Transform(toArray)
  @IsUUID('all', { each: true })
  @ArrayUnique()
  @IsArray()
  categoryIds?: string[];

  // Шаблоны, у которых есть любой из этих тегов
  @IsOptional()
  @Transform(toArray)
  @IsUUID('all', { each: true })
  @ArrayUnique()
  @IsArray()
  tagIds?: string[];
}
