export function Loader({ label = "Загрузка..." }: { label?: string }) {
  return (
    <div className="loader card">
      <span className="loader-spinner" aria-hidden />
      <span className="loader-label">{label}</span>
    </div>
  );
}
