import type { MultipleChoiceDetails } from "@/features/assignments/types";

export function MultipleChoiceForm({
  details,
  value,
  onChange,
  disabled = false,
}: {
  details: MultipleChoiceDetails;
  value: number[];
  onChange: (value: number[]) => void;
  disabled?: boolean;
}) {
  const toggleOption = (id: number) => {
    const next = value.includes(id)
      ? value.filter((item) => item !== id)
      : [...value, id];
    onChange(next);
  };

  return (
    <div className="stack">
      {details.options.map((option) => (
        <label key={option.id} className="row">
          <input
            type="checkbox"
            value={option.id}
            checked={value.includes(option.id)}
            onChange={() => toggleOption(option.id)}
            disabled={disabled}
          />
          <span>{option.text}</span>
        </label>
      ))}
    </div>
  );
}
