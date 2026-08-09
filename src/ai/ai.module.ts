import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_PROVIDER_TOKEN, AiProvider } from './ai-provider.interface';
import { MockAiProvider } from './providers/mock-ai.provider';

/**
 * Wires the configured `AiProvider` behind `AI_PROVIDER_TOKEN`.
 *
 * Supported values today:
 * - `mock` (default) — deterministic offline responses.
 *
 * Vendor adapters (openai | gemini | anthropic | ollama) are added in later
 * phases; an unknown value throws at startup so misconfiguration is loud.
 */
@Module({
  providers: [
    MockAiProvider,
    {
      provide: AI_PROVIDER_TOKEN,
      inject: [ConfigService, MockAiProvider],
      useFactory: (config: ConfigService, mock: MockAiProvider): AiProvider => {
        const name = config.get<string>('AI_PROVIDER', 'mock').toLowerCase();
        if (name === 'mock') {
          return mock;
        }
        throw new Error(`AI_PROVIDER '${name}' is not wired yet. Available providers: mock.`);
      },
    },
  ],
  exports: [AI_PROVIDER_TOKEN],
})
export class AiModule {}
