import type { FillBlankDetails } from "@/features/assignments/types";

export function FillBlankForm({
  details,
  value,
  onChange,
  disabled = false,
}: {
  details: FillBlankDetails;
  value: { position: number; answer_text: string }[];
  onChange: (value: { position: number; answer_text: string }[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="stack">
      <div className="card">
        <div className="muted">Текст с пропусками:</div>
        <div>{details.text_template}</div>
      </div>
      <div className="stack">
        {value.map((item, index) => (
          <div key={item.position}>
            <label>Пропуск {item.position}</label>
            <input
              className="auth-input"
              value={item.answer_text}
              onChange={(event) => {
                const next = value.map((answer, idx) =>
                  idx === index ? { ...answer, answer_text: event.target.value } : answer
                );
                onChange(next);
              }}
              placeholder="Введите ответ"
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
