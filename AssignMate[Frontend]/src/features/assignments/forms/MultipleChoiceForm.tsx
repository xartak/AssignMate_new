import { useState } from "react";
import type { MultipleChoiceDetails } from "@/features/assignments/types";

export function MultipleChoiceForm({
  details,
  onSubmit,
}: {
  details: MultipleChoiceDetails;
  onSubmit: (payload: { selected_options: number[] }) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);

  const toggleOption = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ selected_options: selected });
      }}
    >
      <div className="stack">
        {details.options.map((option) => (
          <label key={option.id} className="row">
            <input
              type="checkbox"
              value={option.id}
              checked={selected.includes(option.id)}
              onChange={() => toggleOption(option.id)}
            />
            <span>{option.text}</span>
          </label>
        ))}
      </div>
      <button type="submit">Отправить ответ</button>
    </form>
  );
}
