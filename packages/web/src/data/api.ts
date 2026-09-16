/**
 * @packageDocumentation
 * The accessor selector: the 34 names every hook and page reads its
 * data through, taken at BUILD time from either the fixture layer in
 * the tab (`./fixture/api.ts`) or the HTTP layer over the service
 * (`./http/api.ts`). It is the swap seam the fixture barrel's header
 * promised: no hook, page or spec names either BARREL — `./hooks.ts`
 * imports the accessors from here and every page reaches them through
 * a hook — so re-pointing the app at the service changes this file's
 * one input and no import anywhere else. (Pages and specs do still
 * name individual fixture MODULES, for the pure helpers and the rows
 * they assert on; that debt is `context/data.md`'s, not this seam's.)
 *
 * THE SWITCH RULE, as `./source.ts` states it and `resolveDataSource`
 * encodes it: `VITE_AR_API_URL` UNSET selects the fixture layer; any
 * string at all selects the HTTP layer, the EMPTY string included —
 * that is the same-origin production value, so a falsy test here
 * would send a `/app` build back to the fixtures. The value itself is
 * never read in this module; `./http/api.ts` resolves its own base URL
 * from the same variable when it first builds a client.
 *
 * WHY THE COMPARISON IS INLINE rather than `resolveDataSource(...)
 * .kind === 'fixture'`. Vite replaces the `import.meta.env` read with
 * a literal, and rolldown folds a comparison against that literal and
 * drops the branch not taken. It does NOT fold a call across a module
 * boundary: on a two-namespace probe against this package's own Vite,
 * the `resolveDataSource(...)` spelling left BOTH layers in BOTH
 * builds, while the comparison below left each build carrying only the
 * layer it selected. On this app the same two readings are `NOT_WIRED`
 * absent from a `VITE_AR_API_URL`-less build and present in a
 * `VITE_AR_API_URL=''` one, and a statement planted inside the fixture
 * barrel's own {@link fetchDomains} present in the first and absent
 * from the second. What does NOT leave the API bundle is the fixture
 * DATA modules: eight of the eleven, `./fixture/digest.ts` among them,
 * build a top-level const from a CALL that rolldown cannot prove pure,
 * so the module is kept for its side effect and its rows ship either
 * way. That is bundle debt below this seam, not a switch that
 * failed to fold.
 *
 * The rule is still `resolveDataSource`'s and is not restated from
 * memory: `./api.test.ts` pins that this comparison answers what
 * `resolveDataSource` answers, for every value `./source.test.ts`
 * covers, and that the falsy spelling would NOT.
 *
 * WHY THE READ IS OPTIONAL-CHAINED. Fifteen specs — fourteen under
 * `tests/e2e/` and one under `tests/visual/` — import this module into
 * the Playwright NODE process to name fixture rows, and there
 * `import.meta.env` is undefined. A bare member read throws at import
 * and takes the whole spec file with it: measured, with the chain
 * dropped, as `TypeError: Cannot read properties of undefined (reading
 * 'VITE_AR_API_URL')` before a single test of `shell.spec.ts` ran.
 * The chain costs nothing in a build: Vite replaces
 * `import.meta.env.VITE_AR_API_URL` through it, which is the same
 * probe's second reading.
 *
 * The two namespaces are held to one contract by
 * {@link AccessorsAgree}, a compile-time assertion that every name the
 * fixture barrel exports is exported by the HTTP barrel with an
 * IDENTICAL signature — not merely an assignable one. `./http/api.ts`
 * is typed off the fixture barrel, so the assertion is what catches
 * the day that stops being true; `./api.test.ts` makes the same claim
 * about the runtime name set.
 *
 * WRITES reach this seam as well as reads — 25 reads and 9 writes.
 * TWELVE `mutate` call sites, in ten page modules, drive the nine
 * through `./hooks.ts`: two on the digest page and one in its detail
 * modal, two in the sources approval modal and one each in the sources
 * editor and failures modals, one each in the agents, lexicon and
 * tools editor modals, one on the tools page and one on the settings
 * page. (A grep for `mutate` outside `src/data/` answers FOURTEEN; the
 * two it adds are prose, in `src/components/EditorModal.tsx` and
 * `src/pages/settings/SettingsPage.tsx`, and the fourteen is what
 * `context/data.md` still carries.) Under the fixture layer each write
 * lands in the session draft store; under the HTTP layer each rejects
 * with `NOT_WIRED` until its accessor is wired.
 */

import * as fixtureApi from './fixture/api';
import * as httpApi from './http/api';

/** The fixture barrel's accessors: the contract both layers answer. */
type Accessors = typeof fixtureApi;

/** One type, wrapped in a generic signature that hides its variance. */
type Probe<Of> = <T>() => T extends Of ? 1 : 2;

/**
 * `true` only when `A` and `B` are the SAME type.
 *
 * Mutual assignability is too weak for a signature comparison — a
 * parameter that widened would still be assignable in one direction, so
 * an accessor taking `string | number` where the fixture takes `string`
 * would pass. Comparing the two {@link Probe} signatures instead relates
 * them only when they are invariantly equal.
 */
type IsExact<A, B> = Probe<A> extends Probe<B>
  ? true
  : false;

/**
 * Every accessor name the HTTP barrel is missing or answers with a
 * different signature; `never` when the two barrels agree.
 */
type SignatureDrift = {
  [K in keyof Accessors]: K extends keyof typeof httpApi
    ? IsExact<Accessors[K], (typeof httpApi)[K]> extends true
      ? never
      : K
    : K;
}[keyof Accessors];

/** Accepts only `never`; anything else is a compile error naming it. */
type NoDrift<Drift extends never> = Drift;

/**
 * The assertion that both layers carry identical signatures.
 *
 * A `check-types` run is what enforces it: an accessor whose HTTP
 * spelling drifts from its fixture spelling, or which `./http/api.ts`
 * stops exporting at all, fails here with its own name in the message
 * rather than at the hook and page call sites downstream of it.
 */
export type AccessorsAgree = NoDrift<SignatureDrift>;

/** The build-time `VITE_AR_API_URL` read; `undefined` under node. */
const API_URL = import.meta.env?.VITE_AR_API_URL;

/** The layer the exports below are taken from. */
const api: Accessors = API_URL === undefined
  ? fixtureApi
  : httpApi;

/** The domains the switcher lists. */
export const fetchDomains = api.fetchDomains;
/** One domain by slug. */
export const fetchDomain = api.fetchDomain;
/** The verdict vocabulary a domain's findings use. */
export const fetchVerdicts = api.fetchVerdicts;
/** A domain's captured documents. */
export const fetchDocuments = api.fetchDocuments;
/** A domain's findings. */
export const fetchFindings = api.fetchFindings;
/** A domain's entities. */
export const fetchEntities = api.fetchEntities;
/** A domain's lexicon categories, each with its term count. */
export const fetchCategorySummaries = api.fetchCategorySummaries;
/** A domain's sources. */
export const fetchSources = api.fetchSources;
/** A domain's source count per status. */
export const fetchSourceStatusCounts = api.fetchSourceStatusCounts;
/** A domain's pending source-config proposals. */
export const fetchSourceProposals = api.fetchSourceProposals;
/** A domain's personas. */
export const fetchPersonas = api.fetchPersonas;
/** A domain's export subscriptions. */
export const fetchExportSubscriptions = api.fetchExportSubscriptions;
/** The installation's connectors. */
export const fetchConnectors = api.fetchConnectors;
/** The preference set. */
export const fetchSettings = api.fetchSettings;
/** The spend figure the sidebar shows. */
export const fetchSpendSummary = api.fetchSpendSummary;
/** The palette's suggestions. */
export const fetchSearchSuggestions = api.fetchSearchSuggestions;
/** The topbar's notifications. */
export const fetchNotifications = api.fetchNotifications;
/** The operator the topbar's avatar names. */
export const fetchOperator = api.fetchOperator;
/** One finding by id. */
export const fetchFinding = api.fetchFinding;
/** One source by id. */
export const fetchSource = api.fetchSource;
/** One persona by id. */
export const fetchPersona = api.fetchPersona;
/** One connector by id. */
export const fetchConnector = api.fetchConnector;
/** One lexicon category by id. */
export const fetchCategory = api.fetchCategory;
/** A category's terms. */
export const fetchTerms = api.fetchTerms;
/** A domain's documents that failed to parse. */
export const fetchSourceFailures = api.fetchSourceFailures;

/** Saves a category's whole term list. */
export const saveCategoryTerms = api.saveCategoryTerms;
/** Saves a whole finding. */
export const saveFinding = api.saveFinding;
/** Saves a whole source. */
export const saveSource = api.saveSource;
/** Rules on a source-config proposal. */
export const approveSourceConfig = api.approveSourceConfig;
/** Rules on a failed capture. */
export const resolveSourceFailure = api.resolveSourceFailure;
/** Saves a whole persona. */
export const savePersona = api.savePersona;
/** Saves a whole connector. */
export const saveConnector = api.saveConnector;
/** Saves a domain's export subscriptions. */
export const saveExportSubscriptions = api.saveExportSubscriptions;
/** Saves the whole preference set. */
export const saveSettings = api.saveSettings;
