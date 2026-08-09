import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { FalinaLogger } from './logger/falina-logger';
import { RequestIdMiddleware } from './logger/request-id.middleware';

/**
 * Cross-cutting HTTP infrastructure: structured logging, request ids,
 * request logging and the global exception filter.
 */
@Module({
  providers: [
    FalinaLogger,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
  exports: [FalinaLogger],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
