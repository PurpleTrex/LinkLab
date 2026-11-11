/** All values are server-owned constants; no destination, alias or user text enters this HTML. */
export function unavailablePage(status: number, requestId: string): string {
  const gone = status === 410;
  const title = gone
    ? 'Link unavailable'
    : status === 404
      ? 'Link not found'
      : 'Unable to open link';
  const detail = gone
    ? 'It may have expired or been revoked by its owner. Ask them for a new link.'
    : status === 404
      ? 'Check the address, or ask the person who shared it for a new link.'
      : 'We could not resolve this link right now. Your destination has not been changed.';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} — LinkLab</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f6f8;color:#24333c;font:16px Arial,Helvetica,sans-serif}main{max-width:440px;padding:36px}header{font-weight:600;font-size:25px;letter-spacing:-1px;margin-bottom:64px}span{font-size:12px;color:#0076a8}h1{font-size:32px;font-weight:400;line-height:1.25;letter-spacing:-.6px}p{color:#5e6d76;line-height:1.8}a{display:inline-block;background:#0076a8;padding:13px 19px;border-radius:3px;color:white;text-decoration:none;margin:15px 0 35px}small{display:block;font-size:10px;color:#5e6d76;overflow-wrap:anywhere}</style></head><body><main><header>LinkLab</header><span>LINK STATUS · ${status}</span><h1>${title}</h1><p>${detail}</p><a href="/">Go to your workspace</a><small>Request ${requestId}</small></main></body></html>`;
}
