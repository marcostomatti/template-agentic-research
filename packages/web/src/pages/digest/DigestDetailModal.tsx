/**
 * @packageDocumentation
 * The digest's detail: one finding opened over the list it sits in —
 * what the pipeline recorded, where it came from, and the one ruling
 * an operator can change from here.
 *
 * ## This is the v1 stop, and the spec says so
 *
 * The UI spec asks for a finding's detail as a full routed PAGE, in
 * the two-column arrangement its reference screen uses: content cards
 * left, a stat rail right. It then says, in as many words, that v1 can
 * stop at the table plus a modal. This is that stop, and the two
 * columns are kept rather than flattened — a rail beside the record is
 * the arrangement the page will have, so what changes on the day it
 * lands is where this renders and not what it says.
 *
 * The routed page is a later wave, and this sub-route is already the
 * address it will answer at: `router.tsx` registers the digest's modal
 * at a BARE `:entityId` where the four editors end in `/edit`, exactly
 * so that growing it into a page is a change of element rather than of
 * URL. Nothing an operator links to today has to move.
 *
 * ## Read-only, with one exception, and the exception is the point
 *
 * Everything below the header is a reading. The single control is the
 * verdict, and it is here for the same reason the row menu offers it:
 * the ruling is the operator's own column, and a detail view is where
 * somebody decides what they make of what they have just read.
 *
 * It writes through `./actions.ts` and `../../data/hooks.ts` exactly as
 * the row menu does — {@link verdictChoices} for what is offered,
 * {@link verdictSelectValue} and {@link readVerdictChoice} for the two
 * halves of the translation, {@link withVerdict} for the row that gets
 * recorded. Not one of those decisions is restated here, so the menu
 * and this control cannot come to disagree about what a verdict is.
 *
 * The write is IMMEDIATE rather than drafted, which is why this
 * composes `@ar/ui`'s `Modal` directly instead of
 * `../../components/EditorModal.tsx`. That frame exists for editors:
 * it holds a draft, offers a save, and reports what is unsaved. There
 * is nothing here to leave unsaved — one control, one column, and the
 * ruling lands the moment it is chosen, the way it does from the row
 * menu one click away.
 *
 * ## Three reads, and only one of them gates the modal
 *
 * `useFinding` is the read this modal is ABOUT: its loading state is
 * the modal's, and its rejection is the modal's — a finding id no
 * fixture carries is a live address, and it reports inside the dialog
 * rather than taking the shell down.
 *
 * The document and source lists are joined against it for the source
 * reading and the capture stamp, the same join `./rows.ts` performs
 * for the table. They are read as LISTS and not as rows because that
 * is what is already in the cache: an operator arriving here clicked a
 * row on a page that had just read both, so the join costs nothing and
 * the rail settles with the finding. The body waits for all three for
 * the reason `./DigestPage.tsx` waits for its four — a partial join
 * would draw an unknown source and then correct itself a frame later,
 * which reads as a fault rather than as loading.
 *
 * A rejection is reported off the FINDING read alone. The two lists
 * reject on one thing, a domain slug nothing answers to, and a slug
 * like that has already failed the finding read.
 *
 * ## What is in the record, and what is not
 *
 * The payload block shows the domain's own fields whole. `./detail.ts`
 * carries the reasoning at length; the short version is that a detail
 * view quietly omitting a key is worse than a redundant line, and the
 * one omission — the keys this shell reserves on a row — is recognised
 * through the convention `./actions.ts` owns rather than through a
 * list kept here.
 *
 * ## Closing is a navigation, spelled here for the third time
 *
 * `..` with `relative: 'route'`, pushing rather than replacing. The
 * full reading is in `../../components/PlaceholderModal.tsx`: one
 * expression serves both route bases, route-relative pops the whole
 * matched route, and pushing is what keeps an operator who deep-linked
 * into a row from being walked out of the app.
 *
 * Three copies of two constants is more than anybody wants, and the
 * reason it is not extracted yet is that one of the three is dying:
 * `PlaceholderModal` is the element behind the sub-routes this wave is
 * replacing surface by surface, and a module shared with it would
 * outlive it by about a task. When it goes there are two survivors —
 * this and `EditorModal` — and one of them can hold the expression for
 * both.
 *
 * ## What no test in this package reaches
 *
 * Nothing in this file. The unit suite is node-only and collects `.ts`
 * alone — this file's decisions are next door in `./detail.ts` and
 * `./actions.ts`, its bindings are proven by a `check-types` mutation
 * grid, and what it renders falls to the Playwright specs.
 */

import type { FindingDetail } from './detail';
import type { Finding } from '../../data/types';

import {
  Badge,
  EmptyState,
  FormattedRelativeTime,
  HumanReadableValue,
  Modal,
  SectionCard,
  Select,
  Skeleton,
  StatusIndicator,
} from '@ar/ui';
import { useId } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import {
  useDocuments,
  useFinding,
  useSaveFinding,
  useSources,
  useVerdicts,
} from '../../data/hooks';
import { FIXTURE_NOW } from '../../data/types';
import { activeSurfaceId, getSurface } from '../../routes/paths';

import {
  readVerdictChoice,
  verdictChoices,
  verdictSelectValue,
  withVerdict,
} from './actions';
import { buildFindingDetail, findingSummary } from './detail';
import { UNRATED_VERDICT_LABEL, verdictTone } from './rows';

/**
 * The route this modal closes to: the digest list it hangs under.
 *
 * See the header on why it is relative, on why the resolution mode
 * below is spelled out, and on why this is the third copy rather than
 * an import.
 */
const CLOSE_TO = '..';

/** Resolve `..` against the ROUTE tree, not against the path. */
const CLOSE_OPTIONS = { relative: 'route' } as const;

/**
 * The locale every formatted value in this modal is rendered in.
 *
 * Pinned for the reason `./DigestPage.tsx` pins its own: a score
 * rendered `8,5` on one machine and `8.5` on another makes the text a
 * property of who is looking rather than of the data. The two agree
 * because the modal opens over the very cell that drew the same
 * number.
 */
const DISPLAY_LOCALE = 'en-US';

/** Fraction digits a score is shown to — the scale is one decimal. */
const SCORE_PRECISION = 1;

/** What the header says while the finding's own read is in flight. */
const PENDING_TITLE = 'Finding';

/** What the header says for a payload carrying no summary text. */
const NO_SUMMARY = 'No summary';

/** What the score reading says where nothing has scored the finding. */
const UNSCORED = 'Unscored';

/** What the excerpt block says where there is no text to show. */
const NO_EXCERPT = 'No text was extracted from the document this '
  + 'finding was read from.';

/** What the payload block says for a finding whose payload is empty. */
const NO_FIELDS = 'This domain recorded no fields for this finding.';

/** What each block of the record is called. */
const EXCERPT_TITLE = 'Document excerpt';
const PAYLOAD_TITLE = 'Payload';

/** What the stat rail is called, in the card and to the landmark. */
const RAIL_TITLE = 'Reading';

/** What each reading in the rail is labelled. */
const SCORE_LABEL = 'Score';
const VERDICT_LABEL = 'Verdict';
const SOURCE_LABEL = 'Source';
const CAPTURED_LABEL = 'Captured';

/** What the verdict control is addressed by, here and in the specs. */
const VERDICT_CONTROL_LABEL = 'Set verdict';

/** How wide the verdict control's dropdown panel is drawn. */
const VERDICT_PANEL_WIDTH = 180;

/**
 * The micro-label every block and rail reading is titled with.
 *
 * Restates `SmallStatCard`'s own title treatment rather than importing
 * it: `@ar/ui` exports the tile but no label atom, and a shared
 * vocabulary across the two columns is what makes the record and the
 * rail read as one panel instead of two pastes.
 */
const MICRO_LABEL = 'font-mono text-[10px] uppercase tracking-[0.1em] '
  + 'text-fg3';

/**
 * The digest's read-only detail.
 *
 * @returns The modal: the finding's record beside its rail, or
 * whichever of the two read states it is in.
 */
export const DigestDetailModal = () => {
  const { domainSlug, entityId } = useParams<{
    domainSlug?: string;
    entityId?: string;
  }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // `:entityId` is a required segment so it cannot arrive empty, but a
  // segment that is not a number is a live address: `Number` answers
  // `NaN`, no finding carries it, and the read refuses — which is the
  // rejected state below rather than a special case.
  const findingId = Number(entityId);

  const findingRead = useFinding(domainSlug, findingId);
  const documentsRead = useDocuments(domainSlug);
  const sourcesRead = useSources(domainSlug);
  const verdictsRead = useVerdicts(domainSlug);
  const save = useSaveFinding(domainSlug);

  const surfaceId = activeSurfaceId(pathname);

  // Named as constants so the check below narrows all three at once —
  // `useCache` answers `T | undefined` until it settles, and a property
  // access is not something the compiler can narrow through a flag.
  const finding = findingRead.data;
  const documents = documentsRead.data;
  const sources = sourcesRead.data;

  const joined = finding !== undefined
    && documents !== undefined
    && sources !== undefined;

  const detail = joined
    ? buildFindingDetail({ finding, documents, sources })
    : undefined;

  /**
   * Record a ruling from the rail's control.
   *
   * Silent while the finding read has not settled: the control is not
   * rendered in that state, so this cannot be reached with nothing to
   * write, and doing nothing is what a row nobody can name means.
   *
   * @param choice - The option value chosen, as `./actions.ts` spells
   * it.
   */
  const ruleOn = (choice: string) => {
    if (finding === undefined) {
      return;
    }

    save.mutate(withVerdict(finding, readVerdictChoice(choice)));
  };

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
      // `Modal` draws its header — and with it the close button and the
      // dialog's accessible name — only when it is given a title, so
      // this is never absent. It names the finding the way the row that
      // opened it did, off the same key.
      title={finding === undefined
        ? PENDING_TITLE
        : findingSummary(finding) ?? NO_SUMMARY}
    >
      <DigestDetailBody
        failed={findingRead.isError}
        finding={finding}
        detail={detail}
        vocabulary={verdictsRead.data ?? []}
        onVerdictChange={ruleOn}
      />
    </Modal>
  );
};

/** What the detail shows in place of its two columns. */
interface DigestDetailBodyProps {
  /** Whether the finding read rejected — an unknown row, today. */
  readonly failed: boolean;
  /** The finding itself, or undefined until its read settles. */
  readonly finding: Finding | undefined;
  /** The joined record, or undefined until all three reads settle. */
  readonly detail: FindingDetail | undefined;
  /** The domain's verdict ladder, in its own order. */
  readonly vocabulary: readonly string[];
  /** Report a ruling chosen in the rail. */
  readonly onVerdictChange: (choice: string) => void;
}

/**
 * The modal's body: the record beside its rail, or the reason there is
 * neither.
 *
 * Split out of the modal rather than written as nested ternaries
 * inside its JSX — the states are exclusive and each has something to
 * say, which reads as a sequence of early returns and very little
 * else. It is also the half a static render can reach: `Modal` is a
 * Radix dialog and renders through a portal, so a probe of the frame
 * sees nothing while a probe of this sees the whole surface.
 *
 * @param props - Which state the reads are in, and what to render
 * with.
 * @returns The two columns, or whichever read state is standing.
 */
const DigestDetailBody = ({
  failed,
  finding,
  detail,
  vocabulary,
  onVerdictChange,
}: DigestDetailBodyProps) => {
  const excerptId = useId();
  const payloadId = useId();

  if (failed) {
    return (
      <EmptyState
        title="This finding could not be read"
        description="Nothing in this domain answers to that finding. Close this and pick one from the digest."
      />
    );
  }

  if (finding === undefined || detail === undefined) {
    // `Skeleton` is aria-hidden, which is right for a frame that is
    // gone within a microtask against fixtures: announcing a loading
    // state that never gets read is noise.
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
      <div className="flex min-w-0 flex-col gap-5">
        <section aria-labelledby={excerptId}>
          {/* `h4` under the dialog's own `h3` title, and `m-0` because
              `tokens.css` puts a direct margin rule on every heading
              that a utility class does not otherwise cancel. */}
          <h4 id={excerptId} className={`m-0 ${MICRO_LABEL}`}>
            {EXCERPT_TITLE}
          </h4>
          <p className="m-0 mt-2 text-sm leading-relaxed text-fg2">
            {detail.excerpt ?? NO_EXCERPT}
          </p>
        </section>

        <section aria-labelledby={payloadId}>
          <h4 id={payloadId} className={`m-0 ${MICRO_LABEL}`}>
            {PAYLOAD_TITLE}
          </h4>

          {detail.fields.length === 0
            ? <p className="m-0 mt-2 text-sm text-fg3">{NO_FIELDS}</p>
            : (
              <dl className="mt-2 flex flex-col gap-2.5">
                {detail.fields.map((field) => (
                  <div key={field.name} className="flex flex-col gap-0.5">
                    <dt className={MICRO_LABEL}>{field.name}</dt>
                    {/* `break-words` because a payload value is
                        whatever the domain recorded, up to and
                        including a URL with no space in it. */}
                    <dd className="break-words text-sm text-fg1">
                      {field.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
        </section>
      </div>

      {/* `self-start` so the rail is as tall as its own readings
          rather than stretched down the record beside it. */}
      <SectionCard
        title={RAIL_TITLE}
        aria-label={RAIL_TITLE}
        className="self-start"
      >
        <dl className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <dt className={MICRO_LABEL}>{SCORE_LABEL}</dt>
            <dd>
              {/* Never scored and scored to zero are different
                  readings, and one line showing `0` for both would
                  erase the distinction the schema keeps. */}
              {finding.score === null
                ? <span className="text-sm text-fg3">{UNSCORED}</span>
                : (
                  <HumanReadableValue
                    value={finding.score}
                    short={false}
                    precision={SCORE_PRECISION}
                    locale={DISPLAY_LOCALE}
                  />
                )}
            </dd>
          </div>

          <div className="flex flex-col gap-1.5">
            <dt className={MICRO_LABEL}>{VERDICT_LABEL}</dt>
            <dd className="flex flex-col items-start gap-2">
              <Badge tone={verdictTone(finding.verdict)}>
                {finding.verdict ?? UNRATED_VERDICT_LABEL}
              </Badge>
              {/* The one control. Its options come from the DOMAIN and
                  carry the stored verdict, because `Select` resolves a
                  value none of its options hold to the first one —
                  `./actions.ts` carries that reading in full. */}
              <Select
                size="sm"
                className="w-full"
                value={verdictSelectValue(finding.verdict)}
                options={verdictChoices(vocabulary, finding.verdict)}
                onChange={onVerdictChange}
                width={VERDICT_PANEL_WIDTH}
                ariaLabel={VERDICT_CONTROL_LABEL}
              />
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className={MICRO_LABEL}>{SOURCE_LABEL}</dt>
            <dd className="flex items-center gap-2 text-sm text-fg1">
              {/* The same dot the table's source cell draws, carrying
                  the same reading: a source whose contract has drifted
                  still yields findings, and this is where that shows.
                  Labelled, because the text beside it names the
                  source rather than the parse. */}
              <StatusIndicator
                tone={detail.parseFailed
                  ? 'warn'
                  : 'ok'}
                label={detail.parseFailed
                  ? 'Parsed with errors'
                  : 'Parsed cleanly'}
              />
              <span className="min-w-0 break-words">{detail.sourceLabel}</span>
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className={MICRO_LABEL}>{CAPTURED_LABEL}</dt>
            <dd className="text-sm text-fg1">
              {detail.capturedAt === null
                ? <span className="text-fg3">Unknown</span>
                : (
                  <FormattedRelativeTime
                    date={detail.capturedAt}
                    // The fixtures are dated against this instant, so
                    // the ladder reads the same today as the day they
                    // were written.
                    now={FIXTURE_NOW}
                    locale={DISPLAY_LOCALE}
                  />
                )}
            </dd>
          </div>
        </dl>
      </SectionCard>
    </div>
  );
};
