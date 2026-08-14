import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { EntitlementsModule } from './entitlements/entitlements.module';
import { HealthModule } from './health/health.module';
import { ReadingsModule } from './readings/readings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'falina'),
        password: config.get<string>('DB_PASSWORD', 'falina'),
        database: config.get<string>('DB_NAME', 'falina'),
        // Entities are registered per module (autoLoadEntities). Dev-only sync.
        synchronize: config.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
        autoLoadEntities: true,
      }),
    }),
    HealthModule,
    CommonModule,
    AiModule,
    AuthModule,
    EntitlementsModule,
    ReadingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
