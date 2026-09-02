import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib';

import {
  entityCard,
  entityCardBadges,
  entityCardControls,
  entityCardHeader,
  entityCardMeta,
  entityCardOpen,
  entityCardOverlay,
  entityCardTitle,
  entityCardTitleText,
} from './EntityCard.variants';

export interface EntityCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * The entity's name. A string rather than a node: it is the card's
   * heading, its accessible name when the card opens, and the native
   * tooltip a truncated name falls back on — three readings that a node
   * could not all supply.
   */
  title: string;
  /** Badge row under the header (`Badge`, `Tag`, a `StatusIndicator` line). */
  badges?: ReactNode;
  /** Meta footer, pinned to the card's bottom edge. */
  meta?: ReactNode;
  /** Control slot — the `Switch` a card carries, if it carries one. */
  control?: ReactNode;
  /** Action slot — the `RowContextAction` menu, if the card has one. */
  action?: ReactNode;
  /**
   * Open this entity. Given, the title becomes a button whose hit area
   * is stretched over the whole card; absent, the title is a plain
   * heading and the card has no open gesture at all.
   */
  onOpen?: () => void;
}

/**
 * EntityCard — the card the entity grids are built from.
 *
 * The `openable` variant is derived here from `onOpen` rather than taken
 * as a prop, so a card cannot advertise a gesture it does not have. See
 * `EntityCard.variants.ts` for why the open control is the title plus a
 * stretched overlay and not the card itself, and for what that costs the
 * badge row, the body and the meta footer.
 *
 * @param props - The title, the four slots, and the open callback.
 * @returns The card, with `children` as its body.
 */
export const EntityCard = forwardRef<HTMLDivElement, EntityCardProps>(
  (
    { className, title, badges, meta, control, action, onOpen, children, ...props },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(entityCard({ openable: onOpen != null }), className)}
      {...props}
    >
      <div className={entityCardHeader()}>
        {/* `title` on the heading and not on the button: it is the
            fallback for a name the truncation cut, and the browser
            reads it off whichever element the pointer is over. */}
        <h2 className={entityCardTitle()} title={title}>
          {onOpen == null
            ? <span className={entityCardTitleText()}>{title}</span>
            : (
              <button type="button" onClick={onOpen} className={entityCardOpen()}>
                <span className={entityCardTitleText()}>{title}</span>
                {/* The hit area. `aria-hidden` because it carries
                    nothing: the button's accessible name is the title
                    beside it. */}
                <span className={entityCardOverlay()} aria-hidden />
              </button>
            )}
        </h2>

        {(control != null || action != null) && (
          <div className={entityCardControls()}>
            {control}
            {action}
          </div>
        )}
      </div>

      {badges != null && <div className={entityCardBadges()}>{badges}</div>}

      {children}

      {meta != null && <div className={entityCardMeta()}>{meta}</div>}
    </div>
  ),
);

EntityCard.displayName = 'EntityCard';
