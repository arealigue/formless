import { detectPlatform, parseUrl } from './detector.js';
import { fetchTallyForm } from './adapters/tally.js';
import { fetchTypeformForm } from './adapters/typeform.js';

export { toJsonSchema } from './outputs/json-schema.js';
export { summarizeFields, toMarkdownSpec } from './outputs/markdown.js';
export {
  FormlessError,
  InvalidUrlError,
  NetworkError,
  ParseError,
  PrivateFormError,
  UnsupportedPlatformError
} from './errors.js';

export type { FieldType, FormlessField, FormlessPlatform, FormlessSchema, SupportedPlatform } from './types.js';

export async function parseForm(sourceUrl: string) {
  const normalizedUrl = parseUrl(sourceUrl).toString();
  const platform = detectPlatform(normalizedUrl);

  if (platform === 'typeform') {
    return fetchTypeformForm(normalizedUrl);
  }

  return fetchTallyForm(normalizedUrl);
}