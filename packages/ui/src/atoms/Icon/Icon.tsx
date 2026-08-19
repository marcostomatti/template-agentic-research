import type { LucideIcon } from 'lucide-react';

import { dynamicIconImports, type IconName } from 'lucide-react/dynamic';
import {
  forwardRef,
  lazy,
  Suspense,
  useMemo,
  type HTMLAttributes,
  type LazyExoticComponent,
} from 'react';

import { cn } from '../../lib';
import { devError } from '../../lib/dev';

import { icon, type IconVariants } from './Icon.variants';

/** Matches the stroke weight of the kit's hand-rolled glyphs (lib/icons). */
const DEFAULT_STROKE_WIDTH = 1.75;
const DEFAULT_SIZE = 16;

/**
 * Module-level lazy-component cache: one React.lazy per icon name, created
 * on first use and reused forever after. Once a glyph's chunk has loaded,
 * every subsequent mount of that name renders synchronously (React.lazy
 * memoizes resolution on the component itself).
 */
const glyphCache = new Map<IconName, LazyExoticComponent<LucideIcon>>();

const getGlyph = (name: IconName): LazyExoticComponent<LucideIcon> | null => {
  const cached = glyphCache.get(name);
  if (cached) return cached;
  const load = dynamicIconImports[name];
  if (typeof load !== 'function') return null;
  const glyph = lazy(load);
  glyphCache.set(name, glyph);
  return glyph;
};

/**
 * Fixed-size stand-in rendered while a glyph chunk loads (and for unknown
 * names): same box as the icon, so there is no layout shift. The size is
 * genuinely dynamic — the one place a style attribute is the right tool
 * (same rationale as Progress's fill fraction).
 *
 * `pending` marks a stand-in that WILL resolve (a chunk in flight); the
 * visual test-runner waits for `[data-glyph-pending]` to detach before
 * screenshotting, so baselines never race the lazy commit. Unknown-name
 * stand-ins never resolve and must not carry the marker.
 */
const GlyphPlaceholder = ({ size, pending = false }: { size: number; pending?: boolean }) => (
  <span
    aria-hidden
    data-glyph-pending={pending || undefined}
    className="inline-block"
    style={{ width: size, height: size }}
  />
);

export interface IconProps
  extends HTMLAttributes<HTMLSpanElement>,
  IconVariants {
  /** Lucide icon, by its kebab-case name (`terminal`, `git-branch`, …). */
  name: IconName;
  /** Glyph size in px. The background tile (if any) pads around it. */
  size?: number;
  /** Stroke width forwarded to the Lucide glyph. */
  strokeWidth?: number;
  /** Accessible label. Without it the icon is decorative (aria-hidden). */
  label?: string;
}

/**
 * Icon — a Lucide glyph addressed by string name, so automatically generated
 * content (cards, table cells, nav configs) can carry icons as data instead
 * of imports. Spec-driven; no design artboard.
 *
 * Coexistence with `src/lib/icons.tsx`: that module is the internal
 * stroke-path helper existing components render *themselves* with, and it
 * stays as-is — do not rewrite shipped components. New work should prefer
 * this `Icon`; consumer-facing icon slots remain `ReactNode` props either
 * way.
 *
 * Resolution goes through `dynamicIconImports` from `lucide-react/dynamic` —
 * the exact kebab-keyed map the `IconName` type is derived from, so every
 * type-valid name (including alias names like `help-circle`) resolves, and
 * consumers only ever load the icon chunks they actually render instead of
 * the whole set. Loading is a per-name `React.lazy` behind `Suspense`; the
 * fallback is a same-size placeholder, so nothing shifts while the chunk
 * arrives, and the caller-facing API stays fully synchronous.
 */
export const Icon = forwardRef<HTMLSpanElement, IconProps>(
  (
    {
      className,
      name,
      size = DEFAULT_SIZE,
      strokeWidth = DEFAULT_STROKE_WIDTH,
      label,
      accent,
      bg,
      ...props
    },
    ref,
  ) => {
    // getGlyph returns a stable identity per name (module-level cache);
    // useMemo re-selects only when the name changes.
    const Glyph = useMemo(() => getGlyph(name), [name]);
    if (Glyph == null) {
      // Typed names make this unreachable from TS callers; guard the
      // data-driven path (icon names arriving as strings) in dev only.
      devError(`Icon: unknown lucide icon name "${name}"`);
    }
    return (
      <span
        ref={ref}
        role={label != null
          ? 'img'
          : undefined}
        aria-label={label}
        aria-hidden={label == null || undefined}
        className={cn(icon({ accent, bg }), className)}
        {...props}
      >
        {Glyph == null
          ? <GlyphPlaceholder size={size} />
          : (
            <Suspense fallback={<GlyphPlaceholder size={size} pending />}>
              {/* eslint-disable-next-line react-hooks/static-components --
                  getGlyph memoizes exactly one React.lazy per name at module
                  level, so the identity is stable across renders — the rule
                  cannot see through the cache. */}
              <Glyph size={size} strokeWidth={strokeWidth} aria-hidden />
            </Suspense>
          )}
      </span>
    );
  },
);

Icon.displayName = 'Icon';
