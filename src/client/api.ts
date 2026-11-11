export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId?: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const timeout = AbortSignal.timeout(15000);
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...options,
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
      credentials: 'same-origin',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new HttpError(
      timeout.aborted
        ? 'The request timed out. You can retry safely.'
        : 'The service could not be reached. Check your connection and retry.',
      0,
    );
  }
  const data: unknown = await response.json().catch(() => null);
  if (!data || typeof data !== 'object')
    throw new HttpError(
      'The service returned an unexpected response. Please retry.',
      response.status,
    );
  if (!response.ok) {
    const problem = data as { detail?: unknown; requestId?: unknown };
    throw new HttpError(
      typeof problem.detail === 'string' ? problem.detail : 'The request could not be completed.',
      response.status,
      typeof problem.requestId === 'string' ? problem.requestId : undefined,
    );
  }
  return data as T;
}
