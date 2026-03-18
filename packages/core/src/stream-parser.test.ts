import { describe, it, expect, vi } from 'vitest';
import { Readable } from 'node:stream';
import { StreamJsonParser } from './stream-parser.js';

function makeStream(lines: string[]): Readable {
  return Readable.from(lines.map((l) => l + '\n'));
}

describe('StreamJsonParser', () => {
  it('parses valid JSON lines', async () => {
    const events: unknown[] = [];
    const stream = makeStream([
      '{"type":"assistant","message":{"content":[{"type":"text","text":"hello"}]}}',
      '{"type":"tool_use","name":"Read","input":{}}',
    ]);

    const parser = new StreamJsonParser(stream);
    parser.onEvent((event) => events.push(event));
    await parser.done();

    expect(events).toHaveLength(2);
    expect((events[0] as { type: string }).type).toBe('assistant');
    expect((events[1] as { type: string }).type).toBe('tool_use');
  });

  it('skips empty lines', async () => {
    const events: unknown[] = [];
    const stream = makeStream(['', '{"type":"assistant","message":{}}', '', '']);

    const parser = new StreamJsonParser(stream);
    parser.onEvent((event) => events.push(event));
    await parser.done();

    expect(events).toHaveLength(1);
  });

  it('skips malformed JSON lines and calls onError', async () => {
    const events: unknown[] = [];
    const errors: unknown[] = [];
    const stream = makeStream([
      '{"type":"assistant","message":{}}',
      'this is not json',
      '{"type":"tool_use","name":"Read"}',
    ]);

    const parser = new StreamJsonParser(stream);
    parser.onEvent((event) => events.push(event));
    parser.onParseError((err) => errors.push(err));
    await parser.done();

    expect(events).toHaveLength(2);
    expect(errors).toHaveLength(1);
  });

  it('truncates lines exceeding max length', async () => {
    const events: unknown[] = [];
    const errors: unknown[] = [];
    const longLine = '{"type":"x","data":"' + 'a'.repeat(2 * 1024 * 1024) + '"}';
    const stream = makeStream([longLine]);

    const parser = new StreamJsonParser(stream, { maxLineLength: 1024 * 1024 });
    parser.onEvent((event) => events.push(event));
    parser.onParseError((err) => errors.push(err));
    await parser.done();

    expect(events).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });
});
