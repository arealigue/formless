import { InvalidUrlError, UnsupportedPlatformError } from './errors.js';
import type { SupportedPlatform } from './types.js';

const TYPEFORM_HOST_RE = /(^|\.)typeform\.com$/i;
const TALLY_HOST_RE = /^tally\.so$/i;

export function detectPlatform(rawUrl: string): SupportedPlatform {
  const parsed = parseUrl(rawUrl);
  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname;

  if (TYPEFORM_HOST_RE.test(hostname) && /^\/to\/[A-Za-z0-9]+(?:[/?#]|$)/.test(pathname)) {
    return 'typeform';
  }

  if (TALLY_HOST_RE.test(hostname) && /^\/r\/[A-Za-z0-9]+(?:[/?#]|$)/.test(pathname)) {
    return 'tally';
  }

  if (hostname === 'forms.gle' || (hostname === 'docs.google.com' && pathname.startsWith('/forms/'))) {
    throw new UnsupportedPlatformError(rawUrl, ' Google Forms support is planned for v2.');
  }

  throw new UnsupportedPlatformError(rawUrl);
}

export function parseUrl(rawUrl: string): URL {
  try {
    return new URL(rawUrl);
  } catch {
    throw new InvalidUrlError(rawUrl);
  }
}