import { describe, it, expect } from 'vitest';
import { KittyApcParser } from '../parser';

describe('KittyApcParser', () => {
  it('parses a single complete APC command with ST terminator', () => {
    const parser = new KittyApcParser();
    const input = 'Hello\x1b_Ga=d,d=a;\x1b\\World';
    const res = parser.parse(input);

    expect(res.cleanText).toBe('HelloWorld');
    expect(res.commands.length).toBe(1);
    expect(res.commands[0].keys.a).toBe('d');
    expect(res.commands[0].keys.d).toBe('a');
  });

  it('parses APC command with BEL terminator', () => {
    const parser = new KittyApcParser();
    const input = 'Prefix\x1b_Gi=42,a=q;\x07Suffix';
    const res = parser.parse(input);

    expect(res.cleanText).toBe('PrefixSuffix');
    expect(res.commands.length).toBe(1);
    expect(res.commands[0].keys.i).toBe(42);
    expect(res.commands[0].keys.a).toBe('q');
  });

  it('reassembles chunked payloads (m=1 and m=0)', () => {
    const parser = new KittyApcParser();
    const chunk1 = '\x1b_Ga=T,f=100,m=1;QUJD\x1b\\';
    const chunk2 = '\x1b_Gm=0;REVG\x1b\\';

    const res1 = parser.parse(chunk1);
    expect(res1.commands.length).toBe(0); // Pending chunk

    const res2 = parser.parse(chunk2);
    expect(res2.commands.length).toBe(1); // Finalized
    expect(res2.commands[0].keys.a).toBe('T');
    expect(res2.commands[0].keys.f).toBe(100);
    expect(res2.commands[0].payload).toBe('QUJDREVG');
  });

  it('buffers incomplete APC initiators across chunks', () => {
    const parser = new KittyApcParser();
    const part1 = 'Some text\x1b_';
    const part2 = 'Ga=d;\x1b\\Done';

    const res1 = parser.parse(part1);
    expect(res1.cleanText).toBe('Some text');
    expect(res1.commands.length).toBe(0);

    const res2 = parser.parse(part2);
    expect(res2.cleanText).toBe('Done');
    expect(res2.commands.length).toBe(1);
    expect(res2.commands[0].keys.a).toBe('d');
  });

  it('drops chunks that exceed max payload limit', () => {
    const parser = new KittyApcParser(4); // 4MB limit
    // Create a 5MB payload
    const hugePayload = 'A'.repeat(5 * 1024 * 1024);
    const input = `\x1b_Ga=T,m=0;${hugePayload}\x1b\\`;

    const res = parser.parse(input);
    expect(res.commands.length).toBe(0); // Exceeded payload, discarded
  });
});
