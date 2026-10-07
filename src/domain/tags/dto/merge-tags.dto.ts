import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class MergeTagsDto {
  @IsUUID('all', { each: true })
  @ArrayUnique()
  @ArrayNotEmpty()
  @IsArray()
  sourceIds!: string[];

  @IsUUID()
  targetId!: string;
}
