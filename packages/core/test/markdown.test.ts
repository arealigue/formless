import { describe, expect, it } from 'vitest';
import { toMarkdownSpec } from '../src/outputs/markdown.js';
import type { FormlessSchema } from '../src/types.js';

describe('toMarkdownSpec', () => {
  it('renders field metadata into markdown format', () => {
    const schema: FormlessSchema = {
      title: 'Feedback Form',
      platform: 'tally',
      sourceUrl: 'https://tally.so/r/test123',
      parsedAt: '2026-04-25T10:00:00.000Z',
      fields: [
        {
          id: 'email',
          label: 'Email',
          type: 'email',
          required: true
        },
        {
          id: 'rating',
          label: 'Satisfaction',
          type: 'rating',
          required: false,
          min: 1,
          max: 10
        }
      ]
    };

    const markdown = toMarkdownSpec(schema);

    expect(markdown).toContain('# Feedback Form');
    expect(markdown).toContain('Platform: Tally');
    expect(markdown).toContain('### 1. Email `required`');
    expect(markdown).toContain('### 2. Satisfaction');
    expect(markdown).toContain('**Range:** 1 - 10');
  });
});