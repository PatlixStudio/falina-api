import { JsonSchema } from '../ai-provider.interface';
import { MockAiProvider } from './mock-ai.provider';

describe('MockAiProvider', () => {
  const provider = new MockAiProvider();

  it('is deterministic for text generation', async () => {
    const first = await provider.generateText({ prompt: 'is there a road ahead?' });
    const second = await provider.generateText({ prompt: 'is there a road ahead?' });
    expect(first).toBe(second);
  });

  it('produces schema-shaped structured output', async () => {
    const schema: JsonSchema = {
      type: 'object',
      required: ['ok'],
      properties: {
        ok: { type: 'boolean' },
        symbol: { type: 'string', enum: ['road', 'bird'] },
      },
    };
    const out = await provider.generateStructured<{ ok: boolean; symbol: string }>({
      prompt: 'analyze',
      schema,
    });
    expect(out).toEqual({ ok: true, symbol: 'road' });
  });

  it('returns the coffee vision shape from analyzeImage', async () => {
    const out = await provider.analyzeImage({
      image: { data: Buffer.from('fake'), mime: 'image/jpeg' },
      prompt: 'describe the cup',
    });
    expect(out).toMatchObject({
      observations: expect.any(Array) as unknown,
      patternDensity: expect.any(Object) as unknown,
    });
  });
});
