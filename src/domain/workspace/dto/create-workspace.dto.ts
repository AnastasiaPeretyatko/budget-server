import { IsString } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  title!: string;
}
