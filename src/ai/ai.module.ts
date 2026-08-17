import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_PROVIDER_TOKEN, AiProvider } from './ai-provider.interface';
import { MockAiProvider } from './providers/mock-ai.provider';
import { NvidiaAiProvider } from './providers/nvidia-ai.provider';

/**
 * Wires the configured `AiProvider` behind `AI_PROVIDER_TOKEN`.
 *
 * Supported values today:
 * - `mock` (default) — deterministic offline responses for dev/tests/CI.
 * - `nvidia` — NVIDIA NIM (build.nvidia.com), the real tarot oracle.
 *
 * An unknown value throws at startup so misconfiguration is loud.
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
        if (name === 'nvidia') {
          return new NvidiaAiProvider(config);
        }
        throw new Error(
          `AI_PROVIDER '${name}' is not wired yet. Available providers: mock, nvidia.`,
        );
      },
    },
  ],
  exports: [AI_PROVIDER_TOKEN],
})
export class AiModule {}
