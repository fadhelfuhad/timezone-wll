import { IsString, MinLength, Matches, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'The user\'s current password' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    example: 'N3w@Passw0rd',
    minLength: 8,
    description:
      'Must contain at least one uppercase letter, one lowercase letter, one digit, and one special character',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword: string;
}
