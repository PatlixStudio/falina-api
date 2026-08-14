import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Page } from '@falina/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { UsersService } from '../users/users.service';
import { AnalyzeCoffeeDto } from './analyze-coffee.dto';
import { CoffeeAnalyzeService, CoffeeAnalyzeResult } from './coffee-analyze.service';
import { CreateReadingDto } from './create-reading.dto';
import { ReadingsService } from './readings.service';
import type { Reading } from '@falina/shared';

@ApiTags('readings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('readings')
export class ReadingsController {
  constructor(
    private readonly readings: ReadingsService,
    private readonly entitlements: EntitlementsService,
    private readonly users: UsersService,
    private readonly coffeeAnalyze: CoffeeAnalyzeService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Generate and persist a new reading' })
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateReadingDto,
  ): Promise<Reading> {
    const record = await this.users.findById(user.userId);
    await this.entitlements.assertQuota(record!, dto.type);
    return this.readings.createForUser(user.userId, dto);
  }

  @Post('coffee/analyze')
  @ApiOperation({
    summary: 'Analyze a coffee-cup photo and return detected symbols',
  })
  async analyzeCoffee(@Body() dto: AnalyzeCoffeeDto): Promise<CoffeeAnalyzeResult> {
    return this.coffeeAnalyze.analyze(dto.imageDataUrl);
  }

  @Get()
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiOperation({ summary: 'List the caller’s readings, newest first' })
  async list(
    @CurrentUser() user: { userId: string },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ): Promise<Page<Reading>> {
    return this.readings.listForUser(
      user.userId,
      Math.max(1, Number(page) || 1),
      Math.min(50, Math.max(1, Number(pageSize) || 20)),
    );
  }

  @Get(':id')
  @ApiParam({ name: 'id', example: 'b6a3…' })
  @ApiOperation({ summary: 'Fetch one of the caller’s readings' })
  async getOne(@CurrentUser() user: { userId: string }, @Param('id') id: string): Promise<Reading> {
    const reading = await this.readings.findOwnedById(user.userId, id);
    if (!reading) {
      throw new HttpException('Reading not found', HttpStatus.NOT_FOUND);
    }
    return reading;
  }
}
