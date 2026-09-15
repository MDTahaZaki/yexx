interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export default function QuantityStepper({ value, onChange, min = 1, max = 20 }: QuantityStepperProps) {
  return (
    // inline-flex, not flex: this sizes to its content everywhere, including
    // where the immediate parent is a plain block `<div>` inside a `flex-col`
    // ancestor — that ancestor's default `align-items: stretch` stretches
    // the plain div to full width, and a block-level `flex` child then fills
    // 100% of THAT (block boxes default to "fill available width," unlike
    // flex items). `inline-flex` generates an inline-level box instead, so
    // it shrink-wraps to its three squares regardless of the parent's own
    // layout — it also still behaves like any other flex item in the
    // contexts where the direct parent already is a flex container.
    <div className="inline-flex items-center border border-ink/25">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className="flex h-11 w-11 shrink-0 items-center justify-center text-lg disabled:opacity-30"
      >
        −
      </button>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center border-x border-ink/25 text-sm font-mono tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="flex h-11 w-11 shrink-0 items-center justify-center text-lg disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
