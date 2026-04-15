import type { ShortAnswerDetails } from "@/features/assignments/types";

export function ShortAnswerForm({
  details,
  value,
  onChange,
  disabled = false,
}: {
  details: ShortAnswerDetails;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="stack">
      <div className="muted">Максимум {details.max_length} символов</div>
      <textarea
        rows={4}
        className="auth-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
