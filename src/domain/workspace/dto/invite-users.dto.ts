import { ArrayMinSize, IsEmail } from 'class-validator';

export class InviteUsersDto {
  @IsEmail({}, { each: true })
  @ArrayMinSize(1)
  emails!: string[];
}
