export function formatTeamTaskMetrics(source = {}) {
  const total = Number(source.total) || 0;
  const done = Number(source.done) || 0;
  const active = Number(source.active) || 0;
  const overdue = Number(source.overdue) || 0;

  return {
    tasks: total,
    done,
    active,
    overdue,
    completionRate: total ? Math.round((done / total) * 100) : 0,
  };
}
