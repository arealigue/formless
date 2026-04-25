'use client';

import { useMemo, useState } from 'react';

interface OutputPanelProps {
  format: 'json' | 'md';
  value: string;
  isLoading: boolean;
  helperText?: string;
}

export function OutputPanel({ format, value, isLoading, helperText }: OutputPanelProps) {
  const [copied, setCopied] = useState(false);
  const language = useMemo(() => (format === 'json' ? 'json' : 'markdown'), [format]);

  const copyOutput = async () => {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <section className="output" aria-live="polite">
      <div className="output-actions">
        <span>{helperText ?? `${language} output`}</span>
        <button type="button" onClick={copyOutput} disabled={!value || isLoading}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre>{isLoading ? 'Parsing form...' : value || 'Output appears here after parsing.'}</pre>
    </section>
  );
}