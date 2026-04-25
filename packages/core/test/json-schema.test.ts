import { describe, expect, it } from 'vitest';
import { toJsonSchema } from '../src/outputs/json-schema.js';
import type { FormlessSchema } from '../src/types.js';

const sampleSchema: FormlessSchema = {
  title: 'Job Application',
  platform: 'typeform',
  sourceUrl: 'https://yourworkspace.typeform.com/to/abc123',
  parsedAt: '2026-04-25T10:00:00.000Z',
  fields: [
    {
      id: 'full_name',
      label: 'Full name',
      type: 'text',
      required: true,
      minLength: 2,
      maxLength: 100
    },
    {
      id: 'email',
      label: 'Email',
      type: 'email',
      required: true
    },
    {
      id: 'skills',
      label: 'Skills',
      type: 'multiselect',
      required: false,
      options: ['React', 'Node.js']
    },
    {
      id: 'note',
      label: 'Note',
      type: 'statement',
      required: false
    }
  ]
};

describe('toJsonSchema', () => {
  it('creates a Draft-07 schema with required fields and properties', () => {
    const output = toJsonSchema(sampleSchema);

    expect(output.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(output.type).toBe('object');
    expect(output.required).toEqual(['full_name', 'email']);
    expect(output.properties.full_name.minLength).toBe(2);
    expect(output.properties.skills.type).toBe('array');
    expect(output.properties.note).toBeUndefined();
  });
});