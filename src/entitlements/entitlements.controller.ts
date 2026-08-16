import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import type { EntitlementsView } from '@falina/shared';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UsersService } from '../users/users.service';
import { EntitlementsService } from './entitlements.service';

class UpgradeDto {
  @ApiPropertyOptional({ example: 'falina_premium_monthly' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  productId?: string;
}

@ApiTags('entitlements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class EntitlementsController {
  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly users: UsersService,
  ) {}

  @Get('entitlements')
  @ApiOperation({
    summary: 'Return the caller’s tier, entitlements and today’s usage',
  })
  async get(@CurrentUser() user: { userId: string }): Promise<EntitlementsView> {
    const record = await this.users.findById(user.userId);
    return this.entitlements.viewFor(record!);
  }

  @Post('subscriptions/upgrade')
  @ApiOperation({
    summary: 'Self-serve Premium upgrade (store-webhook stand-in)',
  })
  async upgrade(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpgradeDto,
  ): Promise<EntitlementsView> {
    const record = await this.users.findById(user.userId);
    return this.entitlements.upgrade(record!, dto.productId ?? '');
  }
}
