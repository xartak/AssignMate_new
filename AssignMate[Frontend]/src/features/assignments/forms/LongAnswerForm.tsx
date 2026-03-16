import { useState } from "react";
import type { LongAnswerDetails } from "@/features/assignments/types";

export function LongAnswerForm({
  details,
  onSubmit,
}: {
  details: LongAnswerDetails;
  onSubmit: (payload: { answer_text: string; files?: File[] }) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ answer_text: answer, files });
      }}
    >
      <textarea
        rows={6}
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        placeholder="Развернутый ответ"
      />
      <div>
        <label>Файлы (до {details.max_files})</label>
        <input
          type="file"
          multiple
          onChange={(event) => {
            const selected = Array.from(event.target.files || []);
            setFiles(selected.slice(0, details.max_files));
          }}
        />
      </div>
      <button type="submit">Отправить ответ</button>
    </form>
  );
}
