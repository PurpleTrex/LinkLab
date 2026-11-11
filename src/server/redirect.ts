import type { Link } from '../domain/link.ts';

export interface BackgroundContext {
  waitUntil(promise: Promise<unknown>): void;
}
export interface MetricsSink {
  record(id: string, at: number): Promise<void>;
}
export function redirectResponse(
  link: Link,
  method: string,
  now: number,
  sink: MetricsSink,
  context: BackgroundContext,
  onFailure: () => void,
): Response {
  if (method === 'GET') {
    context.waitUntil(
      Promise.resolve()
        .then(() => sink.record(link.id, now))
        .catch(onFailure),
    );
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: link.targetUrl,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
