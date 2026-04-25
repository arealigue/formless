import { fetchWithRetry } from '../http.js';
import { buildSchema, normalizeField } from '../normalizer.js';
import { ParseError, PrivateFormError } from '../errors.js';
import type { FieldType, FormlessField, FormlessSchema } from '../types.js';

interface TypeformChoice {
  label?: string;
}

interface TypeformProperties {
  description?: string;
  placeholder?: string;
  choices?: TypeformChoice[];
  min_value?: number;
  max_value?: number;
  min_length?: number;
  max_length?: number;
  allow_multiple_selection?: boolean;
  allow_multiple_selections?: boolean;
}

interface TypeformValidations {
  required?: boolean;
  min_length?: number;
  max_length?: number;
}

interface TypeformField {
  id?: string;
  ref?: string;
  title?: string;
  type?: string;
  properties?: TypeformProperties;
  validations?: TypeformValidations;
}

interface TypeformResponse {
  title?: string;
  fields?: TypeformField[];
  hidden?: Record<string, unknown>;
}

export async function fetchTypeformForm(sourceUrl: string): Promise<FormlessSchema> {
  const formId = extractTypeformId(sourceUrl);
  const apiUrl = `https://api.typeform.com/forms/${formId}`;
  const response = await fetchWithRetry(
    apiUrl,
    {
      headers: {
        accept: 'application/json'
      }
    },
    {
      retryCount: 1
    }
  );

  if (response.status === 401 || response.status === 403 || response.status === 404) {
    throw new PrivateFormError(sourceUrl);
  }

  if (!response.ok) {
    throw new ParseError(`Typeform adapter failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as TypeformResponse;
  const mappedFields = mapTypeformFields(payload.fields ?? []);
  const hiddenFields = mapHiddenFields(payload.hidden ?? {}, mappedFields.length);

  return buildSchema({
    title: payload.title,
    platform: 'typeform',
    sourceUrl,
    fields: [...mappedFields, ...hiddenFields]
  });
}

function extractTypeformId(url: string): string {
  const match = /\/to\/([A-Za-z0-9]+)(?:[/?#]|$)/.exec(url);
  const formId = match?.[1];
  if (!formId) {
    throw new ParseError('Unable to extract Typeform ID from URL.');
  }

  return formId;
}

function mapTypeformFields(fields: TypeformField[]): FormlessField[] {
  return fields.map((field, index) => {
    const mappedType = mapTypeformType(field.type, field.properties);
    const isHidden = field.type === 'hidden';

    return normalizeField(
      {
        id: field.ref ?? field.id,
        label: field.title,
        type: mappedType,
        required: Boolean(field.validations?.required),
        description: field.properties?.description,
        placeholder: field.properties?.placeholder,
        options: (field.properties?.choices ?? []).map((choice) => choice.label ?? '').filter(Boolean),
        min: field.properties?.min_value,
        max: field.properties?.max_value,
        minLength: field.validations?.min_length ?? field.properties?.min_length,
        maxLength: field.validations?.max_length ?? field.properties?.max_length,
        allowMultiple: isFileUpload(field.type)
          ? Boolean(field.properties?.allow_multiple_selection ?? field.properties?.allow_multiple_selections)
          : undefined,
        hidden: isHidden
      },
      index
    );
  });
}

function mapHiddenFields(hiddenFields: Record<string, unknown>, startIndex: number): FormlessField[] {
  return Object.keys(hiddenFields).map((fieldKey, index) => {
    return normalizeField(
      {
        id: fieldKey,
        label: fieldKey,
        type: 'text',
        required: false,
        hidden: true
      },
      startIndex + index
    );
  });
}

function isFileUpload(type: string | undefined): boolean {
  return type === 'file_upload';
}

function mapTypeformType(type: string | undefined, properties: TypeformProperties | undefined): FieldType {
  switch (type) {
    case 'short_text':
      return 'text';
    case 'long_text':
      return 'textarea';
    case 'email':
      return 'email';
    case 'number':
      return 'number';
    case 'phone_number':
      return 'phone';
    case 'website':
      return 'url';
    case 'date':
      return 'date';
    case 'dropdown':
      return 'select';
    case 'multiple_choice': {
      const isMulti = Boolean(properties?.allow_multiple_selection ?? properties?.allow_multiple_selections);
      return isMulti ? 'multiselect' : 'select';
    }
    case 'yes_no':
      return 'boolean';
    case 'opinion_scale':
    case 'rating':
      return 'rating';
    case 'ranking':
      return 'ranking';
    case 'file_upload':
      return 'file';
    case 'statement':
      return 'statement';
    case 'hidden':
      return 'text';
    default:
      return 'unknown';
  }
}