import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TAROT_CARDS,
  TAROT_SPREADS,
  findCoffeeSymbol,
  findSpread,
  findTarotCard,
  findTarotMeaning,
  humanizeCode,
  type BirthInfo,
  type CoffeeVisionResult,
  type Reading,
  type ReadingContent,
  type ReadingMetadata,
  type SelectedTarotCard,
  type TarotCardDef,
  type TarotDrawnCard,
} from '@falina/shared';
import { AI_PROVIDER_TOKEN, type AiProvider } from '../ai/ai-provider.interface';
import { CreateReadingDto } from './create-reading.dto';
import { Reading as ReadingEntity } from './reading.entity';

/** Voice of the Falina oracle. Kept separate so the narrative stays mystical. */
const ORACLE_SYSTEM_PROMPT = [
  'You are the Falina Oracle — a tarot reader of rare warmth, depth and imagination.',
  'You read like a trusted guide speaking in candlelight: rich, flowing, evocative prose;',
  'no markdown, no bullet points, no clinical or stiff language.',
  'You always speak directly to the querent as "you", never as "the querent".',
  'You are honest, perceptive and gently mystical — you never bluff, never pad with vague filler,',
  'and every sentence earns its place.',
].join(' ');

/**
 * Owns reading creation and retrieval. The server draws cards, resolves the
 * user's birth sign, and orchestrates the AI narrative — the client never
 * picks random outcomes itself.
 */
@Injectable()
export class ReadingsService {
  private readonly logger = new Logger('ReadingsService');

  constructor(
    @InjectRepository(ReadingEntity)
    private readonly readings: Repository<ReadingEntity>,
    @Inject(AI_PROVIDER_TOKEN)
    private readonly ai: AiProvider,
  ) {}

  async createForUser(userId: string, dto: CreateReadingDto): Promise<Reading> {
    const generated = await this.generate(userId, dto);
    const entity = this.readings.create({
      userId,
      type: dto.type,
      status: 'COMPLETED',
      title: generated.title,
      summary: generated.summary,
      content: generated.content,
      metadata: generated.metadata,
    });
    return this.toReading(await this.readings.save(entity));
  }

  async listForUser(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: Reading[]; page: number; pageSize: number; total: number }> {
    const [rows, total] = await this.readings.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items: rows.map((r) => this.toReading(r)), page, pageSize, total };
  }

  findOwnedById(userId: string, id: string): Promise<Reading | null> {
    return this.readings
      .findOne({ where: { id, userId } })
      .then((r) => (r ? this.toReading(r) : null));
  }

  private async generate(
    userId: string,
    dto: CreateReadingDto,
  ): Promise<{
    title: string;
    summary: string;
    content: ReadingContent;
    metadata: ReadingMetadata;
  }> {
    switch (dto.type) {
      case 'TAROT':
        return this.generateTarot(dto);
      case 'COFFEE':
        return this.generateCoffee(dto);
      case 'ASTROLOGY':
        return this.generateAstrology(dto);
      default:
        return this.generateTarot(dto);
    }
  }

  private async generateTarot(dto: CreateReadingDto): Promise<{
    title: string;
    summary: string;
    content: ReadingContent;
    metadata: ReadingMetadata;
  }> {
    const spread = findSpread(dto.spreadCode ?? 'one-card') ?? TAROT_SPREADS[0];
    const intent = dto.intent ?? 'GENERAL';
    const spreadName = humanizeCode(spread.code);

    const cards = this.resolveTarotCards(spread.cardCount, dto.cards ?? []).map<TarotDrawnCard>(
      (card, index) => ({
        positionKey: spread.positions[index],
        label: humanizeCode(spread.positions[index]),
        order: index + 1,
        orientation: card.orientation,
        cardId: card.def.id,
        cardName: card.def.name,
        arcana: card.def.arcana,
        suit: card.def.suit,
      }),
    );

    const oracle = await this.oracleTarotReading(cards, intent, spreadName, dto.question);

    return {
      title: `${spreadName} · ${humanizeCode(intent)}`,
      summary: cards.map((c) => c.cardName).join(' · '),
      content: { narrative: oracle.narrative, sections: oracle.sections },
      metadata: {
        intent,
        spreadCode: spread.code,
        spreadName,
        cards,
      },
    };
  }

  /**
   * The tarot reading engine. Asks the LLM oracle for a full mystical reading
   * (opening weave, one paragraph per card, closing summary) and parses the
   * tagged reply into narrative + sections. If the oracle is unreachable or
   * returns malformed output it falls back to a deterministic local reading so
   * the reader is never left empty-handed.
   */
  private async oracleTarotReading(
    cards: TarotDrawnCard[],
    intent: string,
    spreadName: string,
    question?: string,
  ): Promise<{ narrative: string; sections: Array<{ heading: string; body: string }> }> {
    const fallbackSections = cards.map((card) => ({
      heading: `${card.label} — ${card.cardName}`,
      body: this.tarotBody(card, intent, spreadName, question),
    }));
    const fallback: { narrative: string; sections: typeof fallbackSections } = {
      narrative: this.fallbackNarrative(cards, intent),
      sections: fallbackSections,
    };

    try {
      const text = await this.ai.generateText({
        system: ORACLE_SYSTEM_PROMPT,
        prompt: this.oracleTarotPrompt(cards, intent, spreadName, question),
        temperature: 0.85,
        maxTokens: 2000,
      });
      const parsed = this.parseOracleReading(text);
      return {
        narrative: parsed.narrative || fallback.narrative,
        sections: parsed.sections.length ? parsed.sections : fallback.sections,
      };
    } catch (error) {
      this.logger.warn(`Oracle unreachable, using fallback reading: ${(error as Error).message}`);
      return fallback;
    }
  }

  private parseOracleReading(text: string): {
    narrative: string;
    sections: Array<{ heading: string; body: string }>;
  } {
    const grab = (tag: string): string => {
      const match = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return match ? match[1].trim() : '';
    };

    let narrative = grab('reading');
    const summary = grab('summary');
    const sections: Array<{ heading: string; body: string }> = [];

    const blocks = text.split(/<card>/i).slice(1);
    for (const block of blocks) {
      const close = block.indexOf('</card>');
      if (close === -1) {
        continue;
      }
      const heading = block.slice(0, close).trim();
      const body = block
        .slice(close + '</card>'.length)
        .replace(/<\/?(?:card|reading|summary)>/gi, '')
        .trim();
      if (heading && body) {
        sections.push({ heading, body });
      }
    }

    // Some voices skip the <reading> tag and simply start speaking — treat any
    // prose before the first <card> as the opening narrative.
    if (!narrative) {
      const firstCard = text.search(/<card>/i);
      if (firstCard > 0) {
        const pre = text.slice(0, firstCard).trim();
        if (pre) {
          narrative = pre;
        }
      }
    }

    // Strip any stray wrapper tags the model echoes back inside the blocks.
    narrative = narrative.replace(/<\/?reading>/gi, '').trim();
    const cleanSummary = summary.replace(/<\/?summary>/gi, '').trim();
    if (cleanSummary) {
      sections.push({ heading: 'The Whole Reading', body: cleanSummary });
    }

    return { narrative, sections };
  }

  private fallbackNarrative(cards: TarotDrawnCard[], intent: string): string {
    const names = cards.map((c) => c.cardName).join(', ');
    return `The cards fall as they must — ${names} — and in their turn they speak of your ${humanizeCode(
      intent,
    ).toLowerCase()}. The oracle's voice is quiet tonight, but the pattern they weave already carries the shape of your answer.`;
  }

  private async generateCoffee(dto: CreateReadingDto): Promise<{
    title: string;
    summary: string;
    content: ReadingContent;
    metadata: ReadingMetadata;
  }> {
    const codes = (dto.symbols ?? []).filter((c) => findCoffeeSymbol(c)).slice(0, 3);
    if (codes.length === 0) {
      codes.push('heart');
    }
    const intent = dto.intent ?? 'GENERAL';
    const symbols = codes.map((code) => ({ code, keywords: findCoffeeSymbol(code)!.keywords }));
    const vision = dto.vision as CoffeeVisionResult | undefined;

    const sections = symbols.map((symbol) => ({
      heading: humanizeCode(symbol.code),
      body: `The ${symbol.code} appears in the grounds — a sign of ${symbol.keywords.join(' and ')}.`,
    }));

    const narrative = await this.ai.generateText({
      system: 'You are the Falina oracle. Answer in warm, vivid, plain language. Keep it brief.',
      prompt: this.coffeePrompt(codes, intent, dto.question, vision),
      temperature: 0.8,
      maxTokens: 400,
    });

    return {
      title: `Coffee reading · ${symbols.map((s) => humanizeCode(s.code)).join(' & ')}`,
      summary: `${humanizeCode(intent)} — ${symbols.map((s) => s.code).join(', ')}`,
      content: { narrative, sections },
      metadata: {
        intent,
        symbols,
        ...(dto.imageDataUrl ? { imageDataUrl: dto.imageDataUrl } : {}),
        ...(vision ? { vision } : {}),
      },
    };
  }

  private async generateAstrology(dto: CreateReadingDto): Promise<{
    title: string;
    summary: string;
    content: ReadingContent;
    metadata: ReadingMetadata;
  }> {
    const focus = dto.focus ?? 'ALL';
    const birth = dto.birth ?? { birthDate: '2000-01-01', birthTime: null, birthLocation: null };
    const birthInfo: BirthInfo = {
      birthDate: birth.birthDate,
      birthTime: birth.birthTime ?? null,
      birthLocation: birth.birthLocation ?? null,
    };
    const signName = zodiacSign(birth.birthDate);

    const sections = [
      {
        heading: `${signName} Sun`,
        body: `Your sun sits in ${signName}, lending its character to everything you touch. ${birthInfo.birthLocation ? `Born in ${birthInfo.birthLocation}, ` : ''}your chart reads clearly under the current skies.`,
      },
      {
        heading: `${humanizeCode(focus)} focus`,
        body: `For ${humanizeCode(focus).toLowerCase()}, the stars favour deliberate steps over hasty ones. Trust the pattern already forming around you.`,
      },
      {
        heading: 'Time & tide',
        body: 'The moon is waxing toward full — intuition runs high, so first impressions carry real weight this week.',
      },
    ];

    const narrative = await this.ai.generateText({
      system: 'You are the Falina oracle. Answer in warm, vivid, plain language. Keep it brief.',
      prompt: this.astrologyPrompt(signName, focus, birthInfo, dto.question),
      temperature: 0.8,
      maxTokens: 400,
    });

    return {
      title: `Astrology reading · ${signName} sun`,
      summary: `${signName} sun · ${humanizeCode(focus)}`,
      content: { narrative, sections },
      metadata: { focus, birth: birthInfo, sunSign: signName, signName },
    };
  }

  private drawCards(
    count: number,
  ): Array<{ def: (typeof TAROT_CARDS)[number]; orientation: 'UPRIGHT' | 'REVERSED' }> {
    const pool = [...TAROT_CARDS];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count).map((def) => ({
      def,
      orientation: Math.random() > 0.5 ? 'REVERSED' : 'UPRIGHT',
    }));
  }

  /**
   * Turns the reader's hand into spread cards. Honours their picks and
   * orientations in order; pads any empty positions with random draws (so a
   * partial hand still yields a complete spread), and never duplicates a card.
   */
  private resolveTarotCards(
    count: number,
    chosen: SelectedTarotCard[],
  ): Array<{ def: TarotCardDef; orientation: 'UPRIGHT' | 'REVERSED' }> {
    const picked = new Map<string, 'UPRIGHT' | 'REVERSED'>();
    for (const c of chosen) {
      const def = findTarotCard(c.cardId);
      if (def && !picked.has(def.id)) {
        picked.set(def.id, c.orientation ?? 'UPRIGHT');
      }
    }

    const hand: Array<{ def: TarotCardDef; orientation: 'UPRIGHT' | 'REVERSED' }> = [...picked].map(
      ([cardId, orientation]) => ({ def: findTarotCard(cardId)!, orientation }),
    );
    if (hand.length >= count) {
      return hand.slice(0, count);
    }

    const pool = [...TAROT_CARDS].filter((c) => !picked.has(c.id));
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const extra = pool.slice(0, count - hand.length).map((def) => ({
      def,
      orientation: Math.random() > 0.5 ? ('REVERSED' as const) : ('UPRIGHT' as const),
    }));
    return [...hand, ...extra];
  }

  private tarotBody(
    card: TarotDrawnCard,
    intent: string,
    spreadName: string,
    question?: string,
  ): string {
    const meaning = findTarotMeaning(card.cardId);
    const sense = card.orientation === 'UPRIGHT' ? meaning?.upright : meaning?.reversed;
    const keywords = meaning?.keywords.length ? ` Keywords: ${meaning.keywords.join(', ')}.` : '';
    const base = `In the ${card.label.toLowerCase()} position, the ${card.cardName} appears ${card.orientation.toLowerCase()}. ${
      sense ?? 'Its meaning stirs quietly beneath the surface.'
    }${keywords}`;
    const focus = question
      ? ` Keep the question — “${question}” — in mind as you sit with it.`
      : ` Let it speak to your ${humanizeCode(intent).toLowerCase()} intentions.`;
    return `${base}${focus}`;
  }

  private oracleTarotPrompt(
    cards: TarotDrawnCard[],
    intent: string,
    spreadName: string,
    question?: string,
  ): string {
    const cardLines = cards
      .map((c) => {
        const meaning = findTarotMeaning(c.cardId);
        const upright = meaning?.upright ?? '';
        const reversed = meaning?.reversed ?? '';
        const keywords = meaning?.keywords?.join(', ') ?? '';
        return (
          `${c.order}. ${c.label} — ${c.cardName} (${c.orientation.toLowerCase()})\n` +
          `   Upright meaning: ${upright}\n` +
          `   Reversed meaning: ${reversed}\n` +
          `   Keywords: ${keywords}`
        );
      })
      .join('\n');

    const focus = question
      ? `The querent carries this question with them: “${question}”`
      : `The querent comes to you seeking guidance on ${humanizeCode(intent).toLowerCase()}`;

    return (
      `A querent sits before you, and the ${spreadName} spread is laid out in the candlelight. ` +
      `${focus}. Their intention: ${humanizeCode(intent).toLowerCase()}.\n\n` +
      `The cards, drawn face-down and turned in order:\n${cardLines}\n\n` +
      `Write the full reading. For each card, speak of what it means in its position — ` +
      `and if it is reversed, name plainly what that reversal shifts. Then close by drawing ` +
      `all three cards together into one whole truth.\n\n` +
      `Structure your reply EXACTLY with these tags, nothing before or after:\n` +
      `<reading>\n[your opening — set the scene and breathe life into the query, then let the reading flow; 2–4 paragraphs]\n</reading>\n` +
      `<card>${cards[0]?.label} — ${cards[0]?.cardName}</card>\n[read this card in its position, in one flowing paragraph]\n` +
      cards
        .slice(1)
        .map(
          (c) =>
            `<card>${c.label} — ${c.cardName}</card>\n[read this card in its position, in one flowing paragraph]`,
        )
        .join('\n') +
      `\n<summary>\n[close by weaving all the cards together — the whole truth of the reading, and what to carry forward]\n</summary>` +
      `\n\nEnd your reply with the <summary>...</summary> block. It is required — do not forget it.`
    );
  }

  private coffeePrompt(
    codes: string[],
    intent: string,
    question?: string,
    vision?: CoffeeVisionResult,
  ): string {
    const q = question ? `\nQuestion: ${question}` : '';
    const seen = vision?.observations?.length
      ? vision.observations
          .map((o) => `${o.symbol} (${o.location}, ~${Math.round((o.confidence ?? 0) * 100)}%)`)
          .join(', ')
      : codes.join(', ');
    return `Coffee-ground reading, intent ${intent}. Symbols seen: ${seen}.${q}\nRead the pattern for the reader.`;
  }

  private astrologyPrompt(
    signName: string,
    focus: string,
    birth: BirthInfo,
    question?: string,
  ): string {
    const q = question ? `\nQuestion: ${question}` : '';
    return `Astrology reading. Sun in ${signName}, focus ${focus}, born ${birth?.birthDate}.${q}\nRead the sky for the reader.`;
  }

  private toReading(entity: ReadingEntity): Reading {
    return {
      id: entity.id,
      userId: entity.userId,
      type: entity.type,
      status: entity.status,
      title: entity.title,
      summary: entity.summary,
      content: entity.content as ReadingContent,
      metadata: entity.metadata as ReadingMetadata,
      isFavorite: entity.isFavorite,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}

const SIGNS: Array<{ name: string; month: number; day: number }> = [
  { name: 'Capricorn', month: 1, day: 19 },
  { name: 'Aquarius', month: 2, day: 18 },
  { name: 'Pisces', month: 3, day: 20 },
  { name: 'Aries', month: 4, day: 19 },
  { name: 'Taurus', month: 5, day: 20 },
  { name: 'Gemini', month: 6, day: 20 },
  { name: 'Cancer', month: 7, day: 22 },
  { name: 'Leo', month: 8, day: 22 },
  { name: 'Virgo', month: 9, day: 22 },
  { name: 'Libra', month: 10, day: 22 },
  { name: 'Scorpio', month: 11, day: 21 },
  { name: 'Sagittarius', month: 12, day: 21 },
];

/** Deterministic sun sign from an ISO date (YYYY-MM-DD). */
export function zodiacSign(date: string): string {
  const parts = date.split('-').map(Number);
  const [month, day] = [parts[1], parts[2]];
  if (!month || !day) {
    return 'Unknown';
  }
  for (const sign of SIGNS) {
    if (month === sign.month ? day <= sign.day : month < sign.month) {
      return sign.name;
    }
  }
  return SIGNS[0].name;
}
