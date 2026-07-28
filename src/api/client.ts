/**
 * Shared fetch layer.
 *
 * Every network call in this app goes through here so that timeouts, retries
 * and the "server returned an HTML error page instead of JSON" case are
 * handled once. That last one is not hypothetical: overpass-api.de answers
 * with an HTML `<p>Error: ... too busy ...</p>` body under load, at HTTP 200.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly isNetwork: boolean;

  constructor(message: string, status = 0, isNetwork = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetwork = isNetwork;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Number of extra attempts after the first. */
  retries?: number;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT = 15000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Identifies the app to community-run endpoints, as their policies ask. */
export const USER_AGENT = 'Sakina/1.0 (open-source Islamic companion app)';

async function fetchOnce(
  url: string,
  options: RequestOptions
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT
  );

  // Honour an externally supplied signal alongside our own timeout.
  const onExternalAbort = (): void => controller.abort();
  options.signal?.addEventListener('abort', onExternalAbort);

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      body: options.body,
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });

    const text = await response.text();

    if (!response.ok) {
      throw new ApiError(
        `Request failed with status ${response.status}`,
        response.status
      );
    }

    return text;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('The request timed out', 0, true);
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed',
      0,
      true
    );
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onExternalAbort);
  }
}

/** Retries on network failures and 5xx/429, with exponential backoff. */
function isRetryable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.isNetwork) return true;
  return error.status === 429 || error.status >= 500;
}

export async function requestText(
  url: string,
  options: RequestOptions = {}
): Promise<string> {
  const attempts = (options.retries ?? 2) + 1;
  let lastError: unknown = new ApiError('Request never ran');

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fetchOnce(url, options);
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1 || !isRetryable(error)) break;
      await sleep(600 * 2 ** attempt);
    }
  }

  throw lastError;
}

export async function requestJSON<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const text = await requestText(url, options);

  try {
    return JSON.parse(text) as T;
  } catch {
    // An HTML body here means the endpoint answered with an error page.
    const snippet = text.slice(0, 120).replace(/\s+/g, ' ').trim();
    throw new ApiError(
      snippet.startsWith('<')
        ? 'The service returned an error page instead of data'
        : `Unreadable response from server: ${snippet}`,
      0
    );
  }
}

/** Turns any thrown value into something safe to show a user. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetwork) {
      return 'Could not reach the server. Check your connection and try again.';
    }
    if (error.status === 429) {
      return 'The free service is rate-limiting requests. Please try again shortly.';
    }
    if (error.status >= 500) {
      return 'The service is temporarily unavailable. Please try again shortly.';
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}
