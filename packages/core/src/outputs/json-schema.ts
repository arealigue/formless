import type { FormlessField, FormlessSchema } from '../types.js';

export interface JsonSchemaDraft07 {
  $schema: 'http://json-schema.org/draft-07/schema#';
  title: string;
  description?: string;
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface JsonSchemaProperty {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array';
  format?: 'email' | 'uri' | 'date';
  description?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  items?: JsonSchemaProperty;
}

export function toJsonSchema(schema: FormlessSchema): JsonSchemaDraft07 {
  const visibleFields = schema.fields.filter((field) => !field.hidden && field.type !== 'statement');
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  for (const field of visibleFields) {
    properties[field.id] = mapFieldToProperty(field);
    if (field.required) {
      required.push(field.id);
    }
  }

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: schema.title,
    description: schema.description ?? `Parsed by formless from ${capitalize(schema.platform)}`,
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined
  };
}

function mapFieldToProperty(field: FormlessField): JsonSchemaProperty {
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'phone':
    case 'ranking':
    case 'unknown':
      return withCommonStringRules(
        {
          type: 'string'
        },
        field
      );
    case 'email':
      return withCommonStringRules(
        {
          type: 'string',
          format: 'email'
        },
        field
      );
    case 'url':
      return withCommonStringRules(
        {
          type: 'string',
          format: 'uri'
        },
        field
      );
    case 'date':
      return withCommonStringRules(
        {
          type: 'string',
          format: 'date'
        },
        field
      );
    case 'number':
      return withNumberRules(
        {
          type: 'number'
        },
        field
      );
    case 'rating':
      return withNumberRules(
        {
          type: 'integer'
        },
        field
      );
    case 'boolean':
      return withDescription(
        {
          type: 'boolean'
        },
        field
      );
    case 'select':
      return withDescription(
        {
          type: 'string',
          enum: field.options
        },
        field
      );
    case 'multiselect':
      return withDescription(
        {
          type: 'array',
          items: {
            type: 'string',
            enum: field.options
          }
        },
        field
      );
    case 'file':
      return withDescription(
        {
          type: 'string',
          format: 'uri'
        },
        field
      );
    case 'statement':
      return {
        type: 'string'
      };
    default:
      return {
        type: 'string'
      };
  }
}

function withCommonStringRules(base: JsonSchemaProperty, field: FormlessField): JsonSchemaProperty {
  return {
    ...base,
    description: field.description,
    minLength: field.minLength,
    maxLength: field.maxLength
  };
}

function withNumberRules(base: JsonSchemaProperty, field: FormlessField): JsonSchemaProperty {
  return {
    ...base,
    description: field.description,
    minimum: field.min,
    maximum: field.max
  };
}

function withDescription(base: JsonSchemaProperty, field: FormlessField): JsonSchemaProperty {
  return {
    ...base,
    description: field.description
  };
}

function capitalize(value: string): string {
  if (value.length === 0) {
    return value;
  }

  const first = value.charAt(0).toUpperCase();
  return `${first}${value.slice(1)}`;
}