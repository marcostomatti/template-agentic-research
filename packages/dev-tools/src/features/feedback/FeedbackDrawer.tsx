/**
 * @packageDocumentation
 * The feedback drawer: the report-type select, the chosen template's
 * fields through the renderer slot, the widget's own three fields, the
 * two buttons, and the one `role="status"` line that speaks every
 * outcome.
 *
 * Spec item 3 in one component. What it draws is a form; what it
 * decides is nothing — every judgement below is a call into a module
 * the jsdom vitest project collects:
 *
 * - `./drawerData.ts` — the template list, the repository slug, the
 *   attachment encoding.
 * - `./drawerModel.ts` — the composed template, the fields the slot is
 *   handed, the screenshot descriptor, the assembled report.
 * - `./drawerOutcome.ts` — what the status line says, whether GitHub
 *   is missing this report, and the prefilled link if it is; drawn by
 *   `./FeedbackOutcome.tsx`.
 * - `./drawerDraft.ts` — the draft itself, held outside React.
 * - `./body.ts`, `./context.ts`, `./picker.ts`, `./submit.ts`,
 *   `./submitRules.ts` — the body, the context record, the live match
 *   count, the two calls that leave the browser, the six refusals.
 *
 * That is this package's two-runner discipline (`../../vitest.config.ts`
 * states it) and is why this file is a `.tsx` no vitest project
 * collects. What proves it is the forced Playwright spec, and the
 * `react-dom/server` readings a later task lands beside it.
 *
 * ## The draft is NOT in this component, and that is load-bearing
 *
 * `src/core/Shell.tsx` draws a drawer's children as `{open ?
 * item.render(...) : null}`, so the collapse that spec item 5 asks
 * pick mode to perform unmounts everything here. `./drawerDraft.ts`
 * holds the title, the answers, the image and the last outcome for
 * exactly that reason, and this component reads them through
 * `useSyncExternalStore`.
 *
 * Two consequences are written into the handlers below and are easy to
 * undo by accident:
 *
 * - The picker's `onSelect` reads `store.read()` rather than the
 *   `draft` this render closed over. It is called while this component
 *   is GONE — `./ElementPicker.tsx` says so on the prop — so the
 *   closed-over value is one the operator may have edited since, and
 *   spreading it would write a stale record back over the live one.
 * - `useSyncExternalStore` is given a server snapshot as well as a
 *   client one, and they are the same reader — the store holds one
 *   draft and there is no second source to read it from.
 *   `react-dom/server` has no subscription to make, and the
 *   two-argument call throws there. Measured, rather than assumed:
 *   `renderToStaticMarkup` over a component calling it with two
 *   arguments answers `Missing getServerSnapshot, which is required
 *   for server-rendered content. Will revert to client rendering.`,
 *   and the three-argument call renders. So the third argument is what
 *   makes every static-render reading of this drawer possible.
 *
 * ## Nothing here is React state
 *
 * Not the draft, and not the dev server's two answers either: the
 * template list, the repository slug and the reason there are no forms
 * all live in the same store. Three things follow, and the third is
 * the one that decides it.
 *
 * A collapse leaves the drawer able to draw its form again at once
 * rather than blank. The effect below still re-reads both on every
 * mount, so an issue form edited while the app runs is picked up.
 * And a `react-dom/server` frame — where no effect ever runs — can be
 * given templates to draw, which is what makes this drawer readable by
 * the static renderings this stage lands at all.
 *
 * ## The outcome region is a sibling file
 *
 * `./FeedbackOutcome.tsx` draws the `role="status"` line and the
 * controls each outcome brings with it. It moved out when this file
 * reached the package's 800-line cap, and it took a whole surface with
 * it: everything there is a function of the last answer, everything
 * here is the form. The drawer still owns the region in the sense that
 * matters — one live region, rendered on every frame of this drawer,
 * empty until something speaks.
 *
 * ## Drop and Cancel are one action under two names
 *
 * Both reset the draft and close the drawer. They are separate
 * controls because they are separate MOMENTS — Cancel abandons a
 * report nobody has seen, Drop abandons one the tracker turned out to
 * already have (spec item 7's word for it) — and a person reading
 * "Cancel" under a duplicate would reasonably wonder what it cancels.
 *
 * ## What a submit does, in order
 *
 * Collect the context, build the body, ask `refuseSubmit`, and only
 * then encode the attachment. The order is deliberate: encoding a 5 MB
 * image is the expensive step, and an empty title should not pay for
 * it. The refusal lands in the same `role="status"` line as every
 * other outcome, as `./drawerOutcome.ts`'s `feedbackRefusal` shape.
 */

import type { FeedbackDraftStore } from './drawerDraft';
import type { ReportFormRenderer } from './types';
import type { DevToolsHost } from '../../core/types';
import type { ReactElement } from 'react';

import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { buildFeedbackBody } from './body';
import { collectFeedbackContext } from './context';
import {
  encodeFeedbackAttachment,
  loadFeedbackRepo,
  loadFeedbackTemplates,
} from './drawerData';
import { feedbackDraftStore } from './drawerDraft';
import {
  FEEDBACK_SELECTOR_FIELD_ID,
  buildFeedbackReport,
  composeFeedbackTemplate,
  feedbackFormFields,
  feedbackScreenshotField,
  feedbackSelectorValue,
} from './drawerModel';
import { feedbackRefusal } from './drawerOutcome';
import { DropZone } from './DropZone';
import { ElementPicker } from './ElementPicker';
import { FeedbackOutcome } from './FeedbackOutcome';
import { matchesOf } from './picker';
import { ReportFormFields } from './ReportFormFields';
import { submitAlsoAffected, submitFeedbackReport } from './submit';
import { refuseSubmit } from './submitRules';

/** The id the report-type select carries. */
const TYPE_FIELD_ID = 'devtools-feedback-type';

/** ...and the title field. */
const TITLE_FIELD_ID = 'devtools-feedback-title';

/** What the report-type select is called. */
const TYPE_LABEL = 'Report type';

/** What the title field is called. */
const TITLE_LABEL = 'Title';

/** ...and the greyed example inside it. */
const TITLE_PLACEHOLDER = 'One line: what is wrong';

/** What the submit control reads at rest. */
const SUBMIT_LABEL = 'Send report';

/** ...and while a request is in flight. */
const SENDING_LABEL = 'Sending...';

/** What the control that abandons a report reads. */
const CANCEL_LABEL = 'Cancel';

/** Shown while the template list has not arrived. */
const LOADING_TEMPLATES = 'Reading the report forms...';

/** Shown when the dev server served no issue form at all. */
const NO_TEMPLATES
  = 'This repository has no issue forms, so there is no report form to '
  + 'fill in. Add one under .github/ISSUE_TEMPLATE/.';

/** Shown when the image could not be read off the disk to be sent. */
const ENCODE_REFUSED
  = 'The image could not be read, so the report was not sent. Remove '
  + 'it and send the report without one.';

/**
 * The package's own renderer, used when the host passes no slot.
 *
 * Declared at module scope rather than inline as a default, so every
 * render of the drawer hands the slot the same function identity.
 *
 * @param fields - The chosen template's fields, screenshot withheld.
 * @param values - Every answer so far.
 * @param onChange - Called with the whole next record.
 * @returns The package's plain-HTML rows.
 */
const defaultRenderForm: ReportFormRenderer = (fields, values, onChange) => (
  <ReportFormFields fields={fields} values={values} onChange={onChange} />
);

/** What {@link FeedbackDrawer} takes. */
export interface FeedbackDrawerProps {
  /** The one surface a feature may reach. */
  readonly host: DevToolsHost;

  /**
   * The id this feature is registered under.
   *
   * Travels as the report's `feature`, which `src/vite/report.ts`
   * validates as an identifier. Taken as a prop rather than spelled
   * here, because the id belongs to the `DevToolsFeature` in
   * `./index.ts` and two spellings of it could drift apart.
   */
  readonly feature: string;

  /** Collapse or dismiss this surface; the shell's own `close`. */
  readonly close: () => void;

  /**
   * How to draw the template's fields.
   *
   * @defaultValue `./ReportFormFields.tsx`, the package's plain-HTML
   * renderer. `@ar/web` passes an adapter over its own `DynamicForm`.
   */
  readonly renderForm?: ReportFormRenderer;

  /**
   * Where the draft lives.
   *
   * @defaultValue the module singleton, which is the one that survives
   * the collapse pick mode performs. A caller that must not touch the
   * shared draft — a reading, a second drawer — passes its own.
   */
  readonly store?: FeedbackDraftStore;
}

/**
 * The feedback drawer.
 *
 * @param props - {@link FeedbackDrawerProps}.
 * @returns The whole surface: the select, the form, the widget's own
 * fields, the buttons and the outcome region.
 */
export function FeedbackDrawer({
  host,
  feature,
  close,
  renderForm = defaultRenderForm,
  store = feedbackDraftStore,
}: FeedbackDrawerProps): ReactElement {
  const draft = useSyncExternalStore(store.subscribe, store.read, store.read);
  const { templates } = draft;

  useEffect(() => {
    let live = true;

    void loadFeedbackTemplates(host).then((answer) => {
      if (!live) {
        return;
      }

      if (!answer.ok) {
        store.write({ unavailable: answer.reason });

        return;
      }

      const first = answer.templates[0];
      const chosen = store.read().templateId;
      const known = answer.templates.some(
        (candidate) => candidate.id === chosen,
      );

      store.write({
        templates: answer.templates,
        unavailable: null,
        // A chosen id the server no longer serves would leave the
        // select on a value with no option and `refuseTemplate`
        // refusing every submit, so the first form takes over.
        templateId: known
          ? chosen
          : first?.id ?? '',
      });
    });

    void loadFeedbackRepo(host).then((answer) => {
      if (live) {
        store.write({ repo: answer });
      }
    });

    return () => {
      live = false;
    };
  }, [host, store]);

  const context = useMemo(() => collectFeedbackContext(host), [host]);
  const chosen = templates?.find(
    (candidate) => candidate.id === draft.templateId,
  ) ?? null;
  const template = useMemo(
    () => (chosen === null
      ? null
      : composeFeedbackTemplate(chosen, context)),
    [chosen, context],
  );
  const screenshot = template === null
    ? null
    : feedbackScreenshotField(template);
  const selector = feedbackSelectorValue(draft.values);
  const matches = useMemo(() => matchesOf(selector), [selector]);

  const discard = (): void => {
    store.reset();
    close();
  };

  const send = async (): Promise<void> => {
    if (template === null || templates === null) {
      return;
    }

    const collected = collectFeedbackContext(host);
    const body = buildFeedbackBody({
      template,
      values: draft.values,
      context: collected,
    });
    const attachments = draft.file === null
      ? []
      : [draft.file];
    const reason = refuseSubmit({
      templateId: draft.templateId,
      templates,
      title: draft.title,
      body,
      selector: template.devtools.selector
        ? { value: selector, matches }
        : null,
      attachments,
    });

    if (reason !== null) {
      store.write({ outcome: feedbackRefusal(reason) });

      return;
    }

    store.write({
      sending: true,
      outcome: null,
      sent: { title: draft.title, body },
    });

    try {
      const attachment = draft.file === null
        ? null
        : await encodeFeedbackAttachment(draft.file);
      const report = buildFeedbackReport({
        feature,
        title: draft.title,
        body,
        context: collected,
        attachment,
      });

      store.write({
        sending: false,
        outcome: await submitFeedbackReport(host, report),
      });
    } catch {
      store.write({
        sending: false,
        outcome: feedbackRefusal(ENCODE_REFUSED),
      });
    }
  };

  const alsoAffected = async (issueId: string): Promise<void> => {
    const { sent } = store.read();

    if (sent === null) {
      return;
    }

    store.write({ sending: true });
    store.write({
      sending: false,
      outcome: await submitAlsoAffected(host, issueId, sent.body),
    });
  };

  return (
    <form
      className="devtools-feedback"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <div className="devtools-field">
        <label className="devtools-field-label" htmlFor={TYPE_FIELD_ID}>
          {TYPE_LABEL}
        </label>

        <select
          id={TYPE_FIELD_ID}
          className="devtools-field-control"
          value={draft.templateId}
          disabled={templates === null || templates.length === 0}
          onChange={(event) => {
            store.write({ templateId: event.target.value });
          }}
        >
          {(templates ?? []).map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </select>

        {chosen !== null && (
          <p className="devtools-field-description">{chosen.description}</p>
        )}
      </div>

      <div className="devtools-field">
        <label className="devtools-field-label" htmlFor={TITLE_FIELD_ID}>
          {TITLE_LABEL}
        </label>

        <input
          id={TITLE_FIELD_ID}
          className="devtools-field-control"
          type="text"
          value={draft.title}
          placeholder={TITLE_PLACEHOLDER}
          aria-required
          onChange={(event) => { store.write({ title: event.target.value }); }}
        />
      </div>

      {template !== null && renderForm(
        feedbackFormFields(template),
        draft.values,
        (next) => { store.write({ values: next }); },
      )}

      {template?.devtools.selector === true && (
        <ElementPicker
          value={selector}
          matches={matches}
          onSelect={(picked) => {
            store.write({
              values: {
                ...store.read().values,
                [FEEDBACK_SELECTOR_FIELD_ID]: picked,
              },
            });
          }}
          onCollapse={close}
        />
      )}

      {screenshot !== null && (
        <DropZone
          field={screenshot}
          file={draft.file}
          onChange={(next) => { store.write({ file: next }); }}
          onRefuse={(reason) => {
            store.write({ outcome: feedbackRefusal(reason) });
          }}
        />
      )}

      {templates === null && draft.unavailable === null && (
        <p className="devtools-feedback-loading">{LOADING_TEMPLATES}</p>
      )}

      {draft.unavailable !== null && (
        <p className="devtools-feedback-loading">{draft.unavailable}</p>
      )}

      {templates?.length === 0 && (
        <p className="devtools-feedback-loading">{NO_TEMPLATES}</p>
      )}

      <div className="devtools-feedback-actions">
        <button
          type="submit"
          className="devtools-feedback-submit"
          disabled={draft.sending || template === null}
        >
          {draft.sending
            ? SENDING_LABEL
            : SUBMIT_LABEL}
        </button>

        <button
          type="button"
          className="devtools-feedback-cancel"
          onClick={discard}
        >
          {CANCEL_LABEL}
        </button>
      </div>

      <FeedbackOutcome
        outcome={draft.outcome}
        sent={draft.sent}
        repo={draft.repo}
        templateId={draft.templateId}
        busy={draft.sending}
        onAlsoAffected={(issueId) => { void alsoAffected(issueId); }}
        onDrop={discard}
      />
    </form>
  );
}
