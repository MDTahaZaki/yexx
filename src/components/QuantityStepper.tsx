interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export default function QuantityStepper({ value, onChange, min = 1, max = 20 }: QuantityStepperProps) {
  return (
    <div className="flex items-center border border-black/25">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className="flex h-11 w-11 items-center justify-center text-lg disabled:opacity-30"
      >
        −
      </button>
      <span className="flex h-11 w-12 items-center justify-center border-x border-black/25 text-sm font-mono tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="flex h-11 w-11 items-center justify-center text-lg disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
