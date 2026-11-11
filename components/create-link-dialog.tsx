'use client';
import { useState, useRef, type FormEvent } from 'react';
import { Check, CheckCheck, LockKeyhole, LoaderCircle, Plus } from 'lucide-react';
import { api } from '../src/client/api';
import { Dialog, ErrorNotice, CopyButton } from './dialog';
import type { LinkView } from '../src/domain/contracts';
export function CreateDialog({
  onClose,
  onCreated,
  notify,
}: {
  onClose(): void;
  onCreated(): void;
  notify(message: string): void;
}) {
  const [targetUrl, setTargetUrl] = useState('');
  const [title, setTitle] = useState('');
  const [alias, setAlias] = useState('');
  const [expiration, setExpiration] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [created, setCreated] = useState<LinkView | null>(null);
  const attempt = useRef<{ body: string; key: string } | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const body = JSON.stringify({
      targetUrl,
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(alias ? { alias } : {}),
      expiresAt: expiration ? new Date(expiration).getTime() : null,
    });
    if (attempt.current?.body !== body) attempt.current = { body, key: crypto.randomUUID() };
    try {
      const result = await api<{ link: LinkView }>('/links', {
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': attempt.current.key },
      });
      setCreated(result.link);
      onCreated();
    } catch (err) {
      setError(err as Error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={created ? 'Link created' : 'Create link'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {created ? (
        <div className="dialog-body success-content">
          <div className="success-icon">
            <CheckCheck size={30} />
          </div>
          <h3>Link created successfully</h3>
          <p>{created.title}</p>
          <div className="copy-field">
            <a href={created.shortUrl} target="_blank" rel="noopener noreferrer">
              {created.shortUrl}
            </a>
            <CopyButton value={created.shortUrl} notify={notify} />
          </div>
          <p className="muted small">
            This workspace is private. Visitors must have access to follow hosted links.
          </p>
          <button className="button primary full" onClick={onClose}>
            Done <Check size={16} />
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="dialog-body">
          <p className="muted">Enter the destination and optional link settings.</p>
          <ErrorNotice error={error} />
          <label className="field">
            Destination URL{' '}
            <input
              autoFocus
              required
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com/resources"
              maxLength={2048}
              autoComplete="off"
            />
            <small>Enter a public HTTPS URL.</small>
          </label>
          <label className="field">
            Link title <span className="optional">Optional</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Product documentation"
              maxLength={100}
            />
          </label>
          <label className="field">
            Custom alias <span className="optional">Optional</span>
            <div className="input-prefix">
              <span>/s/</span>
              <input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="product-docs"
                pattern="[a-z0-9][a-z0-9-]{2,46}[a-z0-9]"
                minLength={4}
                maxLength={48}
              />
            </div>
            <small>4–48 lowercase letters, numbers, or hyphens. Leave blank to generate.</small>
          </label>
          <label className="field">
            Expires at <span className="optional">Optional · your local time</span>
            <input
              type="datetime-local"
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
            />
            <small>Leave blank for no expiration. Maximum one year.</small>
          </label>
          <div className="form-footer">
            <span>
              <LockKeyhole size={14} /> Private workspace
            </span>
            <button className="button primary" disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}{' '}
              {busy ? 'Creating…' : 'Create link'}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
