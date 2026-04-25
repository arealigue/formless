'use client';

import { useMemo, useState } from 'react';
import { FormatToggle, type UiFormat } from '../components/FormatToggle';
import { OutputPanel } from '../components/OutputPanel';
import { UrlInput } from '../components/UrlInput';

interface ApiResponse {
  jsonSchema?: unknown;
  markdown?: string;
  meta?: {
    platform: string;
    fieldCount: number;
    parsedAt: string;
  };
  error?: string;
}

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<UiFormat>('json');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metaText, setMetaText] = useState('Supported: Typeform · Tally');

  const helperText = useMemo(() => {
    if (isLoading) {
      return 'Working...';
    }

    if (error) {
      return 'Request failed';
    }

    return metaText;
  }, [isLoading, error, metaText]);

  const parseForm = async () => {
    setError(null);

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!parsedUrl.protocol.startsWith('http')) {
        throw new Error('Only HTTP(S) URLs are supported.');
      }
    } catch {
      setError('Please enter a valid public URL.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          url: parsedUrl.toString(),
          format
        })
      });

      const data = (await response.json()) as ApiResponse;
      if (!response.ok) {
        throw new Error(data.error ?? 'Request failed.');
      }

      if (format === 'json') {
        setOutput(JSON.stringify(data.jsonSchema, null, 2));
      } else {
        setOutput(data.markdown ?? '');
      }

      if (data.meta) {
        setMetaText(
          `Detected: ${data.meta.platform} · Parsed ${data.meta.fieldCount} fields · ${new Date(
            data.meta.parsedAt
          ).toLocaleString()}`
        );
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unexpected error occurred.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="header">
        <strong className="logo">formless</strong>
        <a href="https://github.com/arealigue/formless" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </header>

      <main className="main">
        <p className="hero">Parse any public form URL into clean JSON Schema or Markdown with no setup and no auth.</p>

        <UrlInput url={url} onUrlChange={setUrl} onSubmit={parseForm} isLoading={isLoading} />

        <div>
          <FormatToggle value={format} onChange={setFormat} />
        </div>

        {error ? <p className="error">{error}</p> : <p className="muted">{helperText}</p>}

        <OutputPanel format={format} value={output} isLoading={isLoading} helperText={helperText} />
      </main>
    </div>
  );
}