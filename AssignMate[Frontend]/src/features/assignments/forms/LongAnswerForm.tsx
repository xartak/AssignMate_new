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
  const remaining = details.max_files - value.files.length;

  function addFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    const existingNames = new Set(value.files.map((f) => f.name));
    const newUnique = selected.filter((f) => !existingNames.has(f.name));
    const merged = [...value.files, ...newUnique].slice(0, details.max_files);
    onChange({ ...value, files: merged });
  }

  function removeFile(index: number) {
    const updated = value.files.filter((_, i) => i !== index);
    onChange({ ...value, files: updated });
  }

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
        {!disabled && remaining > 0 && (
          <input
            type="file"
            multiple
            onChange={addFiles}
          />
        )}
        {value.files.length > 0 && (
          <ul className="muted" style={{ margin: "4px 0", paddingLeft: 0, listStyle: "none" }}>
            {value.files.map((file, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>{file.name}</span>
                {!disabled && (
                  <button type="button" onClick={() => removeFile(i)} style={{ cursor: "pointer" }}>
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {!disabled && remaining <= 0 && (
          <div className="muted">Достигнут лимит файлов ({details.max_files})</div>
        )}
      </div>
    </div>
  );
}
