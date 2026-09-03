/**
 * @packageDocumentation
 * The sources surface's failures list: the captures a feed brought
 * back that could not be read, and the two answers an operator has to
 * each one.
 *
 * ## A plain list, which is what the UI spec asks for
 *
 * No table, no filters, no search. A feed with failures has a handful
 * of them and the work is to read each one and say what it is worth —
 * a toolbar over four rows is chrome around a decision. Each row is
 * the same three readings the spec names: when the capture was taken,
 * why it would not parse, and where it can be read at its source.
 *
 * ## What is NOT here: a dead-letter queue
 *
 * `../../data/api.ts` builds this list as a PREDICATE over
 * `documents` rather than reading a table of its own, because there
 * is no such table. `DocumentParseStatus` is `ok | failed`, and a
 * capture that failed to parse is a document the pipeline KEPT with
 * its error beside it — fail-flag-keep — rather than a row moved
 * aside. So the rows below are ordinary documents, and a ruling on
 * one does not remove it from anywhere.
 *
 * ## Ruling does not shorten the list, and does not close the modal
 *
 * `./failures.ts` carries the argument in full. The half this file
 * has to honour is that a ruling is recorded as a MARK on the row and
 * moves no member `fetchSourceFailures` filters on — so a ruled
 * capture comes back in the re-read wearing what it was ruled, and
 * the badge on it is the whole of the confirmation.
 *
 * That makes closing on success wrong for the reason
 * `./SourceConfigApprovalModal.tsx` gives about its own ruling:
 * nothing on the sources table draws a failed capture, so closing
 * would take an operator away from the only screen that could show
 * what they just did. The footer count is the other reading — it says
 * how many of the list have been worked through, which is the
 * progress a queue that does not shorten cannot show by getting
 * shorter.
 *
 * ## The list is RE-READ after every ruling, never spliced
 *
 * Nothing here holds a copy of the rows. `useResolveSourceFailure`
 * invalidates the two keys its write can change and the body renders
 * whatever `useSourceFailures` answers next — so what is on screen is
 * always what the seam would answer a fresh reader, and there is no
 * local edit that could survive a read disagreeing with it.
 *
 * That is worth the extra render rather than a splice: a spliced list
 * is a second account of the same rows, and the moment the two differ
 * the screen is showing something no read would produce. It is also
 * what makes the ruled badge honest — it is drawn from the row the
 * store answered, not from the click that produced it.
 *
 * ## Two reads, and only one of them reports the rejection
 *
 * `useSource` is what makes a source id nothing answers to a live
 * address rather than a crash: `:entityId` is a required segment, but
 * nothing constrains it to a number a source carries. It also names
 * the dialog.
 *
 * `useSourceFailures` refuses on exactly the same two things — an
 * unknown slug, and an id this domain has no source for — because it
 * resolves the source through the same check before it reads a
 * document. `../../data/api.ts` says so and gives the refusal the
 * same message on purpose, so one rejected state covers both and the
 * modal cannot give two answers to one question. The same arrangement
 * `./SourceConfigApprovalModal.tsx` and `../digest/DigestDetailModal.tsx`
 * are in.
 *
 * ## What no test in this package reaches
 *
 * Nothing in this file. The unit suite is node-only and collects
 * `.ts` alone — this file's decisions are next door in
 * `./failures.ts`, its bindings are proven by a `check-types`
 * mutation grid, and what it renders falls to the Playwright specs.
 */

import type { FailureRuling } from './failures';
import type { Document } from '../../data/types';

import {
  Badge,
  Banner,
  Button,
  EmptyState,
  FormattedRelativeTime,
  Modal,
  Skeleton,
} from '@ar/ui';
import { useLocation, useNavigate, useParams } from 'react-router';

import {
  useResolveSourceFailure,
  useSource,
  useSourceFailures,
} from '../../data/hooks';
import { FIXTURE_NOW } from '../../data/types';
import { activeSurfaceId, getSurface } from '../../routes/paths';

import {
  FAILURE_RULINGS,
  NO_REASON_SENTENCE,
  describeFailureRuling,
  failureActionName,
  failureCountLabel,
  failureReason,
  failureTitle,
  readFailureRuling,
  ruleOnFailure,
} from './failures';

/**
 * The route this modal closes to: the sources list it hangs under.
 *
 * The fifth copy of this pair. `../digest/DigestDetailModal.tsx` says
 * why it is not extracted yet — one of the copies is
 * `../../components/PlaceholderModal.tsx`, which this wave is
 * deleting surface by surface, so a module shared with it would
 * outlive it by about a task.
 */
const CLOSE_TO = '..';

/** Resolve `..` against the ROUTE tree, not against the path. */
const CLOSE_OPTIONS = { relative: 'route' } as const;

/**
 * The locale every capture stamp is rendered in.
 *
 * Pinned for the reason `./SourcesPage.tsx` pins its own: a reading
 * that changes with the machine makes the text a property of who is
 * looking rather than of the data.
 */
const DISPLAY_LOCALE = 'en-US';

/** What the header says while the source's own read is in flight. */
const PENDING_TITLE = 'Feed failures';

/** What a ruling that did not record is announced as. */
const RULING_FAILED_TITLE = 'This ruling was not recorded';

/** What the stamp reading is labelled in each row. */
const CAPTURED_PREFIX = 'Captured';

/**
 * The micro-label a row's stamp is set in.
 *
 * Restates `SmallStatCard`'s own title treatment, on the reasoning
 * `../digest/DigestDetailModal.tsx` gives: `@ar/ui` exports the tile
 * but no label atom, and one label vocabulary across the modals is
 * what keeps them reading as one app.
 */
const MICRO_LABEL = 'font-mono text-[10px] uppercase tracking-[0.1em] '
  + 'text-fg3';

/**
 * How many of a list of captures somebody has ruled on.
 *
 * Built here rather than in `./failures.ts` because it is a count of
 * what {@link readFailureRuling} answers rather than a reading of its
 * own — the decision is over there and this is one `filter` over it.
 *
 * @param failures - The captures as the read answered them.
 * @returns How many carry a ruling.
 */
const ruledCount = (failures: readonly Document[]): number => failures
  .filter((row) => readFailureRuling(row) !== undefined).length;

/**
 * The sources surface's failures list.
 *
 * @returns The modal: the failed captures with their two rulings, or
 * whichever read state it is in.
 */
export const SourceFailuresModal = () => {
  const { domainSlug, entityId } = useParams<{
    domainSlug?: string;
    entityId?: string;
  }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // `:entityId` is a required segment so it cannot arrive empty, but a
  // segment that is not a number is a live address: `Number` answers
  // `NaN`, no source carries it, and the read refuses — which is the
  // rejected state below rather than a special case.
  const sourceId = Number(entityId);

  const sourceRead = useSource(domainSlug, sourceId);
  const failuresRead = useSourceFailures(domainSlug, sourceId);
  const ruling = useResolveSourceFailure(domainSlug);

  const surfaceId = activeSurfaceId(pathname);
  const source = sourceRead.data;

  // Named so the footer below narrows: `useCache` answers
  // `T | undefined` until it settles, and a property access is not
  // something the compiler can narrow through a flag.
  const failures = failuresRead.data;

  return (
    <Modal
      open
      size="lg"
      onClose={() => {
        void navigate(CLOSE_TO, CLOSE_OPTIONS);
      }}
      eyebrow={surfaceId === undefined
        ? undefined
        : getSurface(surfaceId).title}
      // The endpoint WHOLE, for the reason `./SourceEditorModal.tsx`
      // gives: three seeded feeds share one host, so a dialog titled
      // with the host would name any of them. Wrapped in a span that
      // may break, since `OverlayHeader` sets no wrapping rule and an
      // endpoint has no spaces to break at.
      title={source === undefined
        ? PENDING_TITLE
        : <span className="break-words">{source.endpoint}</span>}
      // How much of the list has been worked through, which is the
      // progress reading a queue that does not shorten cannot give by
      // getting shorter. Absent until the read settles, and absent
      // for a feed with nothing to work through — a footer over an
      // empty state would open a row on nothing.
      footerStatus={failures === undefined || failures.length === 0
        ? undefined
        : failureCountLabel(failures.length, ruledCount(failures))}
    >
      <SourceFailuresBody
        failed={sourceRead.isError}
        failures={failures}
        pending={ruling.isPending}
        rulingError={ruling.error}
        onRule={(document, answer) => {
          ruling.mutate(ruleOnFailure(document, answer));
        }}
      />
    </Modal>
  );
};

/** What the failures list shows in place of its rows. */
interface SourceFailuresBodyProps {
  /** Whether the source read rejected — an unknown row, today. */
  readonly failed: boolean;
  /** The failed captures, or undefined until the queue settles. */
  readonly failures: readonly Document[] | undefined;
  /** Whether a ruling is in flight, which disables every control. */
  readonly pending: boolean;
  /** Why the last ruling did not record, if one did not. */
  readonly rulingError: Error | null;
  /** Report a ruling made on one capture. */
  readonly onRule: (document: Document, ruling: FailureRuling) => void;
}

/**
 * The modal's body: the list, or the reason there is none.
 *
 * Split out of the modal rather than written as nested ternaries
 * inside its JSX — the states are exclusive and each has something to
 * say, which reads as a sequence of early returns and very little
 * else. It is also the half a static render can reach: `Modal` is a
 * Radix dialog and renders through a portal, so a probe of the frame
 * sees nothing while a probe of this sees the whole surface.
 *
 * @param props - Which state the reads are in, and what to do with a
 * ruling.
 * @returns The rows, or whichever state is standing.
 */
const SourceFailuresBody = ({
  failed,
  failures,
  pending,
  rulingError,
  onRule,
}: SourceFailuresBodyProps) => {
  if (failed) {
    return (
      <EmptyState
        title="This source could not be read"
        description="Nothing in this domain answers to that source. Close this and pick one from the table."
      />
    );
  }

  if (failures === undefined) {
    // `Skeleton` is aria-hidden, which is right for a frame that is
    // gone within a microtask against fixtures: announcing a loading
    // state that never gets read is noise.
    return <Skeleton className="h-56 w-full rounded-xl" />;
  }

  if (failures.length === 0) {
    return (
      <EmptyState
        title="Every capture from this feed parsed"
        description="Nothing this source brought back failed its contract, so there is nothing to work through here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {rulingError !== null && (
        // Announced on arrival rather than politely: it lands in
        // response to the operator's own click, and it is the reason
        // the thing they asked for did not happen.
        <Banner role="alert" tone="danger" title={RULING_FAILED_TITLE}>
          {rulingError.message}
        </Banner>
      )}

      {/* A list rather than a stack of divs: the rows are peers and
          how many there are is the reading the footer states, so the
          landmark that carries a count for free is the right one. */}
      <ul className="flex list-none flex-col gap-3 p-0">
        {failures.map((document) => (
          <FailureRow
            key={document.id}
            document={document}
            pending={pending}
            onRule={onRule}
          />
        ))}
      </ul>
    </div>
  );
};

/** What one row of the list is given. */
interface FailureRowProps {
  /** The capture, as the read answered it. */
  readonly document: Document;
  /** Whether a ruling is in flight, which disables both controls. */
  readonly pending: boolean;
  /** Report a ruling made on this capture. */
  readonly onRule: (document: Document, ruling: FailureRuling) => void;
}

/**
 * One failed capture: when it was taken, why it would not parse, and
 * what has been decided about it.
 *
 * Every reading comes off `./failures.ts` rather than off the row
 * directly — the mark a ruling writes lives in `parse_error`, so the
 * reason a reader is shown and the badge above it are two halves of
 * one reading of that column, and taking either from the raw value
 * would show the operator a token this shell invented.
 *
 * @param props - The capture, and what to do with a ruling on it.
 * @returns The row.
 */
const FailureRow = ({ document, pending, onRule }: FailureRowProps) => {
  const title = failureTitle(document);
  const reason = failureReason(document);
  const ruled = readFailureRuling(document);
  const reading = ruled === undefined
    ? undefined
    : describeFailureRuling(ruled);

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border-soft bg-surface-1 p-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className={MICRO_LABEL}>
          {CAPTURED_PREFIX}
          {' '}
          <FormattedRelativeTime
            date={document.capturedAt}
            // The fixtures are dated against this instant, so the
            // ladder reads the same today as the day they were
            // written.
            now={FIXTURE_NOW}
            locale={DISPLAY_LOCALE}
          />
        </span>

        {reading === undefined
          ? undefined
          : (
            <Badge tone={reading.tone} size="sm">{reading.ruled}</Badge>
          )}
      </div>

      {/* The reason, which is why the row is here. `break-words`
          because a parser message is whatever a parser wrote. */}
      <p className="m-0 break-words text-sm leading-relaxed text-fg1">
        {reason ?? NO_REASON_SENTENCE}
      </p>

      {/* Where the capture can be read at its source, or what to call
          one with nowhere. `break-all` rather than `break-words`: a
          URL has no spaces to break at. */}
      <span className="break-all font-mono text-[12.5px] text-fg2">
        {title}
      </span>

      {reading === undefined
        ? undefined
        : (
          <span className="text-[12.5px] text-fg3">{reading.sentence}</span>
        )}

      <div className="flex flex-wrap justify-end gap-2">
        {FAILURE_RULINGS.map((answer) => (
          <Button
            key={answer}
            size="sm"
            variant={answer === ruled
              ? 'secondary'
              : 'ghost'}
            disabled={pending}
            // Named with the capture as well as the answer: two
            // controls per row over a list of rows is otherwise four
            // identical names, and `./failures.ts` builds this off
            // the same table the visible label comes from so the name
            // carries the label by construction.
            aria-label={failureActionName(answer, title)}
            onClick={() => {
              onRule(document, answer);
            }}
          >
            {describeFailureRuling(answer).action}
          </Button>
        ))}
      </div>
    </li>
  );
};
