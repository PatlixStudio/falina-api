import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { UsersModule } from '../users/users.module';
import { CoffeeAnalyzeService } from './coffee-analyze.service';
import { Reading } from './reading.entity';
import { ReadingsController } from './readings.controller';
import { ReadingsService } from './readings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Reading]), AiModule, EntitlementsModule, UsersModule],
  controllers: [ReadingsController],
  providers: [ReadingsService, CoffeeAnalyzeService],
})
export class ReadingsModule {}
