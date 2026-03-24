/* Base UI Components */

function Loading() {
  return <div className="loading">Loading data...</div>;
}

function EmptyState({ icon, message }) {
  return (
    <div className="empty-state">
      <div className="icon">{icon || "—"}</div>
      <p>{message || "No data available."}</p>
    </div>
  );
}

function MetricCard({ label, value, className }) {
  return (
    <div className={`metric-card ${className || ""}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

function DataTable({ columns, rows }) {
  if (!rows || !rows.length) return <EmptyState message="No rows." />;
  const tableRef = React.useRef(null);

  React.useEffect(() => {
    if (typeof gsap === "undefined" || !tableRef.current) return;
    const trs = tableRef.current.querySelectorAll("tbody tr");
    if (!trs.length) return;
    gsap.fromTo(
      trs,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.03, ease: "power2.out" },
    );
  }, [rows]);

  return (
    <div className="table-container">
      <table className="data-table" ref={tableRef}>
        <thead>
          <tr>
            <th className="rank">#</th>
            {columns.map(function (c) {
              return <th key={c.key}>{c.label}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map(function (row, i) {
            return (
              <tr key={i}>
                <td className="rank">{i + 1}</td>
                {columns.map(function (c) {
                  return (
                    <td key={c.key} className={c.numeric ? "value-cell" : ""}>
                      {row[c.key]}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Export to window for global access
window.Loading = Loading;
window.EmptyState = EmptyState;
window.MetricCard = MetricCard;
window.DataTable = DataTable;
