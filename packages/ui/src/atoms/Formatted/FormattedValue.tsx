import { FormattedCurrency, type FormattedCurrencyProps } from './FormattedCurrency';
import { FormattedDate, type FormattedDateProps } from './FormattedDate';
import { FormattedDuration, type FormattedDurationProps } from './FormattedDuration';
import { FormattedPercentage, type FormattedPercentageProps } from './FormattedPercentage';
import { FormattedRelativeTime, type FormattedRelativeTimeProps } from './FormattedRelativeTime';
import { HumanReadableValue, type HumanReadableValueProps } from './HumanReadableValue';

export type FormattedValueProps =
  | ({ type: 'number' } & HumanReadableValueProps)
  | ({ type: 'currency' } & FormattedCurrencyProps)
  | ({ type: 'percentage' } & FormattedPercentageProps)
  | ({ type: 'date' } & FormattedDateProps)
  | ({ type: 'duration' } & FormattedDurationProps)
  | ({ type: 'relative-time' } & FormattedRelativeTimeProps);

const omitType = <T extends { type: string }>(props: T): Omit<T, 'type'> => {
  const { type, ...rest } = props;
  void type;
  return rest;
};

/**
 * FormattedValue — the type-dispatching wrapper over the Formatted* family
 * (spec-defined): a raw value, a `type` discriminant, and the
 * per-type options, so automatically rendered content (self-describing
 * tables, generated cards) can format by contract. Needs a ref? Use the
 * specific component — this dispatcher stays ref-less on purpose because
 * the underlying element differs per type (`span` vs `time`).
 */
export const FormattedValue = (props: FormattedValueProps) => {
  switch (props.type) {
    case 'number':
      return <HumanReadableValue {...omitType(props)} />;
    case 'currency':
      return <FormattedCurrency {...omitType(props)} />;
    case 'percentage':
      return <FormattedPercentage {...omitType(props)} />;
    case 'date':
      return <FormattedDate {...omitType(props)} />;
    case 'duration':
      // Omit<> collapses FormattedDuration's seconds-or-range union into one
      // object type; the discriminated narrowing above guarantees the shape,
      // so restore the union with a targeted cast.
      return <FormattedDuration {...omitType(props) as FormattedDurationProps} />;
    case 'relative-time':
      return <FormattedRelativeTime {...omitType(props)} />;
  }
};

FormattedValue.displayName = 'FormattedValue';
