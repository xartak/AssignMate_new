import { useState } from "react";
import type { SingleChoiceDetails } from "@/features/assignments/types";

export function SingleChoiceForm({
  details,
  onSubmit,
}: {
  details: SingleChoiceDetails;
  onSubmit: (payload: { selected_option: number }) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        if (selected !== null) {
          onSubmit({ selected_option: selected });
        }
      }}
    >
      <div className="stack">
        {details.options.map((option) => (
          <label key={option.id} className="row">
            <input
              type="radio"
              name="single"
              value={option.id}
              checked={selected === option.id}
              onChange={() => setSelected(option.id)}
            />
            <span>{option.text}</span>
          </label>
        ))}
      </div>
      <button type="submit">Отправить ответ</button>
    </form>
  );
}
