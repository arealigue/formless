import { fetchWithRetry } from '../http.js';
import { buildSchema, normalizeField } from '../normalizer.js';
import { ParseError, PrivateFormError } from '../errors.js';
import type { FieldType, FormlessField, FormlessSchema } from '../types.js';

type UnknownRecord = Record<string, unknown>;

export async function fetchTallyForm(sourceUrl: string): Promise<FormlessSchema> {
  const response = await fetchWithRetry(
    sourceUrl,
    {
      headers: {
        accept: 'text/html'
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
    throw new ParseError(`Tally adapter failed with status ${response.status}.`);
  }

  const html = await response.text();
  const nextData = extractNextData(html);
  if (nextData) {
    return mapTallyPayload(nextData, sourceUrl);
  }

  return parseWithPlaywrightFallback(sourceUrl);
}

function extractNextData(html: string): unknown | null {
  const match = /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!match) {
    return null;
  }

  const payload = match[1];
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function mapTallyPayload(payload: unknown, sourceUrl: string): FormlessSchema {
  if (!payload || typeof payload !== 'object') {
    throw new ParseError('Unexpected Tally payload format.');
  }

  const root = payload as UnknownRecord;
  const props = asRecord(root.props);
  const pageProps = asRecord(props?.pageProps);
  const form = asRecord(pageProps?.form);
  const blocks = asArray(form?.blocks) ?? asArray(pageProps?.blocks);

  if (!blocks) {
    throw new ParseError('Unable to locate Tally form blocks in __NEXT_DATA__.');
  }

  const fields = asArray(pageProps?.blocks)
    ? mapModernTallyBlocks(blocks)
    : blocks.flatMap((block, index) => mapTallyBlock(block, index));

  return buildSchema({
    title: asString(form?.name) ?? asString(pageProps?.name) ?? asString(pageProps?.title) ?? 'Untitled Tally Form',
    platform: 'tally',
    sourceUrl,
    fields
  });
}

interface OptionAccumulator {
  groupUuid: string;
  groupType: string;
  label?: string;
  required: boolean;
  options: string[];
  index: number;
}

function mapModernTallyBlocks(blocks: unknown[]): FormlessField[] {
  const entries: Array<{ index: number; field: FormlessField }> = [];
  const optionGroups = new Map<string, OptionAccumulator>();
  let pendingLabel: string | undefined;

  blocks.forEach((rawBlock, index) => {
    const block = asRecord(rawBlock);
    if (!block) {
      return;
    }

    const blockType = asString(block.type);
    const groupUuid = asString(block.groupUuid);
    const groupType = asString(block.groupType) ?? blockType;
    const payload = asRecord(block.payload) ?? asRecord(block.settings) ?? {};

    if (blockType === 'TITLE') {
      pendingLabel = extractSafeHtmlText(payload.safeHTMLSchema) ?? pendingLabel;
      return;
    }

    if (!blockType) {
      return;
    }

    if (blockType === 'HIDDEN_FIELDS') {
      const hiddenValues = readHiddenFieldKeys(block);
      hiddenValues.forEach((fieldKey, hiddenIndex) => {
        entries.push({
          index: index + hiddenIndex,
          field: normalizeField(
            {
              id: fieldKey,
              label: fieldKey,
              type: 'text',
              hidden: true,
              required: false
            },
            index + hiddenIndex
          )
        });
      });
      return;
    }

    if (blockType === 'DROPDOWN_OPTION' || blockType === 'MULTIPLE_CHOICE_OPTION') {
      const key = groupUuid ?? `options-${index}`;
      const existing = optionGroups.get(key);
      const optionText = asString(payload.text);
      if (!existing) {
        optionGroups.set(key, {
          groupUuid: key,
          groupType: groupType ?? blockType,
          label: pendingLabel,
          required: asBoolean(payload.isRequired) ?? false,
          options: optionText ? [optionText] : [],
          index
        });
        pendingLabel = undefined;
      } else if (optionText) {
        existing.options.push(optionText);
      }
      return;
    }

    const mappedType = mapTallyType(blockType, payload);
    if (!isInteractiveFieldType(mappedType)) {
      return;
    }

    entries.push({
      index,
      field: normalizeField(
        {
          id: asString(block.id) ?? asString(block.uuid) ?? asString(block.slug),
          label: pendingLabel ?? asString(payload.label) ?? asString(payload.title) ?? asString(payload.placeholder),
          type: mappedType,
          required: asBoolean(payload.required) ?? asBoolean(payload.isRequired) ?? false,
          description: asString(payload.description),
          placeholder: asString(payload.placeholder),
          min: asNumber(payload.min) ?? asNumber(payload.minValue),
          max: asNumber(payload.max) ?? asNumber(payload.maxValue),
          minLength: asNumber(payload.minLength),
          maxLength: asNumber(payload.maxLength),
          allowMultiple: mappedType === 'file' ? asBoolean(payload.allowMultiple) ?? false : undefined,
          hidden: false
        },
        index
      )
    });
    pendingLabel = undefined;
  });

  for (const optionGroup of optionGroups.values()) {
    const allowMultiple =
      optionGroup.groupType === 'CHECKBOXES' ||
      optionGroup.groupType === 'MULTIPLE_CHOICE' ||
      optionGroup.groupType === 'MULTIPLE_CHOICE_OPTION';

    entries.push({
      index: optionGroup.index,
      field: normalizeField(
        {
          id: optionGroup.groupUuid,
          label: optionGroup.label,
          type: allowMultiple ? 'multiselect' : 'select',
          required: optionGroup.required,
          options: optionGroup.options
        },
        optionGroup.index
      )
    });
  }

  return entries
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.field);
}

function mapTallyBlock(rawBlock: unknown, index: number): FormlessField[] {
  const block = asRecord(rawBlock);
  if (!block) {
    return [];
  }

  const blockType = asString(block.type) ?? asString(block.blockType);
  if (!blockType) {
    return [];
  }

  if (blockType === 'HIDDEN_FIELDS') {
    const hiddenValues = readHiddenFieldKeys(block);
    return hiddenValues.map((fieldKey, hiddenIndex) => {
      return normalizeField(
        {
          id: fieldKey,
          label: fieldKey,
          type: 'text',
          hidden: true,
          required: false
        },
        index + hiddenIndex
      );
    });
  }

  const settings = asRecord(block.settings) ?? asRecord(block.props);
  const optionValues = readOptionLabels(block, settings);
  const mappedType = mapTallyType(blockType, settings);

  return [
    normalizeField(
      {
        id: asString(block.id) ?? asString(block.uuid) ?? asString(block.slug),
        label:
          asString(block.title) ??
          asString(block.label) ??
          asString(settings?.label) ??
          asString(settings?.title) ??
          asString(settings?.placeholder),
        type: mappedType,
        required:
          asBoolean(block.required) ??
          asBoolean(settings?.required) ??
          asBoolean(settings?.isRequired) ??
          false,
        description: asString(settings?.description),
        placeholder: asString(settings?.placeholder),
        options: optionValues,
        min: asNumber(settings?.min) ?? asNumber(settings?.minValue),
        max: asNumber(settings?.max) ?? asNumber(settings?.maxValue),
        minLength: asNumber(settings?.minLength),
        maxLength: asNumber(settings?.maxLength),
        allowMultiple: mappedType === 'file' ? asBoolean(settings?.allowMultiple) ?? false : undefined,
        hidden: false
      },
      index
    )
  ];
}

function readHiddenFieldKeys(block: UnknownRecord): string[] {
  const hidden = asRecord(block.fields) ?? asRecord(block.values) ?? asRecord(block.hiddenFields);
  if (!hidden) {
    return [];
  }

  return Object.keys(hidden);
}

function readOptionLabels(block: UnknownRecord, settings: UnknownRecord | undefined): string[] | undefined {
  const source = asArray(settings?.options) ?? asArray(block.options) ?? asArray(settings?.choices);
  if (!source) {
    return undefined;
  }

  const options = source
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry;
      }

      if (entry && typeof entry === 'object') {
        const value = asString((entry as UnknownRecord).label) ?? asString((entry as UnknownRecord).value);
        return value;
      }

      return undefined;
    })
    .filter((value): value is string => Boolean(value));

  return options.length > 0 ? options : undefined;
}

function mapTallyType(blockType: string, settings: UnknownRecord | undefined): FieldType {
  switch (blockType) {
    case 'INPUT_TEXT':
      return 'text';
    case 'INPUT_EMAIL':
      return 'email';
    case 'INPUT_NUMBER':
      return 'number';
    case 'INPUT_PHONE_NUMBER':
      return 'phone';
    case 'INPUT_LINK':
      return 'url';
    case 'INPUT_DATE':
      return 'date';
    case 'TEXTAREA':
      return 'textarea';
    case 'DROPDOWN':
      return 'select';
    case 'MULTIPLE_CHOICE': {
      const allowMulti = asBoolean(settings?.allowMultiple) ?? asBoolean(settings?.multiple);
      return allowMulti ? 'multiselect' : 'select';
    }
    case 'CHECKBOXES':
      return 'multiselect';
    case 'LINEAR_SCALE':
      return 'rating';
    case 'FILE_UPLOAD':
      return 'file';
    case 'CHECKBOX':
      return 'boolean';
    case 'SIGNATURE':
      return 'file';
    case 'STATEMENT':
      return 'statement';
    default:
      return 'unknown';
  }
}

function isInteractiveFieldType(type: FieldType): boolean {
  return type !== 'statement' && type !== 'unknown';
}

function extractSafeHtmlText(schema: unknown): string | undefined {
  if (!Array.isArray(schema) || schema.length === 0) {
    return undefined;
  }

  const parts = flattenSafeHtmlSchema(schema);
  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  return text.length > 0 ? text : undefined;
}

function flattenSafeHtmlSchema(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => flattenSafeHtmlSchema(entry));
}

async function parseWithPlaywrightFallback(sourceUrl: string): Promise<FormlessSchema> {
  const dynamicImport = new Function('specifier', 'return import(specifier);') as (
    specifier: string
  ) => Promise<UnknownRecord>;

  let playwrightModule: UnknownRecord;
  try {
    playwrightModule = await dynamicImport('playwright');
  } catch {
    throw new ParseError(
      'Tally fallback parser requires Playwright. Install it with: npm install --workspace @formless/core playwright'
    );
  }

  const chromium = asRecord(playwrightModule.chromium);
  const launch = chromium?.launch;
  if (typeof launch !== 'function') {
    throw new ParseError('Playwright was loaded but chromium.launch is unavailable.');
  }

  const browser = await (launch as () => Promise<UnknownRecord>)();
  const newPage = browser.newPage;
  if (typeof newPage !== 'function') {
    throw new ParseError('Playwright browser did not provide newPage().');
  }

  const page = await (newPage as () => Promise<UnknownRecord>)();
  const goto = page.goto;
  const content = page.content;
  if (typeof goto !== 'function' || typeof content !== 'function') {
    throw new ParseError('Playwright page does not expose required methods.');
  }

  try {
    await (goto as (url: string, options: UnknownRecord) => Promise<void>)(sourceUrl, {
      waitUntil: 'networkidle'
    });
    const renderedHtml = await (content as () => Promise<string>)();
    const nextData = extractNextData(renderedHtml);
    if (!nextData) {
      throw new ParseError('Could not parse Tally form from rendered page content.');
    }

    return mapTallyPayload(nextData, sourceUrl);
  } finally {
    const closePage = page.close;
    if (typeof closePage === 'function') {
      await (closePage as () => Promise<void>)();
    }

    const closeBrowser = browser.close;
    if (typeof closeBrowser === 'function') {
      await (closeBrowser as () => Promise<void>)();
    }
  }
}

function asRecord(value: unknown): UnknownRecord | undefined {
  return value !== null && typeof value === 'object' ? (value as UnknownRecord) : undefined;
}

function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && !Number.isNaN(value) ? value : undefined;
}