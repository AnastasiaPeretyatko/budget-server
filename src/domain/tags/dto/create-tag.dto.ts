import { IsDefined, IsString } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @IsDefined()
  name!: string;

  @IsString()
  @IsDefined()
  color!: string;
}
