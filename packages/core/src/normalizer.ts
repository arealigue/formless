import type { FieldType, FormlessField, FormlessPlatform, FormlessSchema } from './types.js';

interface NormalizeFieldInput {
  id?: string;
  label?: string;
  type: FieldType;
  required?: boolean;
  description?: string;
  placeholder?: string;
  options?: string[];
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  allowMultiple?: boolean;
  hidden?: boolean;
}

interface BuildSchemaInput {
  title?: string;
  description?: string;
  platform: FormlessPlatform;
  sourceUrl: string;
  fields: FormlessField[];
}

export function normalizeField(input: NormalizeFieldInput, index: number): FormlessField {
  const fallbackLabel = `Field ${index + 1}`;
  const label = sanitizeText(input.label) ?? fallbackLabel;
  const id = sanitizeIdentifier(input.id) ?? toIdentifier(label, index);

  return {
    id,
    label,
    type: input.type,
    required: input.required ?? false,
    description: sanitizeText(input.description),
    placeholder: sanitizeText(input.placeholder),
    options: normalizeOptions(input.options),
    min: sanitizeNumber(input.min),
    max: sanitizeNumber(input.max),
    minLength: sanitizeInteger(input.minLength),
    maxLength: sanitizeInteger(input.maxLength),
    allowMultiple: input.allowMultiple,
    hidden: input.hidden
  };
}

export function buildSchema(input: BuildSchemaInput): FormlessSchema {
  return {
    title: sanitizeText(input.title) ?? 'Untitled Form',
    description: sanitizeText(input.description),
    platform: input.platform,
    sourceUrl: input.sourceUrl,
    parsedAt: new Date().toISOString(),
    fields: input.fields
  };
}

function toIdentifier(label: string, index: number): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || `field_${index + 1}`;
}

function sanitizeText(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeIdentifier(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().replace(/\s+/g, '_');
  return normalized.length > 0 ? normalized : undefined;
}

function sanitizeNumber(value: number | undefined): number | undefined {
  if (value === undefined || Number.isNaN(value)) {
    return undefined;
  }

  return value;
}

function sanitizeInteger(value: number | undefined): number | undefined {
  if (value === undefined || Number.isNaN(value)) {
    return undefined;
  }

  return Math.trunc(value);
}

function normalizeOptions(values: string[] | undefined): string[] | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }

  const normalized = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return normalized.length > 0 ? normalized : undefined;
}