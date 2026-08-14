import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ASTROLOGY_FOCUSES,
  READING_TYPES,
  type AstrologyFocus,
  type ReadingType,
} from '@falina/shared';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BirthDto {
  @ApiProperty({ example: '1991-04-12' })
  @IsString()
  @MaxLength(10)
  birthDate: string;

  @ApiPropertyOptional({ example: '14:30', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  birthTime?: string | null;

  @ApiPropertyOptional({ example: 'Lisbon, Portugal', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  birthLocation?: string | null;
}

export class TarotCardDto {
  @ApiProperty({ example: 'major-12' })
  @IsString()
  @MaxLength(32)
  cardId: string;

  @ApiPropertyOptional({ enum: ['UPRIGHT', 'REVERSED'], example: 'UPRIGHT' })
  @IsOptional()
  @IsIn(['UPRIGHT', 'REVERSED'])
  orientation?: 'UPRIGHT' | 'REVERSED';
}

export class CreateReadingDto {
  @ApiProperty({ enum: READING_TYPES, example: 'TAROT' })
  @IsIn(READING_TYPES)
  type: ReadingType;

  @ApiPropertyOptional({ example: 'LOVE' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  intent?: string;

  @ApiPropertyOptional({ example: 'three-past-present-future' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  spreadCode?: string;

  @ApiPropertyOptional({ example: ['heart', 'road'], maxItems: 3 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MaxLength(32, { each: true })
  symbols?: string[];

  @ApiPropertyOptional({ enum: ASTROLOGY_FOCUSES, example: 'ALL' })
  @IsOptional()
  @IsIn(ASTROLOGY_FOCUSES)
  focus?: AstrologyFocus;

  @ApiPropertyOptional({ type: BirthDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BirthDto)
  birth?: BirthDto;

  @ApiPropertyOptional({ example: 'Should I take the new role?', maxLength: 240 })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  question?: string;

  @ApiPropertyOptional({ type: TarotCardDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => TarotCardDto)
  cards?: TarotCardDto[];

  @ApiPropertyOptional({
    description: 'Compressed coffee-cup photo as a data URL (coffee readings).',
    example: 'data:image/jpeg;base64,…',
  })
  @IsOptional()
  @IsString()
  @MaxLength(6_000_000)
  imageDataUrl?: string;

  @ApiPropertyOptional({ description: 'Structured vision output from /coffee/analyze.' })
  @IsOptional()
  @IsObject()
  vision?: Record<string, unknown>;
}
