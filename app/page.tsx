'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  ExternalLink,
  Link2,
  LoaderCircle,
  LockKeyhole,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import type { LinkPage, LinkView, Overview } from '../src/domain/contracts';
import type { LabResult, ScenarioId } from '../src/lab/scenarios';
import { linkState } from '../src/domain/link';
import { api, HttpError } from '../src/client/api';
import { Dialog, ErrorNotice, CopyButton } from '../components/dialog';
import { CreateDialog } from '../components/create-link-dialog';
import { ActivityChart } from '../components/overview-widgets';
import { ApiReference } from '../components/api-reference';

type View = 'links' | 'activity' | 'diagnostics' | 'api';
type Status = 'all' | 'active' | 'expired' | 'revoked';
const date = (n: number) =>
  new Date(n).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const number = (n: number) => new Intl.NumberFormat().format(n);
const nav: { id: View; title: string }[] = [
  { id: 'links', title: 'Links' },
  { id: 'activity', title: 'Activity' },
  { id: 'diagnostics', title: 'Diagnostics' },
  { id: 'api', title: 'API reference' },
];
const scenarios: { id: ScenarioId; title: string; description: string }[] = [
  {
    id: 'collision',
    title: 'Alias uniqueness',
    description: 'Concurrent requests for one alias produce exactly one link.',
  },
  {
    id: 'idempotency',
    title: 'Request retries',
    description: 'Repeated requests with the same key return the same link.',
  },
  {
    id: 'expiration',
    title: 'Link expiration',
    description: 'Redirects stop at the configured expiration time.',
  },
  {
    id: 'analytics',
    title: 'Analytics isolation',
    description: 'An analytics write failure does not interrupt a redirect.',
  },
  {
    id: 'destination',
    title: 'Destination validation',
    description: 'Rejects unsafe schemes, local addresses, credentials, and redirect loops.',
  },
];

export default function Dashboard() {
  const [view, setView] = useState<View>('links');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [links, setLinks] = useState<LinkView[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<LinkView | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [detailError, setDetailError] = useState<Error | null>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [labResults, setLabResults] = useState<Partial<Record<ScenarioId, LabResult>>>({});
  const [running, setRunning] = useState<ScenarioId | 'all' | null>(null);
  const [labError, setLabError] = useState<Error | null>(null);
  const [moreBusy, setMoreBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>('all');
  const [sort, setSort] = useState('newest');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4500);
  }, []);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const [list, stats] = await Promise.all([
        api<LinkPage>('/links', { signal }),
        api<Overview>('/overview', { signal }),
      ]);
      setLinks(list.links);
      setNextCursor(list.nextCursor);
      setOverview(stats);
      setUpdatedAt(Date.now());
      setError(null);
    } catch (err) {
      if (!signal?.aborted) setError(err as Error);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => refresh(controller.signal));
    const updateActivity = () => {
      if (document.visibilityState !== 'visible') return;
      void api<Overview>('/overview', { signal: controller.signal })
        .then((stats) => {
          if (!controller.signal.aborted) setOverview(stats);
        })
        .catch(() => {
          /* Keep the last snapshot; explicit refresh exposes failures. */
        });
    };
    const timer = setInterval(updateActivity, 30000);
    window.addEventListener('focus', updateActivity);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener('focus', updateActivity);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [refresh]);
  function go(next: View) {
    setView(next);
  }
  async function runLab(id: ScenarioId | 'all') {
    setRunning(id);
    setLabError(null);
    try {
      for (const scenario of id === 'all' ? scenarios.map((s) => s.id) : [id]) {
        const result = await api<LabResult>('/lab', {
          method: 'POST',
          body: JSON.stringify({ scenario }),
        });
        setLabResults((prev) => ({ ...prev, [scenario]: result }));
      }
    } catch (err) {
      setLabError(err as Error);
    } finally {
      setRunning(null);
    }
  }
  async function revoke() {
    if (!selected || revoking) return;
    setRevoking(true);
    setDetailError(null);
    try {
      const result = await api<{ link: LinkView }>(`/links/${selected.id}`, {
        method: 'DELETE',
        headers: { 'If-Match': `"${selected.version}"` },
      });
      setSelected(result.link);
      setConfirmRevoke(false);
      notify('Link revoked. Redirects are disabled.');
      await refresh();
    } catch (err) {
      setDetailError(err as Error);
    } finally {
      setRevoking(false);
    }
  }
  const filtered = links
    .filter(
      (link) =>
        `${link.title} ${link.alias} ${link.targetUrl}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (status === 'all' || linkState(link, now) === status),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.title.localeCompare(b.title)
        : sort === 'oldest'
          ? a.createdAt - b.createdAt
          : b.createdAt - a.createdAt,
    );
  const total = overview?.totals;
  const filters: { id: Status; label: string; count?: number }[] = [
    { id: 'all', label: 'All links', count: total?.total },
    { id: 'active', label: 'Active', count: total?.active },
    { id: 'expired', label: 'Expired', count: total?.expired },
    { id: 'revoked', label: 'Revoked', count: total?.revoked },
  ];
  function showDetails(link: LinkView) {
    setSelected(link);
    setConfirmRevoke(false);
    setDetailError(null);
  }
  async function refreshWorkspace() {
    if (refreshing) return;
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }
  async function loadMore() {
    if (!nextCursor || moreBusy) return;
    setMoreBusy(true);
    try {
      const next = await api<LinkPage>(`/links?cursor=${encodeURIComponent(nextCursor)}`);
      setLinks((prev) => [
        ...new Map([...prev, ...next.links].map((link) => [link.id, link])).values(),
      ]);
      setNextCursor(next.nextCursor);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setMoreBusy(false);
    }
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="masthead container">
          <button className="brand" onClick={() => go('links')} aria-label="LinkLab home">
            <span className="brand-mark">
              <Link2 size={27} strokeWidth={2.2} />
            </span>
            <span className="brand-name">
              LinkLab<span>Link management</span>
            </span>
          </button>
          <div className="account-context">
            <LockKeyhole size={14} />
            <span>
              Personal workspace<small>Private access</small>
            </span>
          </div>
        </div>
        <div className="nav-bar">
          <nav className="container primary-nav" aria-label="Main navigation">
            {nav.map((item) => (
              <button
                key={item.id}
                className={view === item.id ? 'selected' : ''}
                aria-current={view === item.id ? 'page' : undefined}
                onClick={() => go(item.id)}
              >
                {item.title}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="container" id="main" tabIndex={-1}>
        <div className="breadcrumbs">
          <span>Workspace</span>
          <ChevronRight size={12} />
          <span>{nav.find((item) => item.id === view)?.title}</span>
        </div>
        {view !== 'api' && (
          <div className="page-heading">
            <div>
              <h1>
                {view === 'links'
                  ? 'Link management'
                  : view === 'activity'
                    ? 'Activity'
                    : 'Diagnostics'}
              </h1>
              <p>
                {view === 'links'
                  ? 'Manage destinations, access, and expiration.'
                  : view === 'activity'
                    ? 'Redirect activity and recent changes in your workspace.'
                    : 'Run service checks and review the results.'}
              </p>
            </div>
            <div className="heading-actions">
              {view !== 'diagnostics' ? (
                <>
                  <button
                    className="button secondary"
                    disabled={refreshing || loading}
                    onClick={() => void refreshWorkspace()}
                  >
                    <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
                    <span>Refresh</span>
                  </button>
                  <button className="button primary" onClick={() => setCreate(true)}>
                    <Plus size={17} />
                    Create link
                  </button>
                </>
              ) : (
                <button
                  className="button primary"
                  disabled={running !== null}
                  onClick={() => void runLab('all')}
                >
                  {running && <LoaderCircle size={16} className="spin" />}
                  {running ? 'Running checks…' : 'Run all checks'}
                </button>
              )}
            </div>
          </div>
        )}
        <ErrorNotice error={error} />
        {error instanceof HttpError && error.status === 401 && (
          <a
            className="button primary signin"
            href="/signin-with-chatgpt?return_to=%2F"
            target="_top"
          >
            Sign in to your workspace
            <ArrowRight size={16} />
          </a>
        )}
        {error && !(error instanceof HttpError && error.status === 401) && (
          <button className="button secondary retry" onClick={() => void refreshWorkspace()}>
            Retry connection
          </button>
        )}
        {(view === 'links' || view === 'activity') && (
          <section className="summary-strip" aria-label="Workspace summary">
            {[
              { label: 'Total links', value: total?.total, note: 'In this workspace' },
              { label: 'Active links', value: total?.active, note: 'Available for redirects' },
              {
                label: 'Recorded redirects',
                value: overview?.redirects,
                note: 'Last 7 UTC calendar days',
              },
              {
                label: 'Inactive links',
                value: total ? total.expired + total.revoked : undefined,
                note: total
                  ? `${number(total.expired)} expired · ${number(total.revoked)} revoked`
                  : 'Expired and revoked',
              },
            ].map((item) => (
              <div className="summary-item" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value === undefined ? '—' : number(item.value)}</strong>
                <small>{item.note}</small>
              </div>
            ))}
          </section>
        )}
        {view === 'links' && (
          <section className="panel directory" aria-labelledby="directory-title">
            <div className="panel-heading">
              <h2 id="directory-title">Link directory</h2>
              <span className="snapshot-label">
                {updatedAt
                  ? `Updated ${new Date(updatedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
                  : 'Awaiting connection'}
              </span>
            </div>
            <div className="status-tabs" aria-label="Filter by link status">
              {filters.map((item) => (
                <button
                  key={item.id}
                  className={status === item.id ? 'selected' : ''}
                  aria-pressed={status === item.id}
                  onClick={() => setStatus(item.id)}
                >
                  {item.label}
                  <span>{item.count === undefined ? '—' : number(item.count)}</span>
                </button>
              ))}
            </div>
            <div className="table-toolbar">
              <label className="search">
                <Search size={17} />
                <input
                  aria-label="Search loaded links"
                  placeholder="Search by name, alias, or destination"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="icon-button"
                    aria-label="Clear search"
                    onClick={() => setSearch('')}
                  >
                    <X size={15} />
                  </button>
                )}
              </label>
              <label className="sort-label">
                Sort by
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Name A–Z</option>
                </select>
              </label>
            </div>
            {loading && !links.length ? (
              <div className="loading-state">
                <LoaderCircle size={20} className="spin" />
                Loading links…
              </div>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="links-table">
                    <thead>
                      <tr>
                        <th scope="col">Name / destination</th>
                        <th scope="col">Short link</th>
                        <th scope="col">Status</th>
                        <th scope="col">Created</th>
                        <th scope="col">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((link) => (
                        <tr key={link.id}>
                          <td>
                            <button
                              className="text-link link-title"
                              onClick={() => showDetails(link)}
                            >
                              {link.title}
                            </button>
                            <span className="destination" title={link.targetUrl}>
                              {link.targetUrl.replace(/^https:\/\//, '')}
                            </span>
                          </td>
                          <td>
                            <a
                              className="alias-link"
                              href={link.shortUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              /s/{link.alias}
                              <ArrowUpRight size={13} />
                            </a>
                          </td>
                          <td>
                            <span className={`badge ${linkState(link, now)}`}>
                              <i />
                              {linkState(link, now)}
                            </span>
                          </td>
                          <td className="date-cell">{date(link.createdAt)}</td>
                          <td>
                            <div className="row-actions">
                              <CopyButton
                                value={link.shortUrl}
                                label={`Copy ${link.title}`}
                                notify={notify}
                              />
                              <button
                                className="icon-button"
                                title="Link details"
                                aria-label={`Details for ${link.title}`}
                                onClick={() => showDetails(link)}
                              >
                                <MoreHorizontal size={19} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!filtered.length && (
                  <div className="empty-state">
                    <Link2 size={27} />
                    <h3>{search || status !== 'all' ? 'No matching links' : 'No links yet'}</h3>
                    <p>
                      {search || status !== 'all'
                        ? 'Adjust the filters or load more links.'
                        : 'Create a link to add a destination to your workspace.'}
                    </p>
                    {search || status !== 'all' ? (
                      <button
                        className="text-button"
                        onClick={() => {
                          setSearch('');
                          setStatus('all');
                        }}
                      >
                        Clear filters
                      </button>
                    ) : (
                      !error && (
                        <button className="button secondary" onClick={() => setCreate(true)}>
                          Create link
                        </button>
                      )
                    )}
                  </div>
                )}
              </>
            )}
            <div className="table-footer">
              <div>
                <span>
                  {number(filtered.length)} shown · {number(links.length)} of{' '}
                  {total ? number(total.total) : '—'} loaded
                </span>
                <small>Search, filters, and sorting apply to loaded links.</small>
              </div>
              {nextCursor && (
                <button
                  className="button secondary"
                  disabled={moreBusy}
                  onClick={() => void loadMore()}
                >
                  {moreBusy ? <LoaderCircle className="spin" size={15} /> : <ArrowDown size={15} />}
                  Load more
                </button>
              )}
            </div>
          </section>
        )}
        {view === 'activity' && (
          <>
            <section className="panel">
              <div className="panel-heading">
                <h2>Recorded redirects</h2>
                <span className="period-label">
                  <Clock3 size={14} />
                  Last 7 days · UTC
                </span>
              </div>
              <ActivityChart series={overview?.series ?? []} />
              <div className="chart-note">
                <i />
                GET redirects
                <span>Includes repeat requests. Counts may be delayed or incomplete.</span>
              </div>
            </section>
            <div className="activity-grid">
              <section className="panel">
                <div className="panel-heading">
                  <h2>Most visited links</h2>
                  <span className="muted small">7-day total</span>
                </div>
                {overview?.popular.some((link) => link.count > 0) ? (
                  overview.popular
                    .filter((link) => link.count > 0)
                    .map((link, i) => (
                      <div className="rank-row" key={link.id}>
                        <span className="rank">{i + 1}</span>
                        <div>
                          <strong>{link.title}</strong>
                          <small>/s/{link.alias}</small>
                        </div>
                        <strong>{number(link.count)}</strong>
                      </div>
                    ))
                ) : (
                  <p className="quiet-empty">No redirects recorded in this period.</p>
                )}
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Recent changes</h2>
                  <span className="muted small">Latest 10 events</span>
                </div>
                {overview?.audit.length ? (
                  overview.audit.map((event) => (
                    <div className="audit-row" key={event.id}>
                      <span className="audit-icon">
                        {event.action === 'link.created' ? (
                          <Plus size={15} />
                        ) : (
                          <LockKeyhole size={15} />
                        )}
                      </span>
                      <div>
                        <strong>
                          {event.action === 'link.created' ? 'Link created' : 'Link revoked'}
                        </strong>
                        <small>{new Date(event.occurredAt).toLocaleString()}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="quiet-empty">No changes recorded.</p>
                )}
              </section>
            </div>
          </>
        )}
        {view === 'diagnostics' && (
          <>
            <div className="info-banner">
              <div>
                <strong>Checks run on temporary test data.</strong>
                <p>Your links are not modified. Up to 5 checks can run per minute.</p>
              </div>
            </div>
            <ErrorNotice error={labError} />
            <section className="panel">
              <div className="panel-heading">
                <h2>Service checks</h2>
                <span className="muted small">
                  {Object.values(labResults).filter((result) => result.passed).length} of 5 passed
                  this session
                </span>
              </div>
              <div className="diagnostic-list">
                {scenarios.map((scenario) => {
                  const result = labResults[scenario.id];
                  return (
                    <div className="diagnostic-row" key={scenario.id}>
                      <div className="check-description">
                        <h3>{scenario.title}</h3>
                        <p>{scenario.description}</p>
                        {result && (
                          <details className="check-details">
                            <summary>View results</summary>
                            <dl>
                              <dt>Expected</dt>
                              <dd>{result.expected}</dd>
                              <dt>Observed</dt>
                              <dd>{result.observed}</dd>
                            </dl>
                            <small>
                              {result.assertions} assertions · {result.durationMs} ms
                            </small>
                          </details>
                        )}
                      </div>
                      <span
                        className={`check-status ${result ? (result.passed ? 'passed' : 'failed') : ''}`}
                      >
                        {result ? (result.passed ? 'Passed' : 'Failed') : 'Not run'}
                      </span>
                      <button
                        className="button secondary small-button"
                        disabled={running !== null}
                        onClick={() => void runLab(scenario.id)}
                      >
                        {running === scenario.id ? 'Running…' : 'Run check'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
            <p className="fine-print">
              Results apply to the checks shown. They do not measure service availability or
              performance under load.
            </p>
          </>
        )}
        {view === 'api' && <ApiReference />}
        <footer className="page-footer">
          <span>LinkLab · Link management</span>
          <button onClick={() => go('api')}>
            API reference
            <ChevronRight size={13} />
          </button>
        </footer>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      {create && (
        <CreateDialog
          onClose={() => setCreate(false)}
          onCreated={() => {
            void refresh();
          }}
          notify={notify}
        />
      )}
      {selected && (
        <Dialog
          title="Link details"
          onClose={() => {
            if (!revoking) setSelected(null);
          }}
        >
          <div className="dialog-body">
            <div className="detail-title">
              <span className={`badge ${linkState(selected, now)}`}>
                <i />
                {linkState(selected, now)}
              </span>
              <h3>{selected.title}</h3>
            </div>
            <div className="copy-field">
              <a href={selected.shortUrl} target="_blank" rel="noopener noreferrer">
                {selected.shortUrl}
              </a>
              <CopyButton value={selected.shortUrl} notify={notify} />
            </div>
            <dl className="detail-list">
              <dt>Destination</dt>
              <dd>
                <a href={selected.targetUrl} target="_blank" rel="noopener noreferrer">
                  {selected.targetUrl} <ExternalLink size={13} />
                </a>
              </dd>
              <dt>Created</dt>
              <dd>{new Date(selected.createdAt).toLocaleString()}</dd>
              <dt>Expiration</dt>
              <dd>
                {selected.expiresAt
                  ? new Date(selected.expiresAt).toLocaleString()
                  : 'No expiration'}
              </dd>
            </dl>
            <ErrorNotice error={detailError} />
            {selected.revokedAt === null && (
              <div className="danger-zone">
                <h4>Revoke this link</h4>
                <p>
                  Disables this short link permanently. The alias remains reserved and cannot be
                  reused.
                </p>
                {confirmRevoke ? (
                  <div className="confirm-row">
                    <button
                      className="button secondary"
                      disabled={revoking}
                      onClick={() => setConfirmRevoke(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="button danger"
                      disabled={revoking}
                      onClick={() => void revoke()}
                    >
                      {revoking ? 'Revoking…' : 'Confirm revocation'}
                    </button>
                  </div>
                ) : (
                  <button className="button danger-outline" onClick={() => setConfirmRevoke(true)}>
                    Revoke link
                  </button>
                )}
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
