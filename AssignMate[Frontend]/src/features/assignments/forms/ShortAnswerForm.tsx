import { useState } from "react";
import type { ShortAnswerDetails } from "@/features/assignments/types";

export function ShortAnswerForm({
  details,
  onSubmit,
}: {
  details: ShortAnswerDetails;
  onSubmit: (payload: { answer_text: string }) => void;
}) {
  const [answer, setAnswer] = useState("");

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ answer_text: answer });
      }}
    >
      <div className="muted">Максимум {details.max_length} символов</div>
      <textarea
        rows={4}
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
      />
      <button type="submit">Отправить ответ</button>
    </form>
  );
}
