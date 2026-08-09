/**
 * AI provider abstraction.
 *
 * All Falina AI calls go through an `AiProvider`. Adapters (OpenAI, Gemini,
 * Anthropic, Ollama, local models) are selected by configuration — business
 * logic never talks to a specific vendor directly.
 */

/** Minimal JSON-schema shape used to constrain structured outputs. */
export interface JsonSchema {
  type?: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'integer';
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  description?: string;
  [key: string]: unknown;
}

export interface GenerateTextParams {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateStructuredParams {
  prompt: string;
  schema: JsonSchema;
  system?: string;
}

export interface AnalyzeImageParams {
  /** Image bytes (post validation/compression) and its MIME type. */
  image: { data: Buffer; mime: string };
  prompt: string;
}

export interface AiProvider {
  readonly name: string;
  generateText(params: GenerateTextParams): Promise<string>;
  generateStructured<T = unknown>(params: GenerateStructuredParams): Promise<T>;
  analyzeImage(params: AnalyzeImageParams): Promise<unknown>;
}

/** Injection token for the configured provider. */
export const AI_PROVIDER_TOKEN = 'AI_PROVIDER_TOKEN';
