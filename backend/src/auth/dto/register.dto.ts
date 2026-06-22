import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'john.doe@timezone-wll.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'P@ssw0rd!',
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
  password: string;

  @ApiPropertyOptional({ enum: Role, default: Role.STAFF })
  @IsOptional()
  @IsEnum(Role)
  role?: Role = Role.STAFF;
}
