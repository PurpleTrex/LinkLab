export function ActivityChart({ series }: { series: { day: string; count: number }[] }) {
  if (!series.length) return <div className="loading-state">Waiting for activity data…</div>;
  const data = series;
  const max = Math.max(4, ...data.map((d) => d.count));
  return (
    <div className="chart">
      <div className="y-labels">
        <span>{max}</span>
        <span>{Math.round(max / 2)}</span>
        <span>0</span>
      </div>
      <div className="plot">
        <div className="gridline top" />
        <div className="gridline middle" />
        <div className="gridline bottom" />
        <div className="bars">
          {data.map((d, i) => (
            <div className="bar-column" key={d.day}>
              <div
                className={`bar ${i === 6 ? 'latest' : ''}`}
                style={{ height: `${(d.count / max) * 100}%` }}
                title={`${d.day}: ${d.count} recorded redirects`}
              >
                <span className="sr-only">
                  {d.day}: {d.count}
                </span>
              </div>
              <span className="x-label">
                {new Date(`${d.day}T12:00:00Z`).toLocaleDateString(undefined, {
                  weekday: 'short',
                  timeZone: 'UTC',
                })}
              </span>
            </div>
          ))}
        </div>
        {data.every((d) => d.count === 0) && (
          <span className="chart-zero">No redirects recorded in this period.</span>
        )}
      </div>
    </div>
  );
}
