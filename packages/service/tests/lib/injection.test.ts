/**
 * The six injection vectors, driven through both deterministic
 * layers the pipeline has, in the order the pipeline runs them.
 *
 * A vector is a whole document somebody else wrote, and by the time
 * it reaches this platform it has already been read by a model.
 * Nothing in that reading is a control. What IS a control is two
 * pieces of plain code, and they answer different questions:
 *
 * `src/lib/sanitize-md.ts` decides what a body may DO when it is
 * rendered. Every word survives, in order — including words that
 * read as orders — and every ACTIVE form is neutralized. It is a
 * bound on behaviour, never on content.
 *
 * `src/lib/validate-entity-name.ts` decides what a name taken out
 * of that body may REACH. A validated name lands in a query string
 * and in a line of a prompt, so the question is whether it could
 * change the SHAPE of a request, not whether it reads like an
 * attack.
 *
 * Each has cases of its own next door. This file is the one that
 * drives them TOGETHER, over documents written to defeat them, and
 * it is where the three claims that only make sense across both
 * layers are pinned.
 *
 * ## The three claims
 *
 * THE INJECTED WORDS SURVIVE VERBATIM, because they were treated as
 * data. Every fragment a vector registers under `survives` comes
 * back out of the sanitizer character for character — the sentence
 * ordering the reader to discard its instructions included. A
 * sanitizer that had started deleting hostile-looking prose would
 * fail here, and that failure is the point: text nobody can read is
 * a worse outcome than text nobody can act on, and it is the one
 * failure mode a corpus of hostile documents makes tempting.
 *
 * EVERY ACTIVE FORM IS NEUTRALIZED, and the reading is a set rather
 * than a count. The predicate below finds the six forms in a text;
 * over an ANSWER it must come back empty, and over the INPUT it
 * must come back holding exactly what the vector declared. Both
 * halves are needed. Without the second, a predicate that had
 * stopped seeing anything reports every answer clean.
 *
 * NOTHING A VECTOR CARRIES WIDENS WHAT THE GATE ACCEPTS. Nineteen
 * candidate names, drawn from the six documents, each pinned to the
 * answer the gate owes it; and then the same claim stated over the
 * ANSWERS, where it is the one that matters — every name the gate
 * accepted across the whole corpus is inside the cap and carries
 * none of the request shapes, whatever the document it came out of
 * was trying to do.
 *
 * ## The ordering, which is load-bearing and measured here
 *
 * The two layers are not interchangeable and they do not compose in
 * either direction. The gate reads the RAW extraction, and the one
 * case that proves this matters is at the foot of the file: exactly
 * one candidate in the corpus is refused as it stands and ACCEPTED
 * after a trip through the sanitizer, because the sanitizer's job
 * is to remove a tag and the gate's job is to refuse a value that
 * has one. Tidying the pipeline into "sanitize, then validate"
 * would open that value and nothing anywhere would report it.
 *
 * ## What this file does not do
 *
 * It compares nothing against the original — that is the parity
 * suite's job, and `tests/parity/validate-entity-name.parity.test.ts`
 * drives the same corpus. It also asserts nothing about a
 * caller-supplied non-answer roster, which is this port's own
 * parameter and belongs to `tests/lib/validate-entity-name.test.ts`.
 */
import { describe, expect, it } from 'vitest';

import { sanitizeUntrusted } from '../../src/lib/sanitize-md.js';
import {
  ENTITY_NAME_REJECTIONS,
  MAX_ENTITY_NAME_LENGTH,
  validateEntityName,
} from '../../src/lib/validate-entity-name.js';

import {
  INJECTION_ACTIVE_FORM_IDS,
  INJECTION_CANDIDATES,
  INJECTION_VECTORS,
  INJECTION_VECTOR_IDS,
  ZERO_WIDTH_SPLITTERS,
  ZERO_WIDTH_VECTOR,
  activeFormsNoVectorCarries,
  repeatedCandidateIds,
  repeatedVectorIds,
  unbuiltVectorIds,
  unregisteredActiveForms,
  unregisteredVectorIds,
} from './injection-fixtures.js';

// ---------------------------------------------------------------------------
// Reading a text for what it can still do
// ---------------------------------------------------------------------------

/** Sorted copy, so an equality is over members rather than order. */
function sorted(ids: readonly string[]): string[] {
  return [...ids].sort();
}

/** A tag, as the sanitizer's own pattern reads one. */
const TAG_RE = /<\/?[a-zA-Z][^>]*>/;

/** A line that is nothing but an underline run. */
const UNDERLINE_RE = /^[-=]+[ \t]*$/;

/** A link, wherever one sits in a body of text. */
const LINK_RE = /https?:\/\/[^\s<>`)\]]+/g;

/**
 * The characters a link may sit behind in an ANSWER.
 *
 * A backtick is a link the sanitizer wrapped. An opening
 * parenthesis is the one other legitimate place: inside a restored
 * image span, whose rendered form puts the URL in parentheses
 * INSIDE a code span. Anything else in front of a link means the
 * link is bare.
 */
const WRAPPED_LINK_LEAD: readonly string[] = ['`', '('];

/**
 * Every id {@link activeFormsLeftIn} is able to emit.
 *
 * Written out rather than derived, so it can be held against the
 * fixture module's vocabulary. The two lists live in different
 * files on purpose — the fixtures declare what a vector CARRIES and
 * this declares what a reader can FIND, and a claim that they name
 * the same six forms is only a claim while they are separate.
 */
const PREDICATE_FORM_IDS: readonly string[] = [
  'bare-link',
  'heading-run',
  'image-embed',
  'raw-tag',
  'setext-underline',
  'wiki-link-opener',
];

/**
 * Every active form still present in `text`, by roster id.
 *
 * Answers a list rather than a boolean so a failure names which
 * form survived rather than only that one did. Run over an ANSWER
 * it must come back empty; run over an INPUT it is the control that
 * says this predicate can still see anything at all.
 *
 * A copy of the predicate `tests/lib/sanitize-md.test.ts` uses, and
 * a copy on purpose: one test file cannot import another's
 * declarations, and a shared module would have to sit outside both
 * and be maintained against neither. What keeps the two honest is
 * that both are held against a vocabulary they do not own —
 * {@link INJECTION_ACTIVE_FORM_IDS} here, its own roster there.
 *
 * @param text - The text to read, answer or input.
 * @returns One id per form found, sorted, with repeats collapsed.
 */
function activeFormsLeftIn(text: string): string[] {
  const found = new Set<string>();

  if (text.includes('![')) {
    found.add('image-embed');
  }

  if (TAG_RE.test(text)) {
    found.add('raw-tag');
  }

  if (text.includes('[[')) {
    found.add('wiki-link-opener');
  }

  for (const line of text.split('\n')) {
    if (line.startsWith('#')) {
      found.add('heading-run');
    }

    if (UNDERLINE_RE.test(line)) {
      found.add('setext-underline');
    }
  }

  for (const match of text.matchAll(LINK_RE)) {
    const lead = match.index === 0
      ? ''
      : text.charAt(match.index - 1);

    if (!WRAPPED_LINK_LEAD.includes(lead)) {
      found.add('bare-link');
    }
  }

  return sorted([...found]);
}

/**
 * The request shapes a validated name may never carry.
 *
 * The gate's own denylist, written again here rather than imported
 * because the module deliberately does not export it: a `RegExp` is
 * a mutable object, so an exported one is a bound a caller can
 * rewrite in place. A second spelling is what makes the claim below
 * an independent reading of the ANSWER rather than the gate being
 * asked to vouch for itself.
 */
const REQUEST_SHAPE_RE = /:\/\/|[@\r\n`{}[\]<>]/;

// ---------------------------------------------------------------------------
// The roster this file is driven from
// ---------------------------------------------------------------------------

describe('injection — the corpus these cases are driven over', () => {
  // Both halves of the set equality. A vector authored and never
  // registered is driven by whatever iterates the entries and by
  // nothing that iterates the names; a name left behind after its
  // entry was renamed reads, from the list alone, exactly like a
  // vector that is covered.
  it('registers every vector it holds, and holds every one it names', () => {
    expect(unregisteredVectorIds()).toEqual([]);
    expect(unbuiltVectorIds()).toEqual([]);
    expect(INJECTION_VECTORS.length).toBe(INJECTION_VECTOR_IDS.length);
  });

  // The hole set equality cannot see. Two entries sharing an id
  // satisfy both halves above while the by-id lookup answers only
  // the first, so the second is registered, present, and driven by
  // nothing at all.
  it('carries no repeated vector or candidate id', () => {
    expect(repeatedVectorIds()).toEqual([]);
    expect(repeatedCandidateIds()).toEqual([]);
  });

  // The active-form vocabulary, in both directions. A form a vector
  // names and the vocabulary does not would be swept for by
  // nothing; a form the vocabulary names and no document carries
  // reads exactly like a form that was neutralized.
  it('draws every declared form from the vocabulary, and uses it all', () => {
    expect(unregisteredActiveForms()).toEqual([]);
    expect(activeFormsNoVectorCarries()).toEqual([]);
  });

  // The predicate below is this file's own, and the fixtures'
  // vocabulary is not. Nothing else holds the two together: a
  // predicate that had stopped emitting one of the six ids would
  // report every document clean of that form, and every claim in
  // this file would still pass.
  it('reads for exactly the forms the fixtures declare', () => {
    expect(sorted(PREDICATE_FORM_IDS))
      .toEqual(sorted(INJECTION_ACTIVE_FORM_IDS));
  });

  // The same agreement, driven rather than declared. What the
  // predicate FINDS across the six documents must be the whole
  // vocabulary — which is the reading that says the two lists agree
  // about the actual texts and not merely about each other.
  it('finds every vocabulary member somewhere in the corpus', () => {
    const found = new Set<string>();

    for (const vector of INJECTION_VECTORS) {
      for (const form of activeFormsLeftIn(vector.text)) {
        found.add(form);
      }
    }

    expect(sorted([...found])).toEqual(sorted(INJECTION_ACTIVE_FORM_IDS));
  });
});

// ---------------------------------------------------------------------------
// Layer one: what a document is allowed to DO
// ---------------------------------------------------------------------------

describe('injection — the sanitizer, over every vector', () => {
  for (const vector of INJECTION_VECTORS) {
    // The claim and its control in one case, because neither is
    // worth anything alone. The answer must carry no active form;
    // the INPUT must carry exactly the forms the fixture declares,
    // which is simultaneously the proof that the predicate still
    // sees something and that the fixture's declaration is honest.
    it(`neutralizes every active form ${vector.id} carries`, () => {
      expect(activeFormsLeftIn(vector.text))
        .toEqual(sorted(vector.activeForms));
      expect(activeFormsLeftIn(sanitizeUntrusted(vector.text))).toEqual([]);
    });

    // Treated as data means the words come back. Each fragment sits
    // within one line of its document, so a failure here is about a
    // pass that ate prose rather than about a line break.
    it(`returns the injected words of ${vector.id} verbatim`, () => {
      const answer = sanitizeUntrusted(vector.text);
      const lost = vector.survives.filter(
        (fragment) => !answer.includes(fragment),
      );

      expect(lost).toEqual([]);
      expect(vector.survives.length).toBeGreaterThan(1);
    });
  }

  // The other half of "bounds behaviour, never content": a document
  // with nothing active in it comes back byte for byte. A widened
  // neutralizer corrupts prose nobody wrote as markup, which is a
  // quiet and total loss where an escaped character is a visible
  // one.
  it('answers with the document itself when nothing in it is active', () => {
    const inert = INJECTION_VECTORS.filter(
      (vector) => vector.activeForms.length === 0,
    );
    const changed = inert
      .filter((vector) => sanitizeUntrusted(vector.text) !== vector.text)
      .map((vector) => vector.id);

    expect(changed).toEqual([]);
    expect(inert.map((vector) => vector.id))
      .toEqual(['instruction-override', 'zero-width']);
  });

  // The non-vacuity guard over the case above. A corpus that had
  // drifted into inert prose satisfies it having neutralized
  // nothing, so the corpus is held to carrying both readings —
  // documents this pass changes and documents it leaves alone.
  it('is driven over documents it both changes and leaves alone', () => {
    const changed = INJECTION_VECTORS.map(
      (vector) => sanitizeUntrusted(vector.text) !== vector.text,
    );

    expect(changed).toContain(true);
    expect(changed).toContain(false);
    expect(changed.filter(Boolean).length).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Layer two: what a name taken out of a document is allowed to REACH
// ---------------------------------------------------------------------------

/**
 * The reasons this corpus reaches, and the one it does not.
 *
 * `empty` is unreachable from a vector by construction: every
 * candidate is a name a model could plausibly have answered with
 * after reading a document that named something, and a run where
 * the extractor answered nothing is a state no document produces.
 * Declaring the gap rather than leaving it turns "this corpus has a
 * hole" into a claim that fails the day the hole closes — and the
 * reason is covered in `tests/lib/validate-entity-name.test.ts`,
 * which drives the gate directly rather than through a document.
 */
const REASONS_THE_CORPUS_REACHES: readonly string[] = [
  'forbidden_syntax',
  'invalid_character',
  'non_answer',
  'too_long',
];

/** The one reason no vector in this corpus can produce. */
const REASONS_NO_VECTOR_REACHES: readonly string[] = ['empty'];

describe('injection — the entity-name gate, over every candidate', () => {
  for (const vector of INJECTION_VECTORS) {
    // One case per vector rather than per candidate, because the
    // candidates of one document are each other's controls: a
    // vector whose refusals all passed while its plain name was
    // refused too would mean the gate had stopped discriminating,
    // and that reading needs them in one assertion.
    //
    // `toStrictEqual` throughout: a refusal carries no name key at
    // all, and `toEqual` treats an absent key and an `undefined`
    // one as the same thing, so the shape claim would rot silently.
    it(`answers every candidate of ${vector.id} as the roster records`, () => {
      const answered = vector.candidates.map(
        (candidate) => validateEntityName(candidate.value),
      );
      const owed = vector.candidates.map((candidate) => candidate.expected);

      expect(answered).toStrictEqual(owed);
    });
  }

  // The coverage guard, in both directions and read off what the
  // gate ACTUALLY produced rather than off the fixtures' own
  // labels. A reason the roster names and nothing reaches fails
  // naming itself; a reason nothing names and something reaches
  // fails as unregistered.
  it('reaches every reason this corpus registers, and no other', () => {
    const produced = new Set<string>();

    for (const candidate of INJECTION_CANDIDATES) {
      const result = validateEntityName(candidate.value);

      if (!result.ok) {
        produced.add(result.reason);
      }
    }

    expect(sorted([...produced])).toEqual(sorted(REASONS_THE_CORPUS_REACHES));
    expect(sorted([...REASONS_THE_CORPUS_REACHES, ...REASONS_NO_VECTOR_REACHES]))
      .toEqual(sorted(ENTITY_NAME_REJECTIONS));
  });

  // The corpus must reach both endings or every claim above is
  // satisfied by a gate stuck on one of them. Eight names accepted
  // out of nineteen is the reading, and both counts are asserted:
  // a gate that refused everything and a gate that accepted
  // everything each satisfy exactly half of this file otherwise.
  it('is driven over names the gate both accepts and refuses', () => {
    const accepted = INJECTION_CANDIDATES.filter(
      (candidate) => validateEntityName(candidate.value).ok,
    );

    expect(INJECTION_CANDIDATES.length).toBe(19);
    expect(accepted.length).toBe(8);
  });

  // THE CLAIM, stated over the answers rather than the inputs. It
  // does not matter what a document was trying to do; what matters
  // is that nothing it carried reached the far side of the gate.
  // Every accepted name is inside the cap and carries none of the
  // request shapes, checked against a second spelling of the
  // denylist so the gate is not vouching for itself.
  it('accepts no name carrying a request shape, whatever it was in', () => {
    const widened: string[] = [];

    for (const candidate of INJECTION_CANDIDATES) {
      const result = validateEntityName(candidate.value);

      if (!result.ok) {
        continue;
      }

      if (REQUEST_SHAPE_RE.test(result.name)) {
        widened.push(`${candidate.id}: request shape`);
      }

      if (result.name.length > MAX_ENTITY_NAME_LENGTH) {
        widened.push(`${candidate.id}: past the cap`);
      }
    }

    expect(widened).toEqual([]);
  });

  // The boundary the cap allows, held against the exported
  // constant. A fixture that had drifted off the boundary is
  // silently no longer a boundary case and every assertion about it
  // still passes, which is the one failure a length claim written
  // as a literal cannot report.
  it('accepts a name sitting exactly on the cap', () => {
    const atCap = INJECTION_CANDIDATES.filter(
      (candidate) => candidate.value.length === MAX_ENTITY_NAME_LENGTH,
    );
    const accepted = atCap.filter(
      (candidate) => validateEntityName(candidate.value).ok,
    );

    expect(atCap.length).toBe(1);
    expect(accepted.length).toBe(1);
  });

  // A whole document is not a name, and the gate says so for the
  // cheapest possible reason: every one of these carries a line
  // break, which the denylist names. Worth pinning because the
  // tempting repair for a chatty extractor is to hand the gate more
  // of the document, and the answer to that is that it already
  // refuses all six.
  it('refuses every vector document offered where a name was asked', () => {
    const answers = INJECTION_VECTORS.map(
      (vector) => validateEntityName(vector.text),
    );

    expect(answers.filter((answer) => answer.ok)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The two layers together, and why their order is not a detail
// ---------------------------------------------------------------------------

describe('injection — the gate reads the raw extraction', () => {
  // The measurement behind the module's own ordering rule, and the
  // reason "sanitize everything first" is a widening rather than a
  // tidy-up. The sanitizer removes a raw tag because a rendered tag
  // is a capability; the gate refuses a value CARRYING one because
  // an extraction that came back wearing delimiters is not a name.
  // Compose them the wrong way round and the first erases exactly
  // the evidence the second refuses on.
  //
  // Exactly one candidate in the corpus flips, and naming it is the
  // whole assertion: a set rather than a count, so a second value
  // that started flipping fails here rather than moving a number
  // nobody reads.
  it('is widened by sanitizing a candidate before validating it', () => {
    const opened: string[] = [];
    const closed: string[] = [];

    for (const candidate of INJECTION_CANDIDATES) {
      const direct = validateEntityName(candidate.value).ok;
      const sanitizedFirst = validateEntityName(
        sanitizeUntrusted(candidate.value),
      ).ok;

      if (!direct && sanitizedFirst) {
        opened.push(candidate.id);
      }

      if (direct && !sanitizedFirst) {
        closed.push(candidate.id);
      }
    }

    expect(opened).toEqual(['fake-system-block-tag']);
    expect(closed).toEqual([]);
  });

  // The pipeline's own order, asserted as the answer it produces. A
  // document is sanitized for display and the name is gated as it
  // was extracted; nothing in the first step changes what the
  // second decides, because the second never sees the first's
  // output.
  it('answers the same for a candidate whatever was done to its body', () => {
    const throughLayers = INJECTION_VECTORS.flatMap((vector) => {
      sanitizeUntrusted(vector.text);

      return vector.candidates.map(
        (candidate) => validateEntityName(candidate.value),
      );
    });
    const direct = INJECTION_CANDIDATES.map(
      (candidate) => validateEntityName(candidate.value),
    );

    expect(throughLayers).toStrictEqual(direct);
  });
});

// ---------------------------------------------------------------------------
// The vector neither layer is aimed at
// ---------------------------------------------------------------------------

describe('injection — words cut by characters nobody can see', () => {
  // The padded document and the visible one differ by exactly the
  // splitter roster and by nothing else, which is what makes the
  // visible reading a READING rather than a second document
  // somebody typed. Asserted by reconstruction: strip the roster
  // out of the padded text and the visible text is what is left.
  it('differs from its visible reading by exactly the splitters', () => {
    const stripped = ZERO_WIDTH_SPLITTERS.reduce(
      (text, splitter) => text.split(splitter.char).join(''),
      ZERO_WIDTH_VECTOR.text,
    );
    const absent = ZERO_WIDTH_SPLITTERS
      .filter((splitter) => !ZERO_WIDTH_VECTOR.text.includes(splitter.char))
      .map((splitter) => splitter.id);

    expect(stripped).toBe(ZERO_WIDTH_VECTOR.visible);
    expect(ZERO_WIDTH_VECTOR.text).not.toBe(ZERO_WIDTH_VECTOR.visible);
    expect(absent).toEqual([]);
  });

  // Neither layer is aimed at this vector and both say so cleanly:
  // there is no active form to neutralize, so the sanitizer answers
  // with the document, and the gate refuses a padded name as an
  // invalid character rather than as anything cleverer. Whatever
  // strips invisible runs belongs upstream of both, which is a gap
  // this case records rather than a failure it reports.
  it('passes the sanitizer untouched and splits at the gate', () => {
    const split = validateEntityName(`Station${ZERO_WIDTH_SPLITTERS
      .map((splitter) => splitter.char)
      .join('')}Seven`);

    expect(sanitizeUntrusted(ZERO_WIDTH_VECTOR.text))
      .toBe(ZERO_WIDTH_VECTOR.text);
    expect(split).toStrictEqual({ ok: false, reason: 'invalid_character' });
    expect(validateEntityName('Station Seven'))
      .toStrictEqual({ ok: true, name: 'Station Seven' });
  });
});
