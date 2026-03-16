type NumberInputProps = {
  id?: string;
  value: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function clamp(value: number, min?: number, max?: number) {
  let result = value;
  if (typeof min === "number") {
    result = Math.max(result, min);
  }
  if (typeof max === "number") {
    result = Math.min(result, max);
  }
  return result;
}

export function NumberInput({
  id,
  value,
  min,
  max,
  step = 1,
  placeholder,
  disabled,
  onChange,
}: NumberInputProps) {
  const adjust = (delta: number) => {
    const base = value.trim() === "" ? 0 : Number(value);
    const safeBase = Number.isFinite(base) ? base : 0;
    const next = clamp(safeBase + delta, min, max);
    onChange(String(next));
  };

  return (
    <div className="number-input">
      <button
        type="button"
        className="number-button"
        onClick={() => adjust(-step)}
        disabled={disabled}
      >
        -
      </button>
      <input
        id={id}
        className="auth-input"
        type="number"
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
      <button
        type="button"
        className="number-button"
        onClick={() => adjust(step)}
        disabled={disabled}
      >
        +
      </button>
    </div>
  );
}
