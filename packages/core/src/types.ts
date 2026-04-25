export type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'phone'
  | 'url'
  | 'date'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'rating'
  | 'ranking'
  | 'file'
  | 'statement'
  | 'unknown';

export type FormlessPlatform = 'typeform' | 'tally' | 'google-forms' | 'unknown';

export interface FormlessField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
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

export interface FormlessSchema {
  title: string;
  description?: string;
  platform: FormlessPlatform;
  sourceUrl: string;
  parsedAt: string;
  fields: FormlessField[];
}

export type SupportedPlatform = 'typeform' | 'tally';