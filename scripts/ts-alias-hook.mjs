/**
 * ESM resolver hook that lets plain Node run the app's TypeScript sources
 * directly (Node 22.6+ strips types natively). It maps the "@/..." alias that
 * Metro resolves from tsconfig, and appends the file extensions that
 * bundler-style imports omit.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve as resolvePath } from 'node:path';

const SRC = resolvePath(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const CANDIDATES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

function firstExisting(basePath) {
  for (const suffix of CANDIDATES) {
    const candidate = basePath + suffix;
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const found = firstExisting(join(SRC, specifier.slice(2)));
    if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
  }

  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const parentDir = fileURLToPath(new URL('.', context.parentURL));
    const found = firstExisting(resolvePath(parentDir, specifier));
    if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
