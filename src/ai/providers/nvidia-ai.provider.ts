import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiProvider,
  AnalyzeImageParams,
  GenerateStructuredParams,
  GenerateTextParams,
} from '../ai-provider.interface';

export const DEFAULT_NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
export const DEFAULT_NVIDIA_MODEL = 'meta/llama-3.3-70b-instruct';
export const DEFAULT_NVIDIA_VISION_MODEL = 'meta/llama-4-maverick';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<Record<string, unknown>>;
}

/**
 * NVIDIA NIM (build.nvidia.com) via its OpenAI-compatible endpoint.
 *
 * Reads `NVIDIA_API_KEY` (falls back to `AI_API_KEY`), `NVIDIA_BASE_URL`
 * (defaults to `https://integrate.api.nvidia.com/v1`) and the model from
 * `AI_MODEL` (defaults to `meta/llama-3.3-70b-instruct`).
 */
@Injectable()
export class NvidiaAiProvider implements AiProvider {
  readonly name = 'nvidia';

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly visionModel: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('NVIDIA_API_KEY', '') || config.get<string>('AI_API_KEY', '');
    this.baseUrl = (config.get<string>('NVIDIA_BASE_URL', '') || DEFAULT_NVIDIA_BASE_URL).replace(
      /\/+$/,
      '',
    );
    this.model = config.get<string>('AI_MODEL', '') || DEFAULT_NVIDIA_MODEL;
    this.visionModel = config.get<string>('AI_VISION_MODEL', '') || DEFAULT_NVIDIA_VISION_MODEL;

    if (!this.apiKey) {
      throw new Error(
        'NVIDIA_API_KEY is not set. Set NVIDIA_API_KEY (or AI_API_KEY) to use the NVIDIA tarot engine.',
      );
    }
  }

  async generateText(params: GenerateTextParams): Promise<string> {
    const body = {
      model: this.model,
      messages: this.messages(params.system, params.prompt),
      temperature: params.temperature ?? 0.9,
      max_tokens: params.maxTokens ?? 1200,
    };
    return this.chat(body);
  }

  async generateStructured<T = unknown>(params: GenerateStructuredParams): Promise<T> {
    const prompt = `${params.prompt}\n\nRespond with a single JSON object only. No prose, no fences.`;
    const body = {
      model: this.model,
      messages: this.messages(params.system, prompt),
      temperature: 0.4,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    };
    const text = await this.chat(body);
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    return JSON.parse(cleaned) as T;
  }

  async analyzeImage(params: AnalyzeImageParams): Promise<unknown> {
    const { data, mime } = params.image;
    const dataUrl = `data:${mime};base64,${data.toString('base64')}`;
    const body = {
      model: this.visionModel,
      messages: [
        {
          role: 'user' as const,
          content: [
            { type: 'text', text: params.prompt },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 900,
    };
    const text = await this.chat(body);
    try {
      const parsed = JSON.parse(extractJson(text) ?? '{}') as unknown;
      return typeof parsed === 'object' && parsed !== null ? parsed : { text };
    } catch {
      // The vision model talked in prose — still hand the observations back.
      return { text };
    }
  }

  private messages(system?: string, prompt?: string): ChatMessage[] {
    const messages: ChatMessage[] = [];
    if (system) {
      messages.push({ role: 'system', content: system });
    }
    messages.push({ role: 'user', content: prompt ?? '' });
    return messages;
  }

  private async chat(body: Record<string, unknown>, retries = 2): Promise<string> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(90_000),
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          if ((res.status === 429 || res.status >= 500) && attempt < retries) {
            await this.sleep(1500 * (attempt + 1));
            continue;
          }
          throw new Error(`NVIDIA API error ${res.status}: ${detail.slice(0, 300)}`);
        }

        const json = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = json.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error('NVIDIA API returned no content.');
        }
        return content;
      } catch (error) {
        lastError = error;
        const isTimeout =
          (error as { name?: string }).name === 'TimeoutError' ||
          (error as { code?: string }).code === 'ETIMEDOUT';
        if (
          (isTimeout || (error as { code?: string }).code === 'ECONNRESET') &&
          attempt < retries
        ) {
          await this.sleep(1500 * (attempt + 1));
          continue;
        }
        throw error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('NVIDIA API call failed.');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/** Locates the first balanced `{…}` object in a model reply. */
function extractJson(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) {
    return null;
  }
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}
