import handler from 'vinext/server/fetch-handler';
import { handleApi } from '../src/server/http.ts';
import type { Database } from '../src/server/database.ts';

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/') || path.startsWith('/s/') || path === '/healthz') {
      return handleApi(request, { DB: env.DB as Database | undefined }, ctx);
    }
    const result = await handler.fetch(request, env, ctx);
    const headers = new Headers(result.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set('Strict-Transport-Security', 'max-age=31536000');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    if (headers.get('Content-Type')?.includes('text/html')) {
      const nonce = btoa(crypto.randomUUID());
      headers.set('Cache-Control', 'no-store');
      headers.set(
        'Content-Security-Policy',
        `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'${import.meta.env.DEV ? ' ws: wss:' : ''}; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self' https://chatgpt.com`,
      );
      const response = new Response(result.body, { status: result.status, headers });
      return new HTMLRewriter()
        .on('script', {
          element(element) {
            element.setAttribute('nonce', nonce);
          },
        })
        .transform(response);
    }
    return new Response(result.body, { status: result.status, headers });
  },
};

export default worker;
