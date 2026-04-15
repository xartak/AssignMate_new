import type { SingleChoiceDetails } from "@/features/assignments/types";

export function SingleChoiceForm({
  details,
  value,
  onChange,
  disabled = false,
}: {
  details: SingleChoiceDetails;
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="stack">
      {details.options.map((option) => (
        <label key={option.id} className="row">
          <input
            type="radio"
            name="single"
            value={option.id}
            checked={value === option.id}
            onChange={() => onChange(option.id)}
            disabled={disabled}
          />
          <span>{option.text}</span>
        </label>
      ))}
    </div>
  );
}
