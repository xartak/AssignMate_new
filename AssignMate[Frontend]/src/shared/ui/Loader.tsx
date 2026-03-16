export function Loader({ label = "Загрузка..." }: { label?: string }) {
  return <div className="card">{label}</div>;
}
