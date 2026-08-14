import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class AnalyzeCoffeeDto {
  @ApiProperty({
    description: 'Coffee-cup photo as a base64 data URL.',
    example: 'data:image/jpeg;base64,…',
  })
  @IsString()
  @MaxLength(6_000_000)
  imageDataUrl: string;
}
