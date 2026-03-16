import type { ApiError } from "@/shared/api/base";

export function ErrorState({ error }: { error: unknown }) {
  const apiError = error as ApiError | null;
  return (
    <div className="card">
      <div>Ошибка загрузки</div>
      {apiError?.status && <div className="muted">HTTP {apiError.status}</div>}
      {apiError?.details && (
        <pre className="code">{JSON.stringify(apiError.details, null, 2)}</pre>
      )}
    </div>
  );
}
