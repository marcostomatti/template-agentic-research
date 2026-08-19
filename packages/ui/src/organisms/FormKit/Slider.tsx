import type { CSSProperties } from 'react';

import { cn } from '../../lib';

import { sliderInput } from './FormKit.variants';

export interface SliderProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Formats the mono readout next to the track (e.g. 184000 → "184k"). */
  format?: (value: number) => string;
  className?: string;
}

export const Slider = ({
  id,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  format,
  className,
}: SliderProps) => {
  const pct = ((value - min) / (max - min)) * 100;
  // --pct drives the track's filled/unfilled gradient — genuinely dynamic.
  const style = { '--pct': `${pct}%` } as CSSProperties;
  return (
    <div className={cn('flex items-center gap-[13px]', className)}>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={sliderInput()}
        style={style}
      />
      <span className="min-w-16 text-right font-mono text-[13px] font-semibold text-fg1">
        {format
          ? format(value)
          : value}
      </span>
    </div>
  );
};

Slider.displayName = 'Slider';
