export function EmptyState({ label = "Нет данных" }: { label?: string }) {
  return (
    <div className="empty-state card">
      <svg
        className="empty-state-icon"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M4 7.5A2.5 2.5 0 0 1 6.5 5h3.2a2 2 0 0 1 1.55.74l.91 1.12A2 2 0 0 0 13.71 7.6h3.79A2.5 2.5 0 0 1 20 10.1V16.5A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      <span className="empty-state-label">{label}</span>
    </div>
  );
}
