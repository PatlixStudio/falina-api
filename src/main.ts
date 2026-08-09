import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

/**
 * Falina API bootstrap.
 *
 * - Global prefix `/api/v1` (health routes are excluded so they stay at `/health`).
 * - Swagger UI at `/api/docs`.
 * - Global DTO validation and CORS for the Angular dev server.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: 0 },
      { path: 'health/ready', method: 0 },
    ],
  });

  app.enableCors({ origin: true, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('falina-api')
    .setDescription('Falina — Your Personal Oracle. Coffee, Tarot, Astrology.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT ?? 3002);
  await app.listen(port);
  Logger.log(`Falina API running on http://localhost:${port}/api/v1`, 'Bootstrap');
  Logger.log(`Health check at http://localhost:${port}/health`, 'Bootstrap');
  Logger.log(`Swagger docs on http://localhost:${port}/api/docs`, 'Bootstrap');
}

void bootstrap();
