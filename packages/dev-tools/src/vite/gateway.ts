/**
 * The interface a tracker sits behind — and, in this plan, nothing
 * else: `gateway.ts` declares types and exports no value at all.
 *
 * Spec item 8.4 is the authority — "the `ReportGateway` interface
 * (`file`, `search`, `comment`) is declared here with no
 * implementation; q20b-2 supplies one" — and decision 7 says why: the
 * plugin "registers in `serve` only and files nothing. It answers
 * status, defines the build-time constants, validates and stores
 * reports on disk. What happens to a stored report is q20b-2's
 * business, behind an injected gateway the plugin declares here and
 * leaves empty."
 *
 * ## What "ships none" means, concretely
 *
 * There is no `rafaGateway`, no `githubGateway` and no default
 * implementation anywhere in this plan, and `./plugin.ts` never
 * constructs one: a gateway arrives through `devtoolsPlugin({gateway})`
 * or the plugin has none, in which case `POST /__devtools/report`
 * answers `{status: 'stored', path}` after `./store.ts` has written the
 * files and `GET /__devtools/status` answers `gateway: 'none'`. That is
 * the whole of the plugin's gateway behaviour here.
 *
 * q20b-2's item 8 is what fills this in: `src/vite/gateway/rafa.ts`,
 * `rafaGateway({bin?, run?})`, implementing this interface over an
 * injected `run(argv)` that drives the `rafa` binary with an argv ARRAY
 * and parses its NDJSON result events. A second implementation over
 * `@open-tomato/rafa/qa-bug-reporter` is named in that spec as a
 * further implementation of this same interface rather than a rewrite,
 * which is the reason the seam is an interface and not a function
 * parameter list.
 *
 * ## Why this file has no colocated test
 *
 * Nothing here exists at runtime. Every declaration below is erased by
 * the compiler, so there is no behaviour a case could pin and no
 * `.js` for one to import; the cases that prove the shape is usable
 * are q20b-2's, against its implementation. `./store.ts` is the
 * module in this pair that has a colocated `store.test.ts`, because it
 * is the one that does something.
 *
 * ## Why the interface is not named with the package's prefix
 *
 * `ReportGateway` is the name spec item 8.4 and the plan's task text
 * both give it, so it is spelled exactly that way. The `devtools`
 * prefix law is about what the package puts into a SHARED namespace —
 * globals, storage keys, CSS custom properties, HTTP paths, env names —
 * and a type reached through an import is in none of those. The
 * supporting types take `ReportGateway` as their stem for the same
 * reason `DevToolsReport*` takes `DevToolsReport` as its own: a
 * reader finding one finds the rest beside it.
 *
 * ## The one member the plan's three method names do not cover
 *
 * {@link ReportGateway.name}. Spec item 8.2 has `GET
 * /__devtools/status` answer `gateway: 'none' | <name>`, so the plugin
 * has to be able to ask an injected gateway what it is called; there is
 * nowhere else that string could come from. It is declared here rather
 * than taken as a second plugin option so that an implementation cannot
 * be registered under a name it does not answer to.
 */

import type { DevToolsStoredReport } from './store';

/**
 * One issue in the tracker the gateway talks to.
 *
 * The three fields q20b-2's item 8 names for a search hit — "`search`
 * answers matches with id, title and url". {@link url} is optional
 * because rafa's `local` tracker has no web address to give, and the
 * feedback drawer shows the id and title when it is absent.
 */
export interface ReportGatewayIssue {
  /** The tracker's own identifier, as a string for every tracker. */
  readonly id: string;

  /** The issue title, as the tracker stores it. */
  readonly title: string;

  /** Where a person can read it, when the tracker has such a place. */
  readonly url?: string;
}

/** A report that reached the tracker. */
export interface ReportGatewayFiled {
  /** Always `'filed'`; the discriminant. */
  readonly status: 'filed';

  /**
   * Which tracker the chain actually landed on — `'github'`,
   * `'local'`, or whatever a later implementation adds.
   *
   * Carried rather than inferred because rafa's tracker chain falls
   * back, so the caller learns where the issue went and can offer the
   * prefilled-link path q20b-2's item 7 describes for `local`.
   */
  readonly tracker: string;

  /** The new issue's identifier. */
  readonly id: string;

  /** Where to read it, when the tracker has such a place. */
  readonly url?: string;
}

/** A report the gateway believes is already filed. */
export interface ReportGatewayDuplicate {
  /** Always `'duplicate'`; the discriminant. */
  readonly status: 'duplicate';

  /** The issue it matched, shown to the person who is deciding. */
  readonly match: ReportGatewayIssue;
}

/**
 * The gateway could not act.
 *
 * Not an exception, because the local write has already succeeded by
 * the time a gateway runs: a tracker that is missing, unauthenticated
 * or refusing leaves the report stored on disk, which is the outcome
 * q20b-2's item 8 gives the missing-binary and non-zero-exit cases. An
 * implementation therefore answers this rather than throwing, and
 * {@link reason} is one line a person can act on.
 */
export interface ReportGatewayRefusal {
  /** Always `'refused'`; the discriminant. */
  readonly status: 'refused';

  /**
   * Why, in one line.
   *
   * Reaches a browser through the plugin's JSON response, so an
   * implementation puts a tracker's own stderr line here and never
   * markup; a caller that renders it into HTML escapes it.
   */
  readonly reason: string;
}

/** What {@link ReportGateway.file} answers. */
export type ReportGatewayFileOutcome =
  | ReportGatewayFiled
  | ReportGatewayDuplicate
  | ReportGatewayRefusal;

/** Issues the tracker matched. */
export interface ReportGatewayMatches {
  /** Always `'matches'`; the discriminant. */
  readonly status: 'matches';

  /** What the tracker returned, possibly empty. */
  readonly matches: readonly ReportGatewayIssue[];
}

/** What {@link ReportGateway.search} answers. */
export type ReportGatewaySearchOutcome =
  | ReportGatewayMatches
  | ReportGatewayRefusal;

/**
 * What {@link ReportGateway.comment} answers.
 *
 * {@link ReportGatewayFiled} rather than a shape of its own, because a
 * comment on the matched issue is how q20b-2's "also affected" path
 * ends, and it ends as a filed report from the reporter's point of
 * view: the same tracker, the same id, the same url.
 */
export type ReportGatewayCommentOutcome =
  | ReportGatewayFiled
  | ReportGatewayRefusal;

/**
 * Where a stored report goes next.
 *
 * Every method answers rather than throws, and every method is async:
 * an implementation talks to a process or a network, and a dev-server
 * middleware that awaited a synchronous one would be lying about it.
 *
 * The three are deliberately independent — `./plugin.ts` in this plan
 * calls {@link file} alone, and q20b-2's drawer is what sequences
 * {@link search} before it and {@link comment} after it — so an
 * implementation that dedupes inside {@link file} and one that lets
 * the caller drive both are equally legal.
 */
export interface ReportGateway {
  /**
   * What this gateway is called.
   *
   * Reaches the browser as the `gateway` field of `GET
   * /__devtools/status`, whose other value is the literal `'none'`,
   * so an implementation does not answer `'none'` here — a status
   * payload cannot then say "configured" and "absent" at once.
   */
  readonly name: string;

  /**
   * Take a report that is already on disk to the tracker.
   *
   * Called by `./plugin.ts` AFTER `./store.ts` has written the JSON
   * and every attachment, so an implementation may link
   * {@link DevToolsStoredReport.path} and
   * {@link DevToolsStoredReport.attachmentPaths} in the issue body
   * knowing both exist. That ordering is also why a refusal is an
   * answer and not an exception: the report survives either way.
   *
   * @param report - The stored report, carrying the parsed body, the
   * round, and the paths the write produced.
   * @returns Filed, a duplicate for the caller to decide about, or a
   * refusal.
   */
  file(report: DevToolsStoredReport): Promise<ReportGatewayFileOutcome>;

  /**
   * Look for issues that may already be this report.
   *
   * @param query - Free text, which q20b-2's item 7 builds from the
   * title's words and then from the first sentence of the
   * description. An implementation passes it as one argv ELEMENT,
   * never as part of a shell string.
   * @returns The matches, possibly none, or a refusal.
   */
  search(query: string): Promise<ReportGatewaySearchOutcome>;

  /**
   * Add a comment to an existing issue.
   *
   * The "also affected" path, and the term for it is "also affected"
   * everywhere — labels, function names, test names, docs — per
   * q20b-2's item 7, which admits no other name for the action.
   *
   * @param issueId - The {@link ReportGatewayIssue.id} of the issue
   * being commented on.
   * @param body - The comment, already rendered by the caller.
   * @returns The issue as filed, or a refusal.
   */
  comment(issueId: string, body: string): Promise<ReportGatewayCommentOutcome>;
}
