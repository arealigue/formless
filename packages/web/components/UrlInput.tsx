'use client';

import { type FormEvent, type KeyboardEvent } from 'react';

interface UrlInputProps {
  url: string;
  isLoading: boolean;
  onUrlChange: (next: string) => void;
  onSubmit: () => void;
}

export function UrlInput({ url, isLoading, onUrlChange, onSubmit }: UrlInputProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="field-row">
      <input
        type="url"
        value={url}
        onChange={(event) => onUrlChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Paste Typeform or Tally URL"
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Parsing...' : 'Parse'}
      </button>
    </form>
  );
}