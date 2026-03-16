import { useState } from "react";
import type { FillBlankDetails } from "@/features/assignments/types";

export function FillBlankForm({
  details,
  onSubmit,
}: {
  details: FillBlankDetails;
  onSubmit: (payload: { answers: { position: number; answer_text: string }[] }) => void;
}) {
  const [answers, setAnswers] = useState(() =>
    details.blanks.map((blank) => ({ position: blank.position, answer_text: "" }))
  );

  const updateAnswer = (index: number, value: string) => {
    setAnswers((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, answer_text: value } : item))
    );
  };

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ answers });
      }}
    >
      <div className="card">
        <div className="muted">Текст с пропусками:</div>
        <div>{details.text_template}</div>
      </div>
      <div className="stack">
        {answers.map((item, index) => (
          <div key={item.position}>
            <label>Пропуск {item.position}</label>
            <input
              value={item.answer_text}
              onChange={(event) => updateAnswer(index, event.target.value)}
              placeholder="Введите ответ"
            />
          </div>
        ))}
      </div>
      <button type="submit">Отправить ответ</button>
    </form>
  );
}
