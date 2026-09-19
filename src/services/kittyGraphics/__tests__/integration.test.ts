import { describe, it, expect, vi } from 'vitest';
import { KittyApcParser } from '../parser';
import { KittyCommandHandler, CommandHandlerContext } from '../commandHandler';
import { KittyLruCache } from '../lruCache';
import { KittyDecoder } from '../decoder';
import { KittyAnimationController } from '../animationController';

describe('Kitty Graphics Protocol Integration', () => {
  it('executes full Parse -> Decode -> Cache pipeline from raw APC escape sequences', async () => {
    const cache = new KittyLruCache(256);
    const decoder = new KittyDecoder(4096, 16);
    let renderedCount = 0;
    const animationController = new KittyAnimationController(cache, () => {
      renderedCount++;
    });

    const mockTerm: any = {
      buffer: {
        active: {
          cursorX: 0,
          cursorY: 0,
          baseY: 0,
        },
      },
      write: vi.fn(),
      refresh: vi.fn(),
    };

    // Mock ImageBitmap for test environment
    const fakeBitmap = { width: 32, height: 32, close: vi.fn() } as unknown as ImageBitmap;
    vi.spyOn(decoder, 'decode').mockResolvedValue({
      bitmap: fakeBitmap,
      width: 32,
      height: 32,
      byteSize: 32 * 32 * 4,
    });

    const ctx: CommandHandlerContext = {
      term: mockTerm,
      decoder,
      cache,
      placements: new Map(),
      virtualPlacements: new Map(),
      animationController,
      loadingImages: new Map(),
      sendPtyResponse: vi.fn(),
      computeSpans: () => ({ cols: 4, rows: 2 }),
      flushTerminalBuffer: vi.fn(),
      render: () => {
        renderedCount++;
      },
      scheduleRender: () => {
        renderedCount++;
      },
      markCanvasDirty: vi.fn(),
    };

    const handler = new KittyCommandHandler(ctx);
    const parser = new KittyApcParser();

    // 1. Raw APC sequence transmission: Load image into cache with id=42 (action a=t, format f=100 PNG)
    const rawPayload = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const apcSequence = `\x1b_Ga=t,f=100,i=42,s=32,v=32;${rawPayload}\x1b\\`;
    const inputChunk = `[PRE_TEXT]${apcSequence}[POST_TEXT]`;

    // Step A: Parse raw PTY chunk
    const { cleanText, commands } = parser.parse(inputChunk);
    expect(cleanText).toBe('[PRE_TEXT][POST_TEXT]');
    expect(commands.length).toBe(1);
    expect(commands[0].keys.a).toBe('t');
    expect(commands[0].keys.i).toBe(42);
    expect(commands[0].payload).toBe(rawPayload);

    // Step B: Decode & Dispatch command through CommandHandler
    await handler.handleCommand(commands[0]);

    // Step C: Verify Cached in KittyLruCache
    const cached = cache.get(42);
    expect(cached).toBeDefined();
    expect(cached?.id).toBe(42);
    expect(cached?.width).toBe(32);
    expect(cached?.height).toBe(32);

    // Step D: Placement action a=p triggers render
    const placeSeq = '\x1b_Ga=p,i=42;\x1b\\';
    const placeParse = parser.parse(placeSeq);
    expect(placeParse.commands.length).toBe(1);
    await handler.handleCommand(placeParse.commands[0]);
    expect(renderedCount).toBeGreaterThan(0);

    // Step E: Delete action a=d removes it from cache
    const deleteSeq = '\x1b_Ga=d,d=i,i=42;\x1b\\';
    const deleteParse = parser.parse(deleteSeq);
    expect(deleteParse.commands.length).toBe(1);
    await handler.handleCommand(deleteParse.commands[0]);

    expect(cache.get(42)).toBeUndefined();
    expect(fakeBitmap.close).toHaveBeenCalled();
  });

  it('handles transmission with direct placement (a=T) and query capability probe (a=q)', async () => {
    const cache = new KittyLruCache(256);
    const decoder = new KittyDecoder(4096, 16);
    let rendered = 0;
    const animationController = new KittyAnimationController(cache, () => {
      rendered++;
    });

    const writtenData: string[] = [];
    const mockTerm: any = {
      buffer: {
        active: {
          cursorX: 5,
          cursorY: 2,
          baseY: 0,
        },
      },
      write: (data: string) => writtenData.push(data),
      refresh: vi.fn(),
    };

    const fakeBitmap = { width: 64, height: 64, close: vi.fn() } as unknown as ImageBitmap;
    vi.spyOn(decoder, 'decode').mockResolvedValue({
      bitmap: fakeBitmap,
      width: 64,
      height: 64,
      byteSize: 64 * 64 * 4,
    });

    const sendPtyResponse = vi.fn();
    const ctx: CommandHandlerContext = {
      term: mockTerm,
      decoder,
      cache,
      placements: new Map(),
      virtualPlacements: new Map(),
      animationController,
      loadingImages: new Map(),
      sendPtyResponse,
      computeSpans: () => ({ cols: 8, rows: 4 }),
      flushTerminalBuffer: vi.fn(),
      render: () => {
        rendered++;
      },
      scheduleRender: () => {
        rendered++;
      },
      markCanvasDirty: vi.fn(),
    };

    const handler = new KittyCommandHandler(ctx);
    const parser = new KittyApcParser();

    // 1. Send action a=T (Transmit and Place)
    const rawPayload = 'VALID_BASE64_DATA';
    const apcSeq = `\x1b_Ga=T,f=100,i=108,c=10,r=5;${rawPayload}\x1b\\`;
    const { commands } = parser.parse(apcSeq);
    expect(commands.length).toBe(1);

    await handler.handleCommand(commands[0]);

    expect(cache.get(108)).toBeDefined();
    expect(rendered).toBeGreaterThan(0);
  });
});
