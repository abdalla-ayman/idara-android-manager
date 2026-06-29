import { Minus, Plus } from 'lucide-react';

export default function Stepper({ value, min = 1, max = 168, step = 1, onChange, suffix }) {
  const clamp = (v) => Math.max(min, Math.min(max, v));
  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper__btn"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        aria-label="decrease"
      >
        <Minus size={16} />
      </button>
      <div className="stepper__display">
        <span className="stepper__value">{value}</span>
        {suffix && <span className="stepper__suffix">{suffix}</span>}
      </div>
      <button
        type="button"
        className="stepper__btn"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        aria-label="increase"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
