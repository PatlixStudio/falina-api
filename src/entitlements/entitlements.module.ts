import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reading } from '../readings/reading.entity';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { EntitlementsController } from './entitlements.controller';
import { EntitlementsService } from './entitlements.service';

@Module({
  imports: [TypeOrmModule.forFeature([Reading, User]), UsersModule],
  controllers: [EntitlementsController],
  providers: [EntitlementsService],
  exports: [EntitlementsService],
})
export class EntitlementsModule {}
