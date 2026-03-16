export function EmptyState({ label = "Нет данных" }: { label?: string }) {
  return <div className="card muted">{label}</div>;
}
