/**
 * Asks a real local model server for a source's arrangement, over a
 * sample payload authored here, and checks one thing about what
 * comes back: that `parserConfigErrors` finds nothing wrong with it.
 *
 * That is the whole claim, and its narrowness is the design rather
 * than a thin test. A model's answer is not deterministic and is not
 * this repository's to assert: two runs against the same server and
 * the same payload legitimately differ, and a case pinning which
 * fields were picked would be a case that fails whenever somebody
 * pulls a newer model. What `parserConfigErrors` answering nothing
 * DOES say is that the document is one the deterministic engine in
 * `src/lib/parser-config.ts` will execute — well-formed field
 * map, readable paths, patterns that compile, no reserved name.
 * Whether it reads what the payload actually holds is exactly the
 * question `source_config_proposals` exists to put in front of a
 * person, and `docs/architecture/04-sources.md` is where that path
 * is written down.
 *
 * ## What the isolated suite already settles
 *
 * `src/sources/config-proposer.test.ts` drives the whole seam in
 * front of injected stubs: which members a proposer is shown, that a
 * proposer which throws is let through untouched, what the pending
 * row carries and what it cannot carry, and that an unapproved
 * proposal is refused on the apply side. None of that needs a
 * server, and none of it is repeated here. What a stub cannot answer
 * is whether a real model, shown this framing and this payload,
 * answers a config the engine accepts at all — a stub answers
 * whatever it was written to answer. That is the whole of what is
 * left for this file, and it is one case.
 *
 * ## The framing is real here, not documented here
 *
 * The sample payload is untrusted text on its way into a prompt,
 * which is the risk `src/lib/prompt-frame.ts` was ported to close.
 * This is the one place in this package that actually sends
 * something to a model, so it is the one place that framing has to
 * be exercised rather than described: the persona and the grammar
 * are the trusted half, the payload goes through
 * `neutralizeUntrusted` into the fence, and a frame that comes back
 * refused is thrown on rather than sent. The grammar itself is built
 * out of the engine's own exported constants, so a field type or a
 * reserved name that changes over there reaches this prompt without
 * anybody remembering to retype it.
 *
 * ## Module scope holds constants and pure functions
 *
 * `describeLiveOllama` binds a `describe` and nothing above one, so
 * module scope in this file runs on the skipped branch too, on every
 * `bun run test`. Nothing above the block opens a socket, reads a
 * setting or builds a client: `requireLiveOllama` is asked inside
 * the case, and the payload, the persona and the two helpers are
 * values. `tests/live/live-ollama.ts` carries the rest of that rule
 * and why the gate is the whole of the consent for reaching a
 * server.
 *
 * ## The payload is authored, and neutral
 *
 * Gauge readings, invented here, in `example.invalid` — a reserved
 * domain that cannot resolve. No fixture is copied in from anywhere,
 * for the reason every fixture in this repository is authored: a
 * payload taken from a real feed carries whatever that feed carried.
 * `tests/parity/fixtures.ts` holds the shared corpus for the text
 * modules and has no listing-shaped payload, which is why this one
 * is written out below rather than imported.
 *
 * ## Treat what is written here as unrun
 *
 * No command this package ships arms this gate and no compose
 * service satisfies it, so every ordinary run leaves this file
 * skipped. A green verification order says nothing whatever about
 * the case below; only an operator pointing both settings at a
 * server of their own does.
 */
import type { LiveOllamaSettings } from './live-ollama.js';
import type { PromptFrameResult } from '../../src/lib/prompt-frame.js';
import type {
  ConfigProposer,
  ProposalSource,
  ProposedConfig,
} from '../../src/sources/config-proposer.js';

import { expect, it } from 'vitest';

import {
  FIELD_NAME_PATTERN,
  FIELD_TYPES,
  MAX_FIELDS,
  MAX_PATH_SEGMENTS,
  parserConfigErrors,
  RESERVED_FIELD_NAMES,
} from '../../src/lib/parser-config.js';
import { promptFrame } from '../../src/lib/prompt-frame.js';
import { proposeSourceConfig } from '../../src/sources/config-proposer.js';

import { describeLiveOllama, requireLiveOllama } from './live-ollama.js';

// ---------------------------------------------------------------------------
// What the model is shown
// ---------------------------------------------------------------------------

/**
 * How long one generation may take before the request is abandoned.
 *
 * Generous, because a cold model on an operator's own machine loads
 * weights before it answers anything, and a first-run timeout would
 * read as a broken proposer rather than as a slow start.
 */
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * The case budget, above {@link REQUEST_TIMEOUT_MS} on purpose.
 *
 * The request has to be the thing that gives up first: a case killed
 * by vitest reports a timeout naming the case, where an abandoned
 * request reports one naming the server it was pointed at.
 */
const CASE_TIMEOUT_MS = REQUEST_TIMEOUT_MS + 30_000;

/**
 * The `sources` row the proposal is for.
 *
 * Only the four members a proposer is entitled to see, which is what
 * `ProposalSource` is; a whole row would satisfy the annotation too,
 * and `proposeSourceConfig` narrows either way.
 */
const SOURCE: ProposalSource = {
  id: 1,
  domainId: 1,
  kind: 'api',
  endpoint: 'https://gauges.example.invalid/v1/readings',
};

/**
 * One page from that source, as its `fetch` would have answered one.
 *
 * Invented here and deliberately dull: river gauge readings, in the
 * reserved `example.invalid` domain, carrying a records array under
 * a member the payload also wraps in paging metadata. That shape is
 * the point — a config that reads it has to state a `recordsPath`
 * rather than treating the payload as the record, so the answer has
 * somewhere to be wrong.
 */
const SAMPLE_PAYLOAD = {
  page: 1,
  pageSize: 2,
  nextCursor: 'page-2',
  entries: [
    {
      ref: 'GA-1041',
      label: 'Upper weir gauge',
      link: 'https://gauges.example.invalid/readings/GA-1041',
      note: 'Level steady through the hour; no debris reported.',
      levelMetres: 1.24,
      recordedAt: '2026-01-02T03:04:05.000Z',
    },
    {
      ref: 'GA-1042',
      label: 'Lower sluice gauge',
      link: 'https://gauges.example.invalid/readings/GA-1042',
      note: 'Level rising slowly after the overnight rain.',
      levelMetres: 0.87,
      recordedAt: '2026-01-02T03:09:11.000Z',
    },
  ],
};

/**
 * What the model is asked for, and in what shape.
 *
 * Built out of the engine's own exported constants rather than
 * retyped, so the field types, the reserved names, the name pattern
 * and the two ceilings reach the prompt from the module that
 * enforces them. A grammar written by hand beside them drifts the
 * first time one of them moves, and nothing would report it: the
 * only symptom would be a model answering something
 * `parserConfigErrors` refuses, which reads exactly like a model
 * having a bad day.
 *
 * In a run this text is a `personas` row for the domain, operator
 * owned; it is written here because there is no domain and no
 * database in this file. `promptFrame` treats it as the trusted
 * half either way.
 */
const PERSONA = [
  'You are shown one sample payload from a data source. Answer how a',
  'deterministic engine should take records out of every later',
  'payload from that source, and the check that says a reading still',
  'holds.',
  '',
  'Answer JSON and nothing else: one object carrying exactly two',
  'members, "parserConfig" and "contract".',
  '',
  '"parserConfig" carries an optional "recordsPath", the dotted path',
  'to the array of records inside the payload, and a required',
  `"fields" object of at most ${MAX_FIELDS} rules keyed by field`,
  `name. A name must match ${FIELD_NAME_PATTERN.source} and must not`,
  `be one of ${RESERVED_FIELD_NAMES.join(', ')}. A rule may state`,
  '"path" (a dotted path within one record, at most',
  `${MAX_PATH_SEGMENTS} segments), "pattern" (a regular expression`,
  'read over the value as text), "group" (which capture of that',
  `pattern to keep) and "type", one of ${FIELD_TYPES.join(', ')}.`,
  '',
  '"contract" carries a "fields" object keyed by those same names.',
  'Each entry may state "required" (true when a reading must have',
  'been taken at all), "type" from that same list, and "pattern".',
].join('\n');

// ---------------------------------------------------------------------------
// Asking the server
// ---------------------------------------------------------------------------

/** Whether a value is a plain object whose members may be read. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Whatever an error has to say, without assuming it is an `Error`.
 *
 * Read into the message even though the original is attached as
 * `cause`: a vitest failure line shows the message and not the chain
 * behind it, so a decode fault that only lived in the cause would
 * report as an unexplained refusal.
 */
function faultText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

/**
 * Post one generation request, and answer the decoded response body.
 *
 * The frame arrives already composed, and its two halves go to the
 * two the server takes: the trusted half — persona plus the
 * data notice — as `system`, and the fenced payload as `prompt`.
 * Nothing else is sent, which is the point of handing a
 * `PromptFrameResult` in rather than two strings a caller assembled.
 *
 * `stream: false` so there is one body to read instead of a chunk
 * sequence, and `format: 'json'` so the decoding is constrained
 * server-side — neither is a claim that the answer will be USABLE,
 * only that it will be JSON, which is why {@link readProposal} still
 * has work to do.
 *
 * The request abandons itself at {@link REQUEST_TIMEOUT_MS}. A server
 * that accepted the connection and then stopped answering is the one
 * failure a case budget alone reports as the case's own fault.
 *
 * @param settings - Where to ask, and which model.
 * @param frame - The composed prompt, already checked usable.
 * @returns The decoded body, unread.
 * @throws {Error} When the server refused the request.
 */
async function askOllama(
  settings: LiveOllamaSettings,
  frame: PromptFrameResult,
): Promise<unknown> {
  const res = await fetch(new URL('/api/generate', settings.baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      format: 'json',
      model: settings.model,
      prompt: frame.data,
      stream: false,
      system: frame.system,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(
      `[config-proposer.live] the server answered ${res.status} `
      + `${res.statusText} to the generation request.`,
    );
  }

  return res.json();
}

/**
 * Read the two documents out of what the server sent back.
 *
 * Four refusals, and every one of them is a proposer that could not
 * be UNDERSTOOD rather than a proposal that is wrong.
 * `proposeSourceConfig` lets a throw through untouched for exactly
 * that distinction, and its own header argues it: a row written for
 * a question nobody answered would read, to whoever rules on the
 * queue, like a model that had genuinely answered with nothing.
 *
 * What is deliberately NOT refused is the substance. An answer that
 * is an object but names neither member yields two `undefined`s,
 * which become a row and then a fault list from
 * `parserConfigErrors`. A model that answered the wrong shape is a
 * reading for the case to report, not an error for this helper to
 * raise.
 *
 * @param body - The decoded response body.
 * @returns The two documents, as answered and uncopied.
 * @throws {Error} When the body carries no readable generation.
 */
function readProposal(body: unknown): ProposedConfig {
  if (!isRecord(body)) {
    throw new Error(
      '[config-proposer.live] the server answered something that is '
      + 'not an object, so it is not a generation at all.',
    );
  }

  const answer = body['response'];

  if (typeof answer !== 'string') {
    throw new Error(
      '[config-proposer.live] the server answered no `response` '
      + 'string, so there is no generation in the body to read.',
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(answer);
  } catch (error) {
    throw new Error(
      '[config-proposer.live] the model answered text that is not '
      + `JSON: ${faultText(error)}`,
      { cause: error },
    );
  }

  if (!isRecord(parsed)) {
    throw new Error(
      '[config-proposer.live] the model answered JSON that is not an '
      + 'object, so there is nowhere for the two documents to be.',
    );
  }

  return {
    parserConfig: parsed['parserConfig'],
    contract: parsed['contract'],
  };
}

/**
 * A {@link ConfigProposer} backed by a local model server.
 *
 * Built here rather than shipped, which is the seam
 * `src/sources/config-proposer.ts` describes: that module declares
 * the interface and constructs nothing, so the run that wants a
 * proposal is the run that decides what may be called. This case is
 * such a run, and this function is the whole of its client.
 *
 * `name` records the model, because there is no `connectors` row
 * behind this one to name. In a run that is what `proposed_by`
 * carries, and it is what an operator ruling on the queue reads to
 * know what was asked.
 *
 * The source is not shown to the model, and the underscore is that
 * decision rather than a leftover parameter. Everything a proposer
 * needs is in the payload; the endpoint is text the source side of
 * the arrangement supplies, so naming it in the persona would put
 * somebody else's string in the trusted half.
 *
 * @param settings - Where to ask, and which model.
 * @returns The proposer, ready to hand to `proposeSourceConfig`.
 */
function ollamaProposer(settings: LiveOllamaSettings): ConfigProposer {
  return {
    name: `ollama:${settings.model}`,
    async propose(
      _source: ProposalSource,
      sample: unknown,
    ): Promise<ProposedConfig> {
      const frame = promptFrame(PERSONA, JSON.stringify(sample, null, 2));

      if (!frame.usable) {
        throw new Error(
          '[config-proposer.live] the prompt frame was refused '
          + `before anything was sent: ${frame.reason}`,
        );
      }

      return readProposal(await askOllama(settings, frame));
    },
  };
}

// ---------------------------------------------------------------------------
// The case
// ---------------------------------------------------------------------------

describeLiveOllama('proposing a source config from a local model', () => {
  it(
    'answers a parser_config the deterministic engine accepts',
    async () => {
      const settings = requireLiveOllama();

      const row = await proposeSourceConfig(
        ollamaProposer(settings),
        SOURCE,
        SAMPLE_PAYLOAD,
      );

      // The whole claim, and deliberately not one more. Not that the
      // config reads THIS payload, not that its fields are the ones
      // a person would have chosen, not that two runs agree — only
      // that what came back is a document the engine will execute.
      // Everything past that is what the approval gate is for.
      expect(parserConfigErrors(row.parserConfig)).toEqual([]);
    },
    CASE_TIMEOUT_MS,
  );
});
