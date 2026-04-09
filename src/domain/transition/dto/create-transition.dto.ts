import { Type } from 'class-transformer';
import { IsDate, IsDefined, IsOptional, IsString } from 'class-validator';
export class CreateTransitionDto {
  @IsString()
  @IsDefined()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  fromAccountId?: string;

  @IsString()
  @IsOptional()
  toAccountId?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsDefined()
  amount!: string;

  @IsString()
  @IsOptional()
  description?: null;

  @IsDate()
  @Type(() => Date)
  @IsDefined()
  date!: Date;
}
