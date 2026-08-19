import { forwardRef, useMemo, type HTMLAttributes, type ReactNode } from 'react';

import {
  formatDate,
  resolveLocale,
  toDate,
  type DateInput,
} from '../../lib';
import { SectionCard } from '../SectionCard';

import {
  calendarHeatmapCell,
  calendarHeatmapHourLabel,
  calendarHeatmapLabel,
  calendarHeatmapLegendSwatch,
} from './CalendarHeatmap.variants';

export interface CalendarHeatmapDatum {
  /** Calendar day of the observation. */
  date: DateInput;
  /** Hour of day (0–23) — required by the week mode, ignored otherwise. */
  hour?: number;
  value: number;
}

export interface CalendarHeatmapCellInfo {
  date: Date;
  hour?: number;
  value: number;
}

export interface CalendarHeatmapProps
  extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: string;
  subtitle?: ReactNode;
  /** Header right slot — range selector / calendar switcher. */
  action?: ReactNode;
  /**
   * Grid shape: `week` = 7 day-rows × 24 hour-columns (hour labels every
   * 4h); `90d` / `180d` = 7 weekday-rows × week-columns ending at `end`.
   */
  range?: 'week' | '90d' | '180d';
  /** First day of the week (settings-driven later; spec default monday). */
  weekStart?: 'monday' | 'sunday';
  data: CalendarHeatmapDatum[];
  /**
   * Reference "now" the range ends at — inject a fixed date in stories
   * for deterministic output. Defaults to today.
   */
  end?: DateInput;
  /** Intensity ceiling; defaults to the max value in `data`. */
  max?: number;
  /** Unit label for the default tooltip (`tokens`, `runs`). */
  unit?: string;
  /** quiet→busy legend row (original design). Default true. */
  showLegend?: boolean;
  /** Hover tooltip text; default formats date/hour + value. Null disables. */
  formatTooltip?: ((cell: CalendarHeatmapCellInfo) => string) | null;
  /** Drill-down: cells render as buttons when present. */
  onCellClick?: (cell: CalendarHeatmapCellInfo) => void;
  locale?: string;
}

const QUIET_FLOOR = 0.05;
const LEGEND_STOPS = [0.1, 0.3, 0.5, 0.7, 0.9];

const startOfDay = (input: DateInput): Date => {
  const d = toDate(input);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const addDays = (date: Date, days: number): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const dayKey = (date: Date): string => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

/** Row index of a date given the configured week start. */
const weekdayIndex = (date: Date, weekStart: 'monday' | 'sunday'): number => (weekStart === 'monday'
  ? (date.getDay() + 6) % 7
  : date.getDay());

/** Original formula: accent mixed at `round(intensity × 90)%` into transparent. */
const intensityBackground = (intensity: number): string => `color-mix(in oklab, var(--accent) ${Math.round(intensity * 90)}%, transparent)`;

const weekdayLabels = (weekStart: 'monday' | 'sunday', locale?: string): string[] => {
  const fmt = new Intl.DateTimeFormat(resolveLocale(locale), { weekday: 'short' });
  // 2026-05-04 is a Monday; walk one fixed week in display order.
  const monday = new Date(2026, 4, 4);
  return Array.from({ length: 7 }, (_, i) => fmt.format(addDays(monday, weekStart === 'monday'
    ? i
    : i - 1)));
};

interface Cell {
  key: string;
  info: CalendarHeatmapCellInfo | null;
  intensity: number;
}

/**
 * CalendarHeatmap — activity heatmap (original design `ActivityHeatmap`, the original usage screen
 * "When agents run"; contract: the component spec).
 *
 * Interpretation decisions (spec leaves open):
 * - 90/180-day geometry: the spec's "90 or 180 columns" cannot coexist
 *   with its own 7 weekday rows + bottom-right-is-last-day rule; the grid
 *   renders GitHub-style — 7 weekday rows × week columns (13/26), cells
 *   outside the range invisible.
 * - tooltips use the native title attr (hundreds of cells; a Radix
 *   tooltip per cell is not worth the tree) via `formatTooltip`.
 */
export const CalendarHeatmap = forwardRef<HTMLElement, CalendarHeatmapProps>(
  (
    {
      className,
      title,
      subtitle,
      action,
      range = 'week',
      weekStart = 'monday',
      data,
      end,
      max,
      unit,
      showLegend = true,
      formatTooltip,
      onCellClick,
      locale,
      ...props
    },
    ref,
  ) => {
    const endMs = startOfDay(end ?? new Date()).getTime();
    const peak = max ?? Math.max(...data.map((d) => d.value), 0);

    const { rows, columns, dayLabels } = useMemo(() => {
      const endDay = new Date(endMs);
      const labels = weekdayLabels(weekStart, locale);
      const values = new Map<string, number>();
      for (const datum of data) {
        const day = startOfDay(datum.date);
        const key = range === 'week'
          ? `${dayKey(day)}:${datum.hour ?? 0}`
          : dayKey(day);
        values.set(key, (values.get(key) ?? 0) + datum.value);
      }
      const intensityOf = (value: number): number => (peak > 0
        ? Math.max(0, Math.min(1, value / peak))
        : 0);

      if (range === 'week') {
        const weekStartDay = addDays(endDay, -weekdayIndex(endDay, weekStart));
        const grid: Cell[][] = Array.from({ length: 7 }, (_, dayIdx) => {
          const date = addDays(weekStartDay, dayIdx);
          return Array.from({ length: 24 }, (_, hour) => {
            const value = values.get(`${dayKey(date)}:${hour}`) ?? 0;
            return {
              key: `${dayIdx}-${hour}`,
              info: { date, hour, value },
              intensity: intensityOf(value),
            };
          });
        });
        return { rows: grid, columns: 24, dayLabels: labels };
      }

      const days = range === '90d'
        ? 90
        : 180;
      const firstDay = addDays(endDay, -(days - 1));
      const leadGhosts = weekdayIndex(firstDay, weekStart);
      const weekCount = Math.ceil((leadGhosts + days) / 7);
      const grid: Cell[][] = Array.from({ length: 7 }, (_, dayIdx) => Array.from({ length: weekCount }, (_, week) => {
        const offset = week * 7 + dayIdx - leadGhosts;
        if (offset < 0 || offset >= days) {
          return { key: `${dayIdx}-${week}`, info: null, intensity: 0 };
        }
        const date = addDays(firstDay, offset);
        const value = values.get(dayKey(date)) ?? 0;
        return {
          key: `${dayIdx}-${week}`,
          info: { date, value },
          intensity: intensityOf(value),
        };
      }));
      return { rows: grid, columns: weekCount, dayLabels: labels };
    }, [data, range, weekStart, endMs, peak, locale]);

    const defaultTooltip = (cell: CalendarHeatmapCellInfo): string => {
      const day = formatDate(cell.date, { locale, dateStyle: 'medium' });
      const at = cell.hour != null
        ? ` · ${String(cell.hour).padStart(2, '0')}:00`
        : '';
      const suffix = unit != null
        ? ` ${unit}`
        : '';
      return `${day}${at} — ${cell.value}${suffix}`;
    };
    const tooltipOf = formatTooltip === null
      ? null
      : (formatTooltip ?? defaultTooltip);

    // Label column + N data columns; N is data-driven (13/24/26) so the
    // template rides the style attr.
    const gridStyle = {
      gridTemplateColumns: `32px repeat(${columns}, 1fr)`,
    };

    return (
      <SectionCard
        ref={ref}
        title={title}
        subtitle={subtitle}
        action={action}
        className={className}
        {...props}
      >
        <div className="flex flex-col gap-1.5">
          {range === 'week' && (
            <div className="grid items-center gap-0.5" style={gridStyle}>
              <span />
              {Array.from({ length: 24 }, (_, hour) => (
                <span
                  key={hour}
                  className={calendarHeatmapHourLabel({ hidden: hour % 4 !== 0 })}
                >
                  {String(hour).padStart(2, '0')}
                </span>
              ))}
            </div>
          )}
          {rows.map((row, dayIdx) => (
            <div
              key={dayLabels[dayIdx]}
              className="grid items-center gap-0.5"
              style={gridStyle}
            >
              <span className={calendarHeatmapLabel()}>{dayLabels[dayIdx]}</span>
              {row.map((cell) => {
                const { info } = cell;
                if (info == null) {
                  return (
                    <div
                      key={cell.key}
                      className={calendarHeatmapCell({ ghost: true })}
                    />
                  );
                }
                const quiet = cell.intensity < QUIET_FLOOR;
                const style = quiet
                  ? undefined
                  : { background: intensityBackground(cell.intensity) };
                const tooltip = tooltipOf != null
                  ? tooltipOf(info)
                  : undefined;
                if (onCellClick != null) {
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      title={tooltip}
                      aria-label={tooltip}
                      onClick={() => onCellClick(info)}
                      className={calendarHeatmapCell({ quiet, clickable: true })}
                      style={style}
                    />
                  );
                }
                return (
                  <div
                    key={cell.key}
                    title={tooltip}
                    className={calendarHeatmapCell({ quiet })}
                    style={style}
                  />
                );
              })}
            </div>
          ))}
          {showLegend && (
            <div className="mt-1 flex items-center justify-end gap-2">
              <span className={calendarHeatmapLabel()}>quiet</span>
              {LEGEND_STOPS.map((stop) => (
                <span
                  key={stop}
                  className={calendarHeatmapLegendSwatch()}
                  style={{ background: intensityBackground(stop) }}
                />
              ))}
              <span className={calendarHeatmapLabel()}>busy</span>
            </div>
          )}
        </div>
      </SectionCard>
    );
  },
);

CalendarHeatmap.displayName = 'CalendarHeatmap';
