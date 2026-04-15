import type { LongAnswerDetails } from "@/features/assignments/types";

export function LongAnswerForm({
  details,
  value,
  onChange,
  disabled = false,
}: {
  details: LongAnswerDetails;
  value: { answer_text: string; files: File[] };
  onChange: (value: { answer_text: string; files: File[] }) => void;
  disabled?: boolean;
}) {
  return (
    <div className="stack">
      <textarea
        rows={6}
        className="auth-input"
        value={value.answer_text}
        onChange={(event) => onChange({ ...value, answer_text: event.target.value })}
        placeholder="Развернутый ответ"
        disabled={disabled}
      />
      <div>
        <label>Файлы (до {details.max_files})</label>
        <input
          type="file"
          multiple
          disabled={disabled}
          onChange={(event) => {
            const selected = Array.from(event.target.files || []);
            onChange({
              ...value,
              files: selected.slice(0, details.max_files),
            });
          }}
        />
        {value.files.length > 0 && (
          <div className="muted">
            Файлы: {value.files.map((file) => file.name).join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}
