#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defineCommand, runMain } from 'citty';
import ora from 'ora';
import { createColors } from 'picocolors';
import {
  FormlessError,
  parseForm,
  summarizeFields,
  toJsonSchema,
  toMarkdownSpec,
  type FormlessSchema
} from '@formless/core';

type OutputFormat = 'json' | 'md' | 'both';

const command = defineCommand({
  meta: {
    name: 'formless',
    version: '0.1.0',
    description: 'Parse a public form URL into JSON Schema and Markdown spec'
  },
  args: {
    url: {
      type: 'positional',
      required: true,
      description: 'Public form URL (Typeform or Tally)'
    },
    formatToken: {
      type: 'positional',
      required: false,
      description: 'Optional positional format token: json, md, or both'
    },
    format: {
      type: 'string',
      default: 'both',
      description: 'Output format: json, md, or both'
    },
    out: {
      type: 'string',
      description: 'Write output files to a directory instead of stdout'
    },
    pretty: {
      type: 'boolean',
      default: false,
      description: 'Pretty-print JSON output'
    },
    color: {
      type: 'boolean',
      default: true,
      description: 'Enable colorized output'
    },
    silent: {
      type: 'boolean',
      default: false,
      description: 'Suppress progress messages'
    }
  },
  async run({ args }) {
    const format = resolveFormat(args.format, args.formatToken);
    const colors = createColors(args.color);
    const spinner = !args.silent ? ora('Fetching and parsing form...').start() : null;

    try {
      const schema = await parseForm(String(args.url));
      const summary = summarizeFields(schema.fields);

      spinner?.succeed(
        `${colors.green('Parsed')} ${summary.total} fields (${summary.required} required) from ${colors.bold(
          schema.platform
        )}`
      );

      const output = buildOutput(schema, format, Boolean(args.pretty));
      if (args.out) {
        const filePaths = await writeOutputFiles(String(args.out), schema, output);
        if (!args.silent) {
          console.log(colors.cyan(`Saved output to ${filePaths.join(', ')}`));
        }
        return;
      }

      printOutput(output, format);
    } catch (error) {
      spinner?.fail(colors.red('Failed to parse form'));
      renderError(error);
      process.exitCode = 1;
    }
  }
});

function normalizeFormat(input: string): OutputFormat {
  if (input === 'json' || input === 'md' || input === 'both') {
    return input;
  }

  throw new Error(`Unsupported format "${input}". Use one of: json, md, both.`);
}

function resolveFormat(flagFormat: string, positionalFormat: string | undefined): OutputFormat {
  if (positionalFormat && ['json', 'md', 'both'].includes(positionalFormat)) {
    return normalizeFormat(positionalFormat);
  }

  return normalizeFormat(flagFormat);
}

function buildOutput(schema: FormlessSchema, format: OutputFormat, pretty: boolean): { json?: string; md?: string } {
  const jsonIndent = pretty ? 2 : 0;
  if (format === 'json') {
    return {
      json: JSON.stringify(toJsonSchema(schema), null, jsonIndent)
    };
  }

  if (format === 'md') {
    return {
      md: toMarkdownSpec(schema)
    };
  }

  return {
    json: JSON.stringify(toJsonSchema(schema), null, jsonIndent),
    md: toMarkdownSpec(schema)
  };
}

function printOutput(output: { json?: string; md?: string }, format: OutputFormat): void {
  if (format === 'json' && output.json) {
    console.log(output.json);
    return;
  }

  if (format === 'md' && output.md) {
    console.log(output.md);
    return;
  }

  if (output.json) {
    console.log(output.json);
  }

  if (output.md) {
    console.log('\n---\n');
    console.log(output.md);
  }
}

async function writeOutputFiles(
  outDir: string,
  schema: FormlessSchema,
  output: { json?: string; md?: string }
): Promise<string[]> {
  await mkdir(outDir, {
    recursive: true
  });

  const slug = toFileSlug(schema.title);
  const written: string[] = [];

  if (output.json) {
    const jsonPath = join(outDir, `${slug}.schema.json`);
    await writeFile(jsonPath, output.json, 'utf8');
    written.push(jsonPath);
  }

  if (output.md) {
    const mdPath = join(outDir, `${slug}.spec.md`);
    await writeFile(mdPath, output.md, 'utf8');
    written.push(mdPath);
  }

  return written;
}

function toFileSlug(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug.length > 0 ? slug : 'form';
}

function renderError(error: unknown): void {
  if (error instanceof FormlessError) {
    console.error(error.message);
    return;
  }

  if (error instanceof Error) {
    console.error(error.message);
    return;
  }

  console.error('An unknown error occurred.');
}

runMain(command);