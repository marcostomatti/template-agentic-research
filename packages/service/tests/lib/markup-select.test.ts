/**
 * Cases for `src/lib/markup-select.ts`: every selector this grammar
 * refuses, then every document that is not the well-formed one, and
 * only then the four predicates working over markup somebody wrote
 * correctly.
 *
 * That order is the file's argument rather than its layout. A
 * matcher is asked to read markup a stranger generated under a
 * selector an operator typed, so the readings that decide whether
 * this module is worth having are the ones where a document is
 * broken or a selector asks for something that is not here. A suite
 * opening with `h2` over a tidy page would pass for a matcher with
 * no grammar at all, and for one that throws on the first document
 * missing a closing tag.
 *
 * ## The refusal roster carries its own near miss
 *
 * Every excluded feature is registered below with the closest
 * spelling this grammar DOES parse, and the roster is swept from
 * both ends: each selector must be refused, and each near miss must
 * parse AND match something in the shared document. Without the
 * second half the roster would pass for a `parseSelector` that had
 * started answering `null` for everything — which is exactly the
 * shape a matcher fails into, since a refusal here is an empty list
 * and an empty list is also what a selector matching nothing
 * answers.
 *
 * ## The two empty answers are told apart on purpose
 *
 * `markupSelect` answers `[]` for a selector it cannot parse and
 * `[]` for a selector that parses and matches nothing, and the
 * cases below pin WHICH by reading `parseSelector` beside it. A
 * case asserting only the empty list would be satisfied by a
 * matcher that had stopped parsing anything.
 *
 * ## The bounds are pinned as boundary pairs
 *
 * Each bound gets the largest input it accepts and the smallest it
 * refuses, so a case cannot pass for a bound that moved.
 *
 * No word in this file is a term, a field or a source any domain
 * would use. The markup is a bulletin about rainfall, which is the
 * shared corpus's subject and no domain's.
 */
import { describe, expect, it } from 'vitest';

import {
  MAX_FRAGMENTS,
  MAX_SELECTOR_LENGTH,
  MAX_SELECTOR_STEPS,
  markupSelect,
  parseSelector,
} from '../../src/lib/markup-select.js';
import { MARKUP_FIXTURES, fixtureById } from '../parity/fixtures.js';

// ---------------------------------------------------------------------------
// The document every predicate is driven over
// ---------------------------------------------------------------------------

/**
 * What the one article in {@link DOCUMENT} holds.
 *
 * Named so a case asserting the whole of a container's fragment can
 * write the expected value once, rather than repeating markup that
 * would then have to be kept in step with the document by hand.
 */
const ARTICLE_INNER = [
  '<h2 class="title" id="lead" data-role="headline">Coastal network</h2>',
  '<P CLASS="body wide">First line.<br>Second line.</P>',
  '<ul><li>alpha</li><li>bravo</li></ul>',
].join('\n');

/**
 * One well-formed document, carrying one of everything.
 *
 * The paragraph is spelled in capitals deliberately: an element
 * name and an attribute NAME are matched case-blind, and every
 * VALUE is matched exactly, so a document that only ever spells its
 * tags in lower case cannot tell those two rules apart.
 */
const DOCUMENT = [
  '<article class="card" data-kind="bulletin">',
  ARTICLE_INNER,
  '</article>',
].join('\n');

// ---------------------------------------------------------------------------
// Selectors this grammar refuses
// ---------------------------------------------------------------------------

/** One excluded feature, and the nearest thing that is not. */
interface RefusedSelector {
  /** Stable id a failure prints. */
  readonly id: string;

  /** What it asks for that this grammar does not have. */
  readonly describes: string;

  /** The selector, which must be refused. */
  readonly selector: string;

  /**
   * The closest supported spelling, which must parse and match.
   *
   * This is the control that makes the refusal beside it
   * discriminating: a `parseSelector` refusing everything would
   * pass every refusal case in this file and fail every one of
   * these.
   */
  readonly near: string;
}

/**
 * Every feature the grammar leaves out, one entry each.
 *
 * Declared here rather than read off the module, because the module
 * has no list of what it excludes — exclusion is what happens when
 * a character reaches a parser with no rule for it, so this roster
 * is the only written record that each of them was considered.
 */
const REFUSED: readonly RefusedSelector[] = [
  {
    id: 'child-combinator',
    describes: 'the child combinator',
    selector: 'article > h2',
    near: 'article h2',
  },
  {
    id: 'adjacent-combinator',
    describes: 'the adjacent sibling combinator',
    selector: 'h2 + p',
    near: 'article p',
  },
  {
    id: 'sibling-combinator',
    describes: 'the general sibling combinator',
    selector: 'h2 ~ p',
    near: 'article p',
  },
  {
    id: 'selector-list',
    describes: 'two selectors separated by a comma',
    selector: 'h2, p',
    near: 'h2',
  },
  {
    id: 'universal',
    describes: 'the universal selector',
    selector: '*',
    near: 'article',
  },
  {
    id: 'pseudo-class',
    describes: 'a pseudo-class',
    selector: 'li:first-child',
    near: 'li',
  },
  {
    id: 'pseudo-element',
    describes: 'a pseudo-element',
    selector: 'p::before',
    near: 'p',
  },
  {
    id: 'attribute-presence',
    describes: 'an attribute tested for presence with no value',
    selector: '[data-kind]',
    near: '[data-kind=bulletin]',
  },
  {
    id: 'attribute-prefix',
    describes: 'the prefix attribute operator',
    selector: '[data-kind^=bull]',
    near: '[data-kind=bulletin]',
  },
  {
    id: 'attribute-substring',
    describes: 'the substring attribute operator',
    selector: '[data-kind*=ullet]',
    near: '[data-kind=bulletin]',
  },
  {
    id: 'attribute-case-flag',
    describes: 'the case-insensitivity flag',
    selector: '[data-kind=bulletin i]',
    near: '[data-kind=bulletin]',
  },
  {
    id: 'attribute-unclosed-bracket',
    describes: 'a bracket nothing closes',
    selector: '[data-kind=bulletin',
    near: '[data-kind=bulletin]',
  },
  {
    id: 'attribute-unclosed-quote',
    describes: 'a quote nothing closes',
    selector: '[data-kind="bulletin]',
    near: '[data-kind="bulletin"]',
  },
  {
    id: 'namespace',
    describes: 'a namespaced element name',
    selector: 'svg|article',
    near: 'article',
  },
  {
    id: 'escaped-name',
    describes: 'an escape inside a class name',
    selector: '.card\\.wide',
    near: '.card',
  },
  {
    id: 'two-ids',
    describes: 'a step naming two ids, which nothing can satisfy',
    selector: '#lead#lead',
    near: '#lead',
  },
  {
    id: 'empty-predicate',
    describes: 'a predicate opener with no name after it',
    selector: '.',
    near: '.card',
  },
  {
    id: 'empty-selector',
    describes: 'nothing at all',
    selector: '',
    near: 'article',
  },
  {
    id: 'whitespace-selector',
    describes: 'whitespace and nothing else',
    selector: '   ',
    near: 'article',
  },
];

describe('parseSelector — the features this grammar leaves out', () => {
  it('registers each excluded feature once', () => {
    const ids = REFUSED.map((entry) => entry.id);

    expect(ids).toEqual(Array.from(new Set(ids)));
  });

  it('parses every near miss and matches it against the document', () => {
    const dead = REFUSED.filter((entry) => parseSelector(entry.near) === null
      || markupSelect(DOCUMENT, entry.near).length === 0);

    expect(dead.map((entry) => entry.id)).toEqual([]);
  });

  for (const entry of REFUSED) {
    it(`refuses ${entry.describes}`, () => {
      expect(parseSelector(entry.selector)).toBeNull();
      expect(markupSelect(DOCUMENT, entry.selector)).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------
// Markup nobody closed
// ---------------------------------------------------------------------------

describe('markupSelect — documents that are not well formed', () => {
  it('runs an unclosed element to the end of the input', () => {
    const markup = '<div><span>a span nothing closes';

    expect(markupSelect(markup, 'span')).toEqual([
      'a span nothing closes',
    ]);
  });

  it('keeps the tags inside an unclosed match, verbatim', () => {
    const markup = '<div><span>a span nothing closes';

    expect(markupSelect(markup, 'div')).toEqual([
      '<span>a span nothing closes',
    ]);
  });

  it('ends an unclosed element where its ancestor closes', () => {
    const markup = '<div><span>x</div>y';

    expect(markupSelect(markup, 'span')).toEqual(['x']);
    expect(markupSelect(markup, 'div')).toEqual(['<span>x']);
  });

  it('ignores a close tag naming nothing that is open', () => {
    expect(markupSelect('<p>a</div>b</p>', 'p')).toEqual(['a</div>b']);
    expect(markupSelect('</p><p>x</p>', 'p')).toEqual(['x']);
  });

  it('reads a bracket that opens no element as prose', () => {
    const markup = '<p>a &lt; b, and a < b, and <3</p>';

    expect(markupSelect(markup, 'p')).toEqual([
      'a &lt; b, and a < b, and <3',
    ]);
  });

  it('steps over a comment carrying a bracket of its own', () => {
    const markup = '<!-- a comment carrying a > inside it --><p>x</p>';

    expect(markupSelect(markup, 'p')).toEqual(['x']);
  });

  it('steps over a doctype', () => {
    expect(markupSelect('<!DOCTYPE html><p>x</p>', 'p')).toEqual(['x']);
  });

  it('does not let a quoted attribute value end its tag', () => {
    const markup = '<img alt="a quoted > inside an attribute">after';

    expect(markupSelect(markup, 'img')).toEqual(['']);
    expect(markupSelect(markup, '[alt="a quoted > inside an attribute"]'))
      .toEqual(['']);
  });

  it('closes a void element rather than opening a scope', () => {
    const markup = '<p>one<br>two</p>';

    expect(markupSelect(markup, 'br')).toEqual(['']);
    expect(markupSelect(markup, 'p')).toEqual(['one<br>two']);
  });

  it('reads a raw-text element whole, brackets and all', () => {
    const markup = '<script>if (a<b) { go(); }</script><p>after</p>';

    expect(markupSelect(markup, 'script')).toEqual(['if (a<b) { go(); }']);
    expect(markupSelect(markup, 'p')).toEqual(['after']);
  });

  it('opens no element for a bracket inside a raw-text element', () => {
    const markup = '<script>if (a<b) { go(); }</script><p>after</p>';

    expect(markupSelect(markup, 'b')).toEqual([]);
    expect(markupSelect(markup, 'b p')).toEqual([]);
  });

  it('answers nothing for markup holding nothing', () => {
    expect(markupSelect('', 'p')).toEqual([]);
    expect(markupSelect('plain prose, no markup at all', 'p')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Elements nested inside their own kind
// ---------------------------------------------------------------------------

/** One container inside another of the same name. */
const NESTED = '<div class="a"><div class="b">inner</div></div>';

/** A list inside a list item, which is the shape a menu has. */
const NESTED_LIST = '<ul><li>alpha<ul><li>bravo</li></ul></li></ul>';

describe('markupSelect — an element nested inside its own kind', () => {
  it('matches both, outermost first', () => {
    expect(markupSelect(NESTED, 'div')).toEqual([
      '<div class="b">inner</div>',
      'inner',
    ]);
  });

  it('closes the nearest open element of that name', () => {
    expect(markupSelect(NESTED_LIST, 'li')).toEqual([
      'alpha<ul><li>bravo</li></ul>',
      'bravo',
    ]);
  });

  it('matches only the inner one for a two-step selector', () => {
    expect(markupSelect(NESTED, 'div div')).toEqual(['inner']);
    expect(markupSelect(NESTED, '.a .b')).toEqual(['inner']);
    expect(markupSelect(NESTED_LIST, 'li li')).toEqual(['bravo']);
  });

  it('reads the steps in order rather than as a set', () => {
    expect(markupSelect(NESTED, '.b .a')).toEqual([]);
  });

  it('crosses any number of elements between two steps', () => {
    const markup = '<article><section><p><span class="t">x</span></p>'
      + '</section></article>';

    expect(markupSelect(markup, 'article .t')).toEqual(['x']);
    expect(markupSelect(markup, 'article p .t')).toEqual(['x']);
  });
});

// ---------------------------------------------------------------------------
// A selector that parses and matches nothing
// ---------------------------------------------------------------------------

describe('markupSelect — the two answers that are both empty', () => {
  it('answers nothing for a selector no element satisfies', () => {
    expect(markupSelect(DOCUMENT, 'h3')).toEqual([]);
    expect(markupSelect(DOCUMENT, '.absent')).toEqual([]);
    expect(markupSelect(DOCUMENT, '[data-kind=other]')).toEqual([]);
    expect(markupSelect(DOCUMENT, 'li article')).toEqual([]);
  });

  it('parses every one of those selectors', () => {
    const missing = ['h3', '.absent', '[data-kind=other]', 'li article'];
    const unparsed = missing.filter((one) => parseSelector(one) === null);

    expect(unparsed).toEqual([]);
  });

  it('answers nothing for a selector it could not parse', () => {
    expect(markupSelect(DOCUMENT, 'article > h2')).toEqual([]);
    expect(parseSelector('article > h2')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The four predicates, and the one combination
// ---------------------------------------------------------------------------

describe('markupSelect — the predicates, over a document that is fine', () => {
  it('matches an element by name, either case, on either side', () => {
    expect(markupSelect(DOCUMENT, 'h2')).toEqual(['Coastal network']);
    expect(markupSelect(DOCUMENT, 'H2')).toEqual(['Coastal network']);
    expect(markupSelect(DOCUMENT, 'p')).toEqual([
      'First line.<br>Second line.',
    ]);
  });

  it('matches an element by id', () => {
    expect(markupSelect(DOCUMENT, '#lead')).toEqual(['Coastal network']);
    expect(markupSelect(DOCUMENT, 'h2#lead')).toEqual(['Coastal network']);
  });

  it('matches one class out of several, in any order', () => {
    expect(markupSelect(DOCUMENT, '.body')).toEqual([
      'First line.<br>Second line.',
    ]);
    expect(markupSelect(DOCUMENT, '.body.wide')).toEqual([
      'First line.<br>Second line.',
    ]);
    expect(markupSelect(DOCUMENT, '.wide.body')).toEqual([
      'First line.<br>Second line.',
    ]);
  });

  it('needs every class the step names', () => {
    expect(markupSelect(DOCUMENT, '.body.narrow')).toEqual([]);
  });

  it('matches an attribute value exactly, and its name case-blind', () => {
    expect(markupSelect(DOCUMENT, '[data-role=headline]')).toEqual([
      'Coastal network',
    ]);
    expect(markupSelect(DOCUMENT, '[DATA-ROLE=headline]')).toEqual([
      'Coastal network',
    ]);
    expect(markupSelect(DOCUMENT, '[data-role=Headline]')).toEqual([]);
  });

  it('matches a class value exactly, where the name was case-blind', () => {
    expect(markupSelect(DOCUMENT, '.BODY')).toEqual([]);
  });

  it('answers a container its whole content, tags and all', () => {
    expect(markupSelect(DOCUMENT, '[data-kind=bulletin]')).toEqual([
      `\n${ARTICLE_INNER}\n`,
    ]);
  });

  it('reads a quoted value carrying whitespace as one predicate', () => {
    const markup = '<p data-note="two words">held</p>';

    expect(markupSelect(markup, '[data-note="two words"]')).toEqual(['held']);
    expect(markupSelect(markup, '[data-note=\'two words\']'))
      .toEqual(['held']);
  });

  it('combines two steps as a descendant, at any depth', () => {
    expect(markupSelect(DOCUMENT, 'article h2')).toEqual(['Coastal network']);
    expect(markupSelect(DOCUMENT, 'article li')).toEqual(['alpha', 'bravo']);
    expect(markupSelect(DOCUMENT, '.card ul li')).toEqual(['alpha', 'bravo']);
  });

  it('answers an element holding nothing as the empty string', () => {
    expect(markupSelect('<p></p>', 'p')).toEqual(['']);
    expect(markupSelect('<p/>text', 'p')).toEqual(['']);
  });
});

// ---------------------------------------------------------------------------
// An attribute name is a key, and a key is a trap
// ---------------------------------------------------------------------------

describe('markupSelect — the names a plain object would answer for', () => {
  it('is a write a plain object silently loses', () => {
    const key = '__proto__';
    const throughSetter: Record<string, string> = {};

    throughSetter[key] = 'carried';

    expect(Object.hasOwn(throughSetter, key)).toBe(false);
    expect(Object.hasOwn({ ['__proto__']: 'carried' }, key)).toBe(true);
  });

  it('keeps an attribute spelled the way that write is lost', () => {
    const markup = '<p __proto__="carried">by attribute</p>';

    expect(markupSelect(markup, '[__proto__=carried]')).toEqual([
      'by attribute',
    ]);
  });

  it('matches nothing on a name only a prototype carries', () => {
    expect('toString' in {}).toBe(true);
    expect(markupSelect('<p>plain</p>', '[tostring=x]')).toEqual([]);
    expect(markupSelect('<p>plain</p>', '#constructor')).toEqual([]);
    expect(markupSelect('<p>plain</p>', '.constructor')).toEqual([]);
  });

  it('matches a document that really carries one of those names', () => {
    expect(markupSelect('<p id="__proto__">by id</p>', '#__proto__'))
      .toEqual(['by id']);
    expect(markupSelect('<p class="constructor">by class</p>', '.constructor'))
      .toEqual(['by class']);
  });
});

// ---------------------------------------------------------------------------
// Nothing is decoded, and nothing is invented
// ---------------------------------------------------------------------------

/**
 * Selectors the shared corpus is swept with.
 *
 * Chosen to reach something in four of the fixtures and nothing in
 * the rest, which is what {@link SWEPT_WITH_FRAGMENTS} then pins:
 * a sweep that answered nothing anywhere would satisfy every
 * substring assertion below without reading a document at all.
 */
const SWEEP_SELECTORS: readonly string[] = [
  'p',
  'div p',
  '.bulletin',
  '#absent',
  '[alt=x]',
  'ul li',
  'script',
  'img',
  'div',
];

/**
 * The corpus entries {@link SWEEP_SELECTORS} reaches something in.
 *
 * Declared rather than counted, and held set-equal: a fixture added
 * to the shared corpus later fails HERE, and the failure asks
 * whether the new entry is markup this matcher should be reading
 * rather than going undriven beside the others.
 */
const SWEPT_WITH_FRAGMENTS: readonly string[] = [
  'markup-entities',
  'markup-block-structure',
  'markup-script-and-style',
  'markup-malformed',
];

describe('markupSelect — over the shared corpus', () => {
  it('answers the entities exactly as the document wrote them', () => {
    const fixture = fixtureById(MARKUP_FIXTURES, 'markup-entities');

    expect(markupSelect(fixture.text, 'p')).toEqual([
      'Rainfall &amp; wind: 5 &lt; 9 &gt; 3',
      '&#65;lpha and &#x42;ravo',
      '&nbsp;padded&nbsp;',
      '&#8203;a decimal entity for an invisible character',
      '&notanentity; and &amp unterminated',
    ]);
  });

  it('matches an attribute as written and not as it reads', () => {
    const markup = '<p title="a&amp;b">R &amp; W</p>';

    expect(markupSelect(markup, '[title="a&amp;b"]')).toEqual(['R &amp; W']);
    expect(markupSelect(markup, '[title="a&b"]')).toEqual([]);
  });

  it('reads every fixture under every selector without raising', () => {
    const raised: string[] = [];

    for (const fixture of MARKUP_FIXTURES) {
      for (const selector of SWEEP_SELECTORS) {
        try {
          markupSelect(fixture.text, selector);
        } catch {
          raised.push(`${fixture.id} / ${selector}`);
        }
      }
    }

    expect(raised).toEqual([]);
  });

  it('answers only substrings of what it was given', () => {
    const invented: string[] = [];

    for (const fixture of MARKUP_FIXTURES) {
      for (const selector of SWEEP_SELECTORS) {
        for (const fragment of markupSelect(fixture.text, selector)) {
          if (!fixture.text.includes(fragment)) {
            invented.push(`${fixture.id} / ${selector}`);
          }
        }
      }
    }

    expect(invented).toEqual([]);
  });

  it('reaches something in exactly the fixtures that hold markup', () => {
    const reached = MARKUP_FIXTURES
      .filter((fixture) => SWEEP_SELECTORS
        .some((selector) => markupSelect(fixture.text, selector).length > 0))
      .map((fixture) => fixture.id);

    expect(reached).toEqual(SWEPT_WITH_FRAGMENTS);
  });
});

// ---------------------------------------------------------------------------
// The bounds, at the boundary
// ---------------------------------------------------------------------------

describe('the bounds, each read from both sides of itself', () => {
  it('accepts a selector of exactly the length bound', () => {
    const at = `.${'a'.repeat(MAX_SELECTOR_LENGTH - 1)}`;

    expect(at).toHaveLength(MAX_SELECTOR_LENGTH);
    expect(parseSelector(at)).not.toBeNull();
  });

  it('refuses one character past it', () => {
    const past = `.${'a'.repeat(MAX_SELECTOR_LENGTH)}`;

    expect(parseSelector(past)).toBeNull();
  });

  it('accepts exactly the step bound', () => {
    const at = Array.from({ length: MAX_SELECTOR_STEPS }, () => 'a').join(' ');

    expect(parseSelector(at)).toHaveLength(MAX_SELECTOR_STEPS);
  });

  it('refuses one step past it', () => {
    const past = Array.from(
      { length: MAX_SELECTOR_STEPS + 1 },
      () => 'a',
    ).join(' ');

    expect(parseSelector(past)).toBeNull();
  });

  it('answers at most the fragment cap, whatever the document holds', () => {
    const many = '<p>x</p>'.repeat(MAX_FRAGMENTS + 4);
    const fragments = markupSelect(many, 'p');

    expect(fragments).toHaveLength(MAX_FRAGMENTS);
    expect(fragments.every((fragment) => fragment === 'x')).toBe(true);
  });

  it('keeps the first of them in document order, not the last', () => {
    const depth = MAX_FRAGMENTS + 44;
    const nested = '<div>'.repeat(depth) + 'x' + '</div>'.repeat(depth);
    const fragments = markupSelect(nested, 'div');
    const inside = depth - MAX_FRAGMENTS;

    expect(fragments).toHaveLength(MAX_FRAGMENTS);
    expect(fragments[MAX_FRAGMENTS - 1]).toBe(
      '<div>'.repeat(inside) + 'x' + '</div>'.repeat(inside),
    );
  });
});
