'use client';

export type UiFormat = 'json' | 'md';

interface FormatToggleProps {
  value: UiFormat;
  onChange: (next: UiFormat) => void;
}

export function FormatToggle({ value, onChange }: FormatToggleProps) {
  return (
    <div className="toggle" aria-label="Output format">
      <button type="button" className={value === 'json' ? 'active' : ''} onClick={() => onChange('json')}>
        JSON Schema
      </button>
      <button type="button" className={value === 'md' ? 'active' : ''} onClick={() => onChange('md')}>
        Markdown
      </button>
    </div>
  );
}