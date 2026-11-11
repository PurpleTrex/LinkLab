import { LockKeyhole } from 'lucide-react';
export function ApiReference() {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>API reference</h1>
          <p>Endpoints, authentication requirements, and request examples.</p>
        </div>
      </div>
      <div className="info-banner">
        <LockKeyhole size={21} />
        <div>
          <strong>Authenticated, same-origin management API.</strong>
          <p>
            Hosted identity is established through the sign-in gateway. Mutations require a matching
            Origin header. This release does not issue third-party API keys.
          </p>
        </div>
      </div>
      <section className="panel api-card">
        <div className="panel-heading">
          <h2>Endpoints</h2>
          <span className="label-pill">v1</span>
        </div>
        {[
          ['POST', '/api/v1/links', 'Create a link. Requires Idempotency-Key.'],
          ['GET', '/api/v1/links', 'List your links with bounded cursor pagination.'],
          ['GET', '/api/v1/links/{id}', 'Read one owned link and its ETag.'],
          ['DELETE', '/api/v1/links/{id}', 'Permanently revoke. Requires an If-Match version.'],
          ['GET', '/api/v1/links/{id}/analytics', 'Read daily counts for an owned link.'],
          ['GET', '/api/v1/overview', 'Read the seven-day dashboard and latest audit events.'],
          ['GET', '/s/{alias}', 'Resolve an active link with a 302 redirect. HEAD does not count.'],
          ['POST', '/api/v1/lab', 'Run a predefined, isolated reliability check.'],
          ['GET', '/healthz', 'Liveness. Authenticated readiness: /api/v1/ready.'],
        ].map(([method, path, description]) => (
          <div className="endpoint" key={`${path}${method}`}>
            <span className={`method ${method?.toLowerCase()}`}>{method}</span>
            <div>
              <code>{path}</code>
              <p>{description}</p>
            </div>
          </div>
        ))}
      </section>
      <div className="code-grid">
        <section className="code-card">
          <div>
            <span>CREATE A LINK</span>
            <span>JSON</span>
          </div>
          <pre>{`POST /api/v1/links\nContent-Type: application/json\nOrigin: <your site origin>\nIdempotency-Key: <unique request UUID>\n\n{\n  "targetUrl": "https://example.com/launch",\n  "title": "Product launch",\n  "alias": "product-launch",\n  "expiresAt": null\n}`}</pre>
        </section>
        <section className="code-card">
          <div>
            <span>STRUCTURED FAILURE</span>
            <span>409</span>
          </div>
          <pre>{`Content-Type: application/problem+json\n\n{\n  "type": "urn:linklab:problem:alias_unavailable",\n  "title": "alias_unavailable",\n  "status": 409,\n  "detail": "That alias is already in use. Choose another.",\n  "requestId": "<server-generated UUID>"\n}`}</pre>
        </section>
      </div>
      <p className="fine-print">
        See docs/openapi.json in the source package for the machine-readable contract. Limits: 120
        management requests, 30 creations, and 5 lab checks per identity per fixed minute.
      </p>
    </>
  );
}
