export class FormlessError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

export class InvalidUrlError extends FormlessError {
  public constructor(url: string) {
    super('INVALID_URL', `Invalid form URL: ${url}`);
  }
}

export class UnsupportedPlatformError extends FormlessError {
  public constructor(url: string, details?: string) {
    const supported = 'Supported platforms right now: Typeform and Tally.';
    const issueLink = 'Need another one? Open an issue: https://github.com/arealigue/formless/issues/new';
    const suffix = details ? ` ${details}` : '';
    super('UNSUPPORTED_PLATFORM', `Unsupported form URL: ${url}. ${supported}${suffix} ${issueLink}`);
  }
}

export class PrivateFormError extends FormlessError {
  public constructor(url: string) {
    super(
      'PRIVATE_FORM',
      `The form appears private, restricted, or unavailable: ${url}. Try making it publicly accessible and retry.`
    );
  }
}

export class NetworkError extends FormlessError {
  public constructor(url: string, cause?: unknown) {
    const causeMessage = cause instanceof Error ? ` Cause: ${cause.message}` : '';
    super('NETWORK_ERROR', `Network request failed while fetching ${url}.${causeMessage}`);
  }
}

export class ParseError extends FormlessError {
  public constructor(message: string) {
    super('PARSE_ERROR', message);
  }
}