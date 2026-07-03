import { ArrayMinSize, IsEmail, IsString } from 'class-validator';

export class InviteUsersDto {
  @IsString()
  workspaceId!: string;

  @IsEmail({}, { each: true })
  @ArrayMinSize(1)
  emails!: string[];
}
