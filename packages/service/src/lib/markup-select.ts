/**
 * @packageDocumentation
 * markup-select — the smallest selector language that answers a
 * useful question about markup, and a deliberate refusal to be
 * anything larger.
 *
 * A `sources.parser_config` field may carry a `selector`, and this
 * is what reads it: given markup and that selector, the fragments
 * the selector names, in the order the document holds them. Four
 * predicates, one combination, and a scan that never raises.
 *
 * This is the whole of the grammar:
 *
 * ```text
 * h2                        an element name, matched case-blind
 * #summary                  the id attribute, matched verbatim
 * .title                    one of the class attribute's words
 * .title.wide               two of them; both have to be there
 * [data-kind=bulletin]      an attribute equal to a value
 * [data-kind="two words"]   quoted, where the value has a space
 * article.card              a name and predicates on one element
 * article .title span       whitespace is DESCENDANT, at any depth
 * ```
 *
 * Everything else a selector could carry is refused, and the list
 * is worth reading as the design rather than as a backlog: the
 * child, adjacent and sibling combinators, comma-separated lists,
 * the universal `*`, every pseudo-class and pseudo-element,
 * namespaces, the prefix, suffix and substring attribute
 * operators, `[attr]` with no value, the case-insensitivity flag,
 * and any escape inside a name. A selector carrying one of them is
 * unparseable here, and an unparseable selector answers NO
 * FRAGMENTS rather than raising.
 *
 * ## Why a `parser_config` does not want a CSS engine
 *
 * Four reasons, in the order they bind.
 *
 * A CSS ENGINE IMPLIES A DOM, and a DOM implies the HTML parsing
 * algorithm — the insertion modes, implied end tags, foster
 * parenting, the error recovery every real document leans on. That
 * is a component nobody here would own, and the splice rule below
 * makes it worse than a dependency question: a library reaches a
 * Code node as its own text, so an engine imported here would have
 * to be vendored into every node that inlines this file.
 *
 * A CONFIG IS DATA SOMEBODY TYPED, and soon data a model proposed
 * — `src/sources/config-proposer.ts` is that seam. A grammar with
 * one spelling per thing is worth more to both of them than a
 * grammar that reaches every element: there is no half-remembered
 * second form for an operator to reach for, and a proposal is
 * checkable by reading it.
 *
 * A SELECTOR THAT MISSES IS ALREADY REPORTED. A field whose
 * selector matches nothing reads as `null`; `contractErrors` in
 * `parser-config.ts` names the member that did not arrive; and
 * fail-flag-keep stores the raw payload, marks the document failed
 * and bumps the source's counter. So the cost of a subset too
 * small for some source is a visible refusal over a stored
 * payload — not a document carrying text from the wrong element,
 * which is what an engine guessing at a malformed page buys.
 *
 * AND A SMALL SUBSET IS EXHAUSTIBLE. Every predicate here has a
 * case, and the scan below is one linear pass with no backtracking
 * in it, so an adversarial document costs what its length costs. A
 * selector language with nested pseudo-classes has neither
 * property, and both are what let an extraction be replayed.
 *
 * ## A fragment is a substring, and nothing is decoded
 *
 * Each fragment is the INNER markup of a matched element, taken by
 * position out of the string that came in: character for
 * character, entities as they were written, whitespace as it
 * arrived, the tags inside it still tags. Nothing here decodes
 * `&amp;`, collapses a run of spaces, or trims an edge. A matched
 * element holding nothing — a void element, an empty one —
 * contributes the empty string, because that is what it holds.
 *
 * That is the pairing with `src/sources/html-text.ts`, and the
 * division is exact: this module says WHICH markup, that one says
 * what the markup SAYS. A caller holding both decides whether a
 * fragment is passed on as markup or reduced to text, because
 * neither module can reach the other — the splice rule forbids the
 * import in both directions, so the two are paired by whoever
 * calls them and never by a specifier.
 *
 * The rule is visible in the attribute predicate, and the case
 * pinning it is the pair worth knowing about:
 * `[title="a&amp;b"]` matches the attribute as the document spells
 * it, and `[title="a&b"]` does not. Decoding here would be a
 * second entity table beside the one `html-text.ts` already owns,
 * and two tables drifting apart is a worse answer than one rule a
 * config author can see.
 *
 * ## A refusal is an empty list
 *
 * Two things answer no fragments, and to a caller they are
 * deliberately the same answer: a selector this grammar cannot
 * parse, and a selector that parses and matches nothing.
 * {@link parseSelector} is exported so a case can tell them apart
 * — `null` for the first, a step list for the second — and that is
 * the only place the difference is available.
 *
 * Answering rather than raising is the contract
 * `parser-config.ts` was written against: it calls the injected
 * markup step for every selector field of every record of a batch,
 * and one throw would take the batch with it. It wraps the call in
 * a `try` regardless, because the step is injected and the next
 * caller may supply something else. This module is what makes that
 * guard redundant rather than load-bearing.
 *
 * ## Reading a document nobody closed
 *
 * Markup from a source is markup somebody else generated, so the
 * scan is written for the malformed case first and the well-formed
 * one falls out of it.
 *
 * A `<` not followed by a name or a `/` is TEXT, so `a < b` and
 * `<3` are prose rather than the start of an element. A comment
 * runs to `-->` and a doctype to the next `>`, whatever either
 * carries inside. A quoted attribute value may hold a `>` without
 * ending its tag. A close tag naming an element nothing opened is
 * IGNORED rather than closing something else, and a close tag
 * naming an ancestor closes everything under it. An element nobody
 * ever closed runs to the end of the input, which is what a
 * browser does with one and what makes an unclosed match a
 * fragment rather than a dropped reading.
 *
 * {@link RAW_TEXT_ELEMENTS} are read WHOLE, because their content
 * is not markup: a `<` inside a script is an operator. Reading one
 * as markup is how a single `if (a<b)` puts a `b` element on the
 * stack that nothing ever closes, and every element after it ends
 * up nested inside something the document does not contain.
 *
 * ## An attribute name is a key, and a key is a trap
 *
 * Attribute names arrive out of a stranger's document, so they
 * live in a `Map` rather than in an object.
 *
 * The WRITE side is where a plain object loses data: an assignment
 * to `__proto__` goes through the prototype setter and changes
 * nothing, so an element that really does carry an attribute
 * spelled that way reads as an element that does not. The READ
 * side survives an equality predicate by luck rather than by
 * design — a plain object answers a FUNCTION for `toString` over
 * an element holding no attributes at all, and a function equals
 * no value a selector can spell — and it would stop surviving the
 * day a predicate asked whether an attribute was merely PRESENT. A
 * `Map` has neither hazard: no prototype to read through, and no
 * setter to write through. This module is new rather than ported,
 * so the trap is closed rather than pinned, and
 * `tests/lib/markup-select.test.ts` drives both names from both
 * ends.
 *
 * ## Dual context
 *
 * Like every module under `src/lib/`, this one is imported by the
 * default suite AND spliced into a workflow Code node body by
 * `scripts/build-workflows.ts`. So it imports nothing — including
 * the two modules it is used beside — keeps no state between
 * calls, reaches for no global beyond the language itself, and
 * cannot be split into a file per concern.
 * `tests/build/lib-splice.test.ts` registers it and reads what a
 * real build made of it.
 *
 * The no-state rule reaches further here than it looks. Every
 * pattern below is a single-character class tested against one
 * character, or an anchored pattern matched against a short slice;
 * none of them carries the sticky or global flag. A `y` or `g`
 * regular expression at module scope carries its `lastIndex` from
 * one call into the next, which is exactly the state that rule
 * forbids and the one shape of it a transpiler scan cannot see.
 */

// ---------------------------------------------------------------------------
// Bounds and vocabularies
// ---------------------------------------------------------------------------

/**
 * How long a stored selector may be, in characters.
 *
 * A bound on what an operator can paste into a row rather than a
 * defence: the scan is linear in the markup and in the selector
 * alike, so a long selector costs nothing to run. What it buys is
 * that a `parser_config` field holding a page of text is refused
 * as a selector rather than matched against an element name nobody
 * wrote.
 */
export const MAX_SELECTOR_LENGTH = 256;

/**
 * How many descendant steps one selector may carry.
 *
 * The same kind of bound over the other axis. Each step costs one
 * comparison per ancestor of every element, so this is what keeps
 * the per-element work a constant rather than something a config
 * chooses; and a selector describing eight levels of nesting is
 * describing a page's layout rather than a source's shape.
 */
export const MAX_SELECTOR_STEPS = 8;

/**
 * How many fragments one call answers.
 *
 * The one cap here that can DROP a reading, and it bounds
 * amplification rather than effort. Fragments nest: a selector
 * naming a container matches every container that one is nested
 * inside, and each match carries the whole of what it holds, so a
 * document of nested elements answers a fragment list quadratic in
 * its own length. The cap bounds the COUNT and not the size, and a
 * fragment is answered whole or not at all — half an element is a
 * fragment nobody can read, and cutting one would be this module
 * inventing text.
 *
 * Past the cap the scan keeps going and matches stop being
 * recorded, so what comes back is the first {@link MAX_FRAGMENTS}
 * in document order rather than an arbitrary window of them.
 */
export const MAX_FRAGMENTS = 256;

/**
 * Elements that hold nothing and are never closed.
 *
 * Reading one as an open element is how a `<br>` swallows the rest
 * of its paragraph: nothing ever closes it, so every later element
 * reads as nested inside it and a descendant selector matches
 * where it should not. Each of these opens and closes at once, and
 * a match on one contributes the empty string.
 */
export const VOID_ELEMENTS: readonly string[] = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
  'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
];

/**
 * Elements whose content is not markup.
 *
 * Read whole, from the opening tag to the first close tag naming
 * the same element, with everything between them taken as text.
 * Two of them, and not the seven `html-text.ts` calls dead blocks:
 * that roster answers a different question — which elements hold
 * nothing a reader sees — and this one holds the elements whose
 * content would be MIS-READ as markup. A `<head>` carries ordinary
 * tags; a script carries `<` as an operator.
 */
export const RAW_TEXT_ELEMENTS: readonly string[] = ['script', 'style'];

/** What may open an element name, in markup. */
const ELEMENT_START = /[A-Za-z]/u;

/** What may open an attribute name, in markup. */
const ATTRIBUTE_START = /[A-Za-z_:]/u;

/**
 * What may continue either name, in markup.
 *
 * One class for both, and deliberately wider than an element name
 * needs: a namespaced name is read whole and matched whole, which
 * is the same answer as not supporting namespaces and a shorter
 * way to say it.
 */
const NAME_REST = /[A-Za-z0-9_.:-]/u;

/** An element name, at the front of a selector step. */
const SELECTOR_TAG = /^[A-Za-z][A-Za-z0-9-]*/u;

/** An attribute name, inside a selector's brackets. */
const SELECTOR_ATTRIBUTE = /^[A-Za-z_:][A-Za-z0-9_.:-]*/u;

/** What an id or a class may be spelled with, in a selector. */
const NAME_TOKEN = /^[A-Za-z0-9_-]+/u;

/** An unquoted attribute value, in a selector. */
const UNQUOTED_VALUE = /^[^\]\s'"]+/u;

/** One character of whitespace, in either language. */
const SPACE = /\s/u;

/** A run of it, which is what separates two of anything here. */
const SPACE_RUN = /\s+/u;

// ---------------------------------------------------------------------------
// What a selector is, once it has been read
// ---------------------------------------------------------------------------

/**
 * One `[name=value]` predicate a step carries.
 *
 * The name is lower-cased, because markup spells attribute names
 * either way and means the same one. The value is exactly as the
 * selector wrote it — no decoding, no case folding, no trimming —
 * for the reason the header gives.
 */
export interface AttributePredicate {
  /** The attribute, lower-cased. */
  readonly name: string;

  /** What it has to equal, verbatim. */
  readonly value: string;
}

/**
 * One step of a selector: an element, and every predicate on it.
 *
 * A step with no tag matches any element carrying its predicates,
 * which is what `.title` means. A step with neither a tag nor a
 * predicate cannot be spelled — {@link parseSelector} refuses an
 * empty step rather than answering one that matches everything.
 */
export interface SelectorStep {
  /** The element name, lower-cased, or `null` for any element. */
  readonly tag: string | null;

  /** The id it must carry, or `null`. */
  readonly id: string | null;

  /** Classes it must all carry, in the order they were written. */
  readonly classes: readonly string[];

  /** Attribute equalities it must all satisfy. */
  readonly attributes: readonly AttributePredicate[];
}

/** What {@link parseAttributePredicate} read, and how far it got. */
interface AttributeRead {
  /** The predicate itself. */
  readonly predicate: AttributePredicate;

  /** How many characters of the step it consumed. */
  readonly length: number;
}

/**
 * A selector, read into the steps it names.
 *
 * Exported for one reason: it is the only way to tell an
 * unparseable selector from one that parses and matches nothing,
 * and a case that cannot tell those apart would pass just as
 * happily for a matcher that had stopped matching anything at all.
 * Nothing in the pipeline calls it — {@link markupSelect} is the
 * entry point, and it parses its own selector on every call,
 * because a cache is state that outlives one.
 *
 * @param selector - The selector, as a `parser_config` stored it.
 * @returns The steps, or `null` for anything this grammar refuses.
 */
export function parseSelector(selector: string): SelectorStep[] | null {
  const trimmed = selector.trim();

  if (trimmed.length === 0 || trimmed.length > MAX_SELECTOR_LENGTH) {
    return null;
  }

  const words = splitSteps(trimmed);

  if (words.length > MAX_SELECTOR_STEPS) {
    return null;
  }

  const steps: SelectorStep[] = [];

  for (const word of words) {
    const step = parseStep(word);

    if (step === null) {
      return null;
    }

    steps.push(step);
  }

  return steps;
}

/**
 * A selector cut into its steps, at the whitespace between them.
 *
 * Quote-aware, and it has to be: whitespace is the descendant
 * combinator AND the thing a quoted attribute value exists to
 * carry, so a plain split would tear `[data-kind="two words"]`
 * into two steps that are each unparseable. Only whitespace
 * OUTSIDE a bracket, and outside a quote inside one, separates
 * anything.
 *
 * Everything else this sees is somebody else's problem:
 * {@link parseStep} is what refuses a word, so a bracket nothing
 * closes and a quote nothing closes both arrive there as one long
 * step rather than being judged here.
 *
 * @param selector - The selector, already trimmed.
 * @returns Its steps, still as text.
 */
function splitSteps(selector: string): string[] {
  const words: string[] = [];
  let start = 0;
  let quote = '';
  let bracketed = false;

  for (let at = 0; at < selector.length; at += 1) {
    const char = selector.charAt(at);

    if (quote !== '') {
      quote = char === quote
        ? ''
        : quote;
    } else if (bracketed && (char === '"' || char === '\'')) {
      quote = char;
    } else if (char === '[' || char === ']') {
      bracketed = char === '[';
    } else if (!bracketed && SPACE.test(char)) {
      if (at > start) {
        words.push(selector.slice(start, at));
      }

      start = at + 1;
    }
  }

  if (selector.length > start) {
    words.push(selector.slice(start));
  }

  return words;
}

/**
 * One step, read out of one of {@link splitSteps}'s words.
 *
 * Refuses on the first character it has no rule for, which is what
 * turns every excluded feature into a refusal rather than a silent
 * truncation: a `>` combinator, a `:` pseudo-class, a `*`, a `|`
 * namespace and a `,` list all arrive here as a character no
 * predicate opens with.
 *
 * @param word - One whitespace-free run of the selector.
 * @returns The step, or `null` if it is not one.
 */
function parseStep(word: string): SelectorStep | null {
  const named = SELECTOR_TAG.exec(word);
  const tag = named === null
    ? null
    : named[0].toLowerCase();

  let rest = named === null
    ? word
    : word.slice(named[0].length);

  let id: string | null = null;
  const classes: string[] = [];
  const attributes: AttributePredicate[] = [];

  while (rest.length > 0) {
    const head = rest.charAt(0);

    if (head === '[') {
      const read = parseAttributePredicate(rest);

      if (read === null) {
        return null;
      }

      attributes.push(read.predicate);
      rest = rest.slice(read.length);
      continue;
    }

    const token = head === '#' || head === '.'
      ? NAME_TOKEN.exec(rest.slice(1))
      : null;

    if (token === null || (head === '#' && id !== null)) {
      return null;
    }

    if (head === '#') {
      id = token[0];
    } else {
      classes.push(token[0]);
    }

    rest = rest.slice(1 + token[0].length);
  }

  if (tag === null && id === null
    && classes.length === 0 && attributes.length === 0) {
    return null;
  }

  return { tag, id, classes, attributes };
}

/**
 * One `[name=value]` predicate, read off the front of a step.
 *
 * Every part is required, the `=` and the value included: an
 * attribute PRESENCE test is one of the things this grammar does
 * not have, and refusing `[data-id]` outright is what keeps it
 * from being half-supported. The value may be quoted with either
 * quote, and has to be quoted to carry whitespace or a `]`.
 *
 * @param text - The rest of the step, opening with `[`.
 * @returns The predicate and its length, or `null`.
 */
function parseAttributePredicate(text: string): AttributeRead | null {
  const named = SELECTOR_ATTRIBUTE.exec(text.slice(1));

  if (named === null) {
    return null;
  }

  let at = 1 + named[0].length;

  if (text.charAt(at) !== '=') {
    return null;
  }

  at += 1;

  const quote = text.charAt(at);
  const read = quote === '"' || quote === '\''
    ? readQuotedValue(text, at, quote)
    : readUnquotedValue(text, at);

  if (read === null) {
    return null;
  }

  at = read.end;

  if (text.charAt(at) !== ']') {
    return null;
  }

  return {
    predicate: { name: named[0].toLowerCase(), value: read.value },
    length: at + 1,
  };
}

/** A value read out of a selector, and where it ended. */
interface ValueRead {
  /** The value, exactly as it was written. */
  readonly value: string;

  /** The index just past it. */
  readonly end: number;
}

/**
 * A quoted attribute value, from its opening quote.
 *
 * A value nothing closes is a refusal rather than a value running
 * to the end of the selector: an operator who left a quote off
 * meant something, and the something is not `data-id="x]`.
 *
 * @param text - The step.
 * @param from - Index of the opening quote.
 * @param quote - The quote character itself.
 * @returns The value, or `null` if the quote is never closed.
 */
function readQuotedValue(
  text: string,
  from: number,
  quote: string,
): ValueRead | null {
  const closes = text.indexOf(quote, from + 1);

  return closes < 0
    ? null
    : { value: text.slice(from + 1, closes), end: closes + 1 };
}

/**
 * An unquoted attribute value, which ends at whitespace or a `]`.
 *
 * @param text - The step.
 * @param from - Index of the first character of the value.
 * @returns The value, or `null` if there is not one.
 */
function readUnquotedValue(text: string, from: number): ValueRead | null {
  const read = UNQUOTED_VALUE.exec(text.slice(from));

  return read === null
    ? null
    : { value: read[0], end: from + read[0].length };
}

// ---------------------------------------------------------------------------
// What the scan makes of one element
// ---------------------------------------------------------------------------

/**
 * Everything a step is matched against, for one element.
 *
 * Classes are split once, when the element is read, rather than on
 * every comparison: a class attribute is split once per element and
 * a step is matched against every ancestor of every element, so the
 * two are not the same amount of work.
 */
interface ElementFacts {
  /** The element name, lower-cased. */
  readonly name: string;

  /** The words of its class attribute, verbatim. */
  readonly classes: readonly string[];

  /** Its attributes, names lower-cased and values verbatim. */
  readonly attributes: ReadonlyMap<string, string>;
}

/** One element the scan has opened and not yet closed. */
interface OpenElement extends ElementFacts {
  /** Where its content begins, just past its opening tag. */
  readonly contentStart: number;

  /** Which fragment it fills, or `-1` if it is not a match. */
  readonly slot: number;
}

/** What {@link readTag} made of a `<`. */
interface TagRead {
  /** Whether it opens an element, closes one, or is neither. */
  readonly kind: 'open' | 'close' | 'skip';

  /** The element it names, lower-cased, empty for a skip. */
  readonly name: string;

  /** Its attributes, for an opening tag. */
  readonly attributes: ReadonlyMap<string, string>;

  /** Whether it closed itself with a `/>`. */
  readonly selfClosing: boolean;

  /** The index just past the whole tag. */
  readonly end: number;
}

/** Where a raw-text element's content and its closing tag end. */
interface RawTextEnd {
  /** Where the content stops. */
  readonly contentEnd: number;

  /** Where the closing tag stops. */
  readonly end: number;
}

/** What {@link readAttributes} made of the rest of an opening tag. */
interface TagTail {
  /** Every attribute it carried. */
  readonly attributes: ReadonlyMap<string, string>;

  /** Whether the tag closed itself. */
  readonly selfClosing: boolean;

  /** The index just past the tag. */
  readonly end: number;
}

// ---------------------------------------------------------------------------
// The scan
// ---------------------------------------------------------------------------

/**
 * The fragments a selector names, in document order.
 *
 * One linear pass: find the next `<`, decide what it is, and keep a
 * stack of what is open. An element matching the selector reserves
 * its place in the answer when it OPENS and fills it when it
 * closes, which is what makes the order the document's rather than
 * the order things finished in — an outer match closes after the
 * inner one it contains.
 *
 * Answers an empty list for a selector this grammar refuses, for a
 * selector matching nothing, and for markup holding no elements.
 * It has no other answer for any input: nothing here raises, and
 * every fragment it returns is a substring of what it was given.
 *
 * @param markup - The markup to read, however malformed.
 * @param selector - The selector, as a `parser_config` stored it.
 * @returns The inner markup of each matched element, verbatim.
 */
export function markupSelect(markup: string, selector: string): string[] {
  const steps = parseSelector(selector);

  if (steps === null) {
    return [];
  }

  const fragments: string[] = [];
  const open: OpenElement[] = [];
  let at = 0;

  while (at < markup.length) {
    const next = markup.indexOf('<', at);

    if (next < 0) {
      break;
    }

    const tag = readTag(markup, next);

    if (tag === null) {
      at = next + 1;
      continue;
    }

    at = tag.end;

    if (tag.kind === 'close') {
      closeElements(markup, open, fragments, tag.name, next);
      continue;
    }

    if (tag.kind === 'skip') {
      continue;
    }

    at = openElement(markup, tag, open, fragments, steps);
  }

  flushOpen(markup, open, fragments);

  return fragments;
}

/**
 * Take one opening tag: match it, and decide what it contains.
 *
 * Three shapes, and the order they are asked in is the design. A
 * tag that closed itself is closed whatever it names, so `<br/>`
 * and a source's `<script/>` are both empty rather than one of
 * them swallowing the document to a closing tag that is not there.
 * Then a void element, which is the same answer for a tag that did
 * not spell it. Then a raw-text element, read to its own closing
 * tag with everything between taken as text. Everything else opens
 * a scope.
 *
 * @param markup - The whole markup.
 * @param tag - The opening tag, already read.
 * @param open - The stack of elements not yet closed, mutated.
 * @param fragments - The answer so far, mutated.
 * @param steps - The parsed selector.
 * @returns Where the scan continues.
 */
function openElement(
  markup: string,
  tag: TagRead,
  open: OpenElement[],
  fragments: string[],
  steps: readonly SelectorStep[],
): number {
  const element: ElementFacts = {
    name: tag.name,
    classes: classesOf(tag.attributes),
    attributes: tag.attributes,
  };
  const slot = reserveSlot(steps, open, element, fragments);

  if (tag.selfClosing || VOID_ELEMENTS.includes(tag.name)) {
    recordFragment(fragments, slot, '');

    return tag.end;
  }

  if (RAW_TEXT_ELEMENTS.includes(tag.name)) {
    const raw = rawTextEnd(markup, tag.name, tag.end);

    recordFragment(fragments, slot, markup.slice(tag.end, raw.contentEnd));

    return raw.end;
  }

  open.push({ ...element, contentStart: tag.end, slot });

  return tag.end;
}

/**
 * Close every element down to the one a close tag names.
 *
 * A close tag naming nothing on the stack is IGNORED: the
 * alternative is popping whatever happens to be open, which turns
 * one stray `</div>` in a source's template into a document whose
 * every later element sits at the wrong depth. A close tag naming
 * an ancestor closes what is under it as well, each of those
 * ending where the close tag begins, which is the reading a
 * browser takes of the same document.
 *
 * @param markup - The whole markup.
 * @param open - The stack, mutated.
 * @param fragments - The answer so far, mutated.
 * @param name - What the close tag named, lower-cased.
 * @param closeStart - Index of the close tag's `<`.
 */
function closeElements(
  markup: string,
  open: OpenElement[],
  fragments: string[],
  name: string,
  closeStart: number,
): void {
  let depth = open.length - 1;

  while (depth >= 0 && open[depth]?.name !== name) {
    depth -= 1;
  }

  if (depth < 0) {
    return;
  }

  while (open.length > depth) {
    const frame = open.pop();

    if (frame !== undefined) {
      const text = markup.slice(frame.contentStart, closeStart);

      recordFragment(fragments, frame.slot, text);
    }
  }
}

/**
 * Close everything the document left open, at the end of it.
 *
 * An unclosed element's content runs to the end of the input.
 * That is the reading a browser takes, and it is the one that
 * keeps an unclosed match a fragment: the alternative — dropping a
 * match whose element never closed — would answer nothing at all
 * for a source that forgets one closing tag, which is a source
 * whose every reading silently disappears.
 *
 * @param markup - The whole markup.
 * @param open - The stack, emptied.
 * @param fragments - The answer so far, mutated.
 */
function flushOpen(
  markup: string,
  open: OpenElement[],
  fragments: string[],
): void {
  while (open.length > 0) {
    const frame = open.pop();

    if (frame !== undefined) {
      recordFragment(fragments, frame.slot, markup.slice(frame.contentStart));
    }
  }
}

/**
 * Reserve this element's place in the answer, if it matched.
 *
 * The place is taken when the element opens, so the answer is in
 * document order; {@link recordFragment} fills it when the element
 * closes. Past {@link MAX_FRAGMENTS} nothing is reserved and the
 * scan carries on, which is what makes the cap the first N matches
 * rather than a scan that stopped somewhere.
 *
 * @param steps - The parsed selector.
 * @param open - The stack, which is this element's ancestors.
 * @param element - The element itself.
 * @param fragments - The answer so far, mutated.
 * @returns The slot to fill, or `-1` for no match.
 */
function reserveSlot(
  steps: readonly SelectorStep[],
  open: readonly ElementFacts[],
  element: ElementFacts,
  fragments: string[],
): number {
  const capped = fragments.length >= MAX_FRAGMENTS;

  if (capped || !pathMatches(steps, open, element)) {
    return -1;
  }

  fragments.push('');

  return fragments.length - 1;
}

/**
 * Fill a reserved slot, or do nothing for an element that missed.
 *
 * @param fragments - The answer so far, mutated.
 * @param slot - What {@link reserveSlot} answered.
 * @param text - The element's inner markup, verbatim.
 */
function recordFragment(
  fragments: string[],
  slot: number,
  text: string,
): void {
  if (slot >= 0) {
    fragments[slot] = text;
  }
}

// ---------------------------------------------------------------------------
// Matching one element against a selector
// ---------------------------------------------------------------------------

/**
 * Whether this element, under these ancestors, is what the
 * selector names.
 *
 * Read RIGHT TO LEFT, which is what makes it cheap and what makes
 * it correct. The last step has to match the element itself, so an
 * element that is not the kind being asked for costs one
 * comparison; and the steps before it are then matched against the
 * ancestors from the nearest outwards, taking each one the first
 * time it fits. Taking the first fit is not a shortcut here: with
 * DESCENDANT as the only combination, a step satisfied by a nearer
 * ancestor is satisfied by anything a further one could satisfy,
 * so no earlier choice can cost a later match.
 *
 * @param steps - The parsed selector, at least one step.
 * @param ancestors - Everything open around this element.
 * @param element - The element itself.
 * @returns Whether the selector names it.
 */
function pathMatches(
  steps: readonly SelectorStep[],
  ancestors: readonly ElementFacts[],
  element: ElementFacts,
): boolean {
  const last = steps[steps.length - 1];

  if (last === undefined || !stepMatches(last, element)) {
    return false;
  }

  let wanted = steps.length - 2;
  let depth = ancestors.length - 1;

  while (wanted >= 0 && depth >= 0) {
    const step = steps[wanted];
    const ancestor = ancestors[depth];

    if (step !== undefined && ancestor !== undefined
      && stepMatches(step, ancestor)) {
      wanted -= 1;
    }

    depth -= 1;
  }

  return wanted < 0;
}

/**
 * Whether one element satisfies one step, predicate by predicate.
 *
 * Every predicate the step carries has to hold: a step is an AND,
 * and there is no OR anywhere in this grammar. The name is
 * compared lower-cased on both sides, because markup spells an
 * element either way; everything else is compared exactly, because
 * an id, a class and an attribute value are content.
 *
 * @param step - One step of the selector.
 * @param element - The element to judge.
 * @returns Whether it satisfies the step.
 */
function stepMatches(step: SelectorStep, element: ElementFacts): boolean {
  if (step.tag !== null && step.tag !== element.name) {
    return false;
  }

  if (step.id !== null && element.attributes.get('id') !== step.id) {
    return false;
  }

  for (const wanted of step.classes) {
    if (!element.classes.includes(wanted)) {
      return false;
    }
  }

  for (const predicate of step.attributes) {
    if (element.attributes.get(predicate.name) !== predicate.value) {
      return false;
    }
  }

  return true;
}

/**
 * The words of an element's class attribute.
 *
 * Split on whitespace and nothing else, with the words kept as the
 * document spelled them. An element carrying no class attribute
 * and one carrying an empty class attribute answer the same empty
 * list, which is the same thing said twice rather than a
 * distinction this grammar can ask about.
 *
 * @param attributes - The element's attributes.
 * @returns Its classes, in the order they were written.
 */
function classesOf(attributes: ReadonlyMap<string, string>): string[] {
  const raw = attributes.get('class');

  if (raw === undefined) {
    return [];
  }

  return raw.split(SPACE_RUN).filter((word) => word.length > 0);
}

// ---------------------------------------------------------------------------
// Reading the markup
// ---------------------------------------------------------------------------

/**
 * What the `<` at this index begins.
 *
 * Answers `null` when it begins nothing — the case that makes `a <
 * b` and `<3` prose rather than markup, and the reason this
 * matcher can be pointed at a document that is mostly text. A
 * comment, a doctype and a processing instruction are read for
 * their extent and skipped, whatever they carry inside them.
 *
 * @param markup - The whole markup.
 * @param at - Index of the `<`.
 * @returns What it begins, or `null` if it begins nothing.
 */
function readTag(markup: string, at: number): TagRead | null {
  if (markup.startsWith('<!--', at)) {
    const closes = markup.indexOf('-->', at + 4);

    return skipTo(endOrLength(markup, closes, 3));
  }

  const head = markup.charAt(at + 1);

  if (head === '!' || head === '?') {
    const closes = markup.indexOf('>', at + 2);

    return skipTo(endOrLength(markup, closes, 1));
  }

  if (head === '/') {
    return readCloseTag(markup, at);
  }

  if (!ELEMENT_START.test(head)) {
    return null;
  }

  const name = readName(markup, at + 1);
  const tail = readAttributes(markup, at + 1 + name.length);

  return {
    kind: 'open',
    name: name.toLowerCase(),
    attributes: tail.attributes,
    selfClosing: tail.selfClosing,
    end: tail.end,
  };
}

/**
 * A closing tag, or `null` for a `</` that names no element.
 *
 * @param markup - The whole markup.
 * @param at - Index of the `<`.
 * @returns The tag, or `null`.
 */
function readCloseTag(markup: string, at: number): TagRead | null {
  if (!ELEMENT_START.test(markup.charAt(at + 2))) {
    return null;
  }

  const name = readName(markup, at + 2);
  const closes = markup.indexOf('>', at + 2 + name.length);

  return {
    kind: 'close',
    name: name.toLowerCase(),
    attributes: new Map(),
    selfClosing: false,
    end: endOrLength(markup, closes, 1),
  };
}

/**
 * Something this scan steps over rather than reads.
 *
 * Allocates its own empty attribute map rather than sharing one
 * held at module scope. A shared map would be state outliving a
 * call, which is the dual-context rule this file is written to,
 * and a `ReadonlyMap` type is a compile-time promise rather than
 * the runtime one that rule is about.
 *
 * @param end - Where the thing being skipped ends.
 * @returns A tag read that opens and closes nothing.
 */
function skipTo(end: number): TagRead {
  return {
    kind: 'skip',
    name: '',
    attributes: new Map(),
    selfClosing: false,
    end,
  };
}

/**
 * An element or attribute name, from a character that opens one.
 *
 * A character scan rather than an anchored pattern over the rest
 * of the input: a pattern would need a slice per tag, and a slice
 * per tag over a long document is quadratic in its length. The
 * selector half of this file does use patterns, because a selector
 * is bounded by {@link MAX_SELECTOR_LENGTH} and a document is
 * bounded by nothing.
 *
 * @param markup - The whole markup.
 * @param from - Index of the first character of the name.
 * @returns The name, as the document spelled it.
 */
function readName(markup: string, from: number): string {
  let at = from;

  while (at < markup.length && NAME_REST.test(markup.charAt(at))) {
    at += 1;
  }

  return markup.slice(from, at);
}

/**
 * The rest of an opening tag, from just past its name.
 *
 * Tolerant by construction: a character that opens no attribute is
 * stepped over rather than ending the tag, so a stray `=`, a
 * doubled quote or an attribute syntax nobody here knows costs the
 * attributes around it nothing. A tag nothing terminates ends at
 * the end of the input.
 *
 * @param markup - The whole markup.
 * @param from - Index just past the element name.
 * @returns The attributes, and where the tag ended.
 */
function readAttributes(markup: string, from: number): TagTail {
  const attributes = new Map<string, string>();
  let at = from;

  while (at < markup.length) {
    const char = markup.charAt(at);

    if (char === '>') {
      return { attributes, selfClosing: false, end: at + 1 };
    }

    if (char === '/' && markup.charAt(at + 1) === '>') {
      return { attributes, selfClosing: true, end: at + 2 };
    }

    at = ATTRIBUTE_START.test(char)
      ? readAttribute(markup, at, attributes)
      : at + 1;
  }

  return { attributes, selfClosing: false, end: markup.length };
}

/**
 * One attribute, written into the tag's map.
 *
 * An attribute with no `=` is kept with an empty value rather than
 * dropped, so a document says which attributes an element carried
 * even where this grammar has no way to ask. The FIRST spelling of
 * a repeated attribute wins, which is what a browser does with the
 * same tag.
 *
 * @param markup - The whole markup.
 * @param from - Index of the first character of the name.
 * @param into - The tag's attribute map, mutated.
 * @returns Where the scan of this tag continues.
 */
function readAttribute(
  markup: string,
  from: number,
  into: Map<string, string>,
): number {
  const name = readName(markup, from);
  const equals = skipSpace(markup, from + name.length);
  const key = name.toLowerCase();

  if (markup.charAt(equals) !== '=') {
    remember(into, key, '');

    return equals;
  }

  const read = readMarkupValue(markup, skipSpace(markup, equals + 1));

  remember(into, key, read.value);

  return read.end;
}

/**
 * Keep an attribute unless the tag already carried that name.
 *
 * @param into - The tag's attribute map, mutated.
 * @param key - The attribute name, lower-cased.
 * @param value - Its value, verbatim.
 */
function remember(
  into: Map<string, string>,
  key: string,
  value: string,
): void {
  if (!into.has(key)) {
    into.set(key, value);
  }
}

/**
 * An attribute value inside markup, quoted or not.
 *
 * Where the selector half REFUSES a quote nothing closes, this
 * half reads to the end of the input, and the asymmetry is the
 * difference between the two languages rather than an
 * inconsistency. A selector is configuration somebody can correct;
 * markup is what a source sent, and refusing it would drop the
 * document instead of reading what is there.
 *
 * @param markup - The whole markup.
 * @param from - Index of the value or of its opening quote.
 * @returns The value, and where it ended.
 */
function readMarkupValue(markup: string, from: number): ValueRead {
  const quote = markup.charAt(from);

  if (quote === '"' || quote === '\'') {
    const closes = markup.indexOf(quote, from + 1);

    return closes < 0
      ? { value: markup.slice(from + 1), end: markup.length }
      : { value: markup.slice(from + 1, closes), end: closes + 1 };
  }

  let at = from;

  while (at < markup.length && markup.charAt(at) !== '>'
    && !SPACE.test(markup.charAt(at))) {
    at += 1;
  }

  return { value: markup.slice(from, at), end: at };
}

/**
 * Where a raw-text element's content and its closing tag end.
 *
 * The first close tag naming the same element ends it, and
 * everything before that is content whatever it looks like. An
 * element nothing closes runs to the end of the input, which is
 * the same reading {@link flushOpen} takes of an ordinary one.
 *
 * @param markup - The whole markup.
 * @param name - The element, lower-cased.
 * @param from - Index just past the opening tag.
 * @returns Where the content stops and where the tag stops.
 */
function rawTextEnd(markup: string, name: string, from: number): RawTextEnd {
  let at = from;

  while (at < markup.length) {
    const next = markup.indexOf('</', at);

    if (next < 0) {
      break;
    }

    const found = readName(markup, next + 2);

    if (found.toLowerCase() === name) {
      const closes = markup.indexOf('>', next + 2 + found.length);

      return { contentEnd: next, end: endOrLength(markup, closes, 1) };
    }

    at = next + 2;
  }

  return { contentEnd: markup.length, end: markup.length };
}

/**
 * Whitespace skipped, from an index.
 *
 * @param markup - The whole markup.
 * @param from - Where to start.
 * @returns The first index that is not whitespace.
 */
function skipSpace(markup: string, from: number): number {
  let at = from;

  while (at < markup.length && SPACE.test(markup.charAt(at))) {
    at += 1;
  }

  return at;
}

/**
 * Where something ends, given where its terminator was found.
 *
 * A terminator nobody wrote puts the end at the end of the input,
 * which is what keeps every one of these scans finite over a
 * document that stops in the middle of anything.
 *
 * @param markup - The whole markup.
 * @param found - Index of the terminator, or `-1`.
 * @param width - How long the terminator is.
 * @returns The index just past it.
 */
function endOrLength(markup: string, found: number, width: number): number {
  return found < 0
    ? markup.length
    : found + width;
}
