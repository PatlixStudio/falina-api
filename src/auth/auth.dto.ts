import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Ayla', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  displayName?: string;

  @ApiProperty({ example: 'ayla@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'hunter2-hunter2', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'ayla@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
