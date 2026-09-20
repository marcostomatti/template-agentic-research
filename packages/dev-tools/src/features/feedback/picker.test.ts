import { afterEach, describe, expect, it } from 'vitest';

import { DEVTOOLS_ROOT_ATTRIBUTE } from '../../core/mount';

import { FEEDBACK_CONTEXT_ELLIPSIS } from './context';
import {
  climb,
  describeElement,
  FEEDBACK_ATTRIBUTE_VALUE_LIMIT,
  FEEDBACK_ELEMENT_TEXT_LIMIT,
  isPickable,
  matchesOf,
} from './picker';

/**
 * ## Why the elements are real and only the box is not
 *
 * jsdom gives this module almost everything it needs: `closest`,
 * `querySelectorAll` and its `SyntaxError` for a selector it cannot
 * parse (measured — a malformed selector and the empty string both
 * throw one), `CSS.escape`, and a class list that keeps a name's
 * case. So the cases below build real markup and read the real
 * answer, and `@medv/finder` runs for real over it. Nothing about
 * the selector-building is stubbed, because a stubbed finder would
 * prove this module's configuration reached a fake.
 *
 * The one thing jsdom cannot do is lay anything out:
 * `getBoundingClientRect` answers four zeros for every element, so
 * the box case installs its own through {@link stubRect}. That is
 * also why the box is the only thing a case stubs — four zeros would
 * pin jsdom's furniture rather than this module's rounding.
 *
 * ## Why the body is emptied after every case
 *
 * The finder decides uniqueness by asking the WHOLE document, and so
 * does {@link matchesOf}. A case's leftover markup would therefore
 * change the answer of the next case rather than just sit there:
 * a `.card-title` left behind makes the next case's `.card-title`
 * ambiguous and pushes it onto a different selector. jsdom builds one
 * document per FILE, so the `afterEach` below is what keeps the cases
 * independent.
 *
 * ## Refusals first, each one next to a control
 *
 * The refusals are the first block, as every test file in this
 * package orders them. A refusal asserted on its own is a weak
 * reading here — "the selector does not contain `.flex`" is also true
 * of a selector that is `null`, of a tag, and of a module that
 * refuses every class there is. So each refusal case names the twin
 * that IS accepted in the same breath: the Tailwind case asserts the
 * semantic class beside it survived, the hashed-id case re-reads the
 * same element once its id is word-like, and the widget cases assert
 * the app's own element of the same shape is described normally.
 */

/** A rectangle a case wants an element to report. */
interface StubbedBox {
  /** Distance from the viewport's left edge. */
  readonly x: number;

  /** Distance from the viewport's top edge. */
  readonly y: number;

  /** The box's width. */
  readonly width: number;

  /** The box's height. */
  readonly height: number;
}

/**
 * Put one markup string in the document.
 *
 * @param markup - What the case wants the page to be.
 */
function render(markup: string): void {
  document.body.innerHTML = markup;
}

/**
 * Wrap markup in the widget's own root.
 *
 * The attribute is imported rather than spelt here: the rule under
 * test is "the widget is invisible to the picker", not "the widget's
 * marker is spelt `data-devtools-root`", and `mount.test.ts` already
 * owns the spelling.
 *
 * @param inner - What sits inside the widget.
 * @returns The markup for a mounted widget root.
 */
function widget(inner: string): string {
  return `<div ${DEVTOOLS_ROOT_ATTRIBUTE}>${inner}</div>`;
}

/**
 * The first element matching, or a loud failure.
 *
 * @param selector - What the case is reaching for.
 * @returns That element.
 */
function at(selector: string): Element {
  const element = document.querySelector(selector);

  if (element === null) {
    throw new Error(`this case's own markup has no ${selector}`);
  }

  return element;
}

/**
 * The selector the picker answers for an element it must describe.
 *
 * @param element - The element being described.
 * @returns Its selector; throws when the picker refused it, so a
 * case written about an accepted element cannot quietly assert
 * things about `null`.
 */
function selectorOf(element: Element): string {
  const description = describeElement(element);

  if (description === null) {
    throw new Error('the picker refused an element this case describes');
  }

  return description.selector;
}

/**
 * Make one element report a box of the case's choosing.
 *
 * @param element - The element being described.
 * @param box - What it should answer.
 */
function stubRect(element: Element, box: StubbedBox): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => box as unknown as DOMRect,
  });
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('what the element picker refuses', () => {
  it('answers a selector the browser cannot parse as invalid', () => {
    render('<p class="note-body">a note</p>');

    const refused = matchesOf('p:::');

    expect(refused.valid).toBe(false);
    expect(refused.elements).toEqual([]);

    // The control: the same document, a selector the browser accepts.
    expect(matchesOf('p').valid).toBe(true);
    expect(matchesOf('p').elements).toEqual([at('p')]);
  });

  it('answers the empty selector as invalid', () => {
    render('<p class="note-body">a note</p>');

    expect(matchesOf('')).toEqual({ valid: false, elements: [] });
    expect(matchesOf('   ')).toEqual({ valid: false, elements: [] });
  });

  it('answers a selector that matches nothing as valid and empty', () => {
    render('<p class="note-body">a note</p>');

    const missing = matchesOf('.absent-body');

    expect(missing.valid).toBe(true);
    expect(missing.elements).toEqual([]);

    // The control: the same shape of selector over a class that is
    // there, so "valid and empty" is a reading and not a constant.
    expect(matchesOf('.note-body').elements).toEqual([at('.note-body')]);
  });

  it('counts none of the widget own elements among the matches', () => {
    render(`${widget('<button class="devtools-trigger">tomato</button>')}`
      + '<button class="app-action">Save</button>');

    const buttons = matchesOf('button');

    expect(buttons.valid).toBe(true);
    expect(buttons.elements).toEqual([at('.app-action')]);
    expect(document.querySelectorAll('button')).toHaveLength(2);
  });

  it('answers nothing at all for a selector naming only the widget', () => {
    render(`${widget('<button class="devtools-trigger">tomato</button>')}`
      + '<button class="app-action">Save</button>');

    expect(matchesOf('.devtools-trigger'))
      .toEqual({ valid: true, elements: [] });
    expect(matchesOf('.app-action').elements).toHaveLength(1);
  });

  it('refuses to describe an element inside the widget own root', () => {
    render(`${widget('<button class="app-action">tomato</button>')}`
      + '<button class="app-action">Save</button>');

    const [inside, outside] = document.querySelectorAll('.app-action');

    expect(isPickable(inside as Element)).toBe(false);
    expect(describeElement(inside as Element)).toBeNull();

    // The control: the same tag and the same class, one level out.
    expect(describeElement(outside as Element)).not.toBeNull();
  });

  it('refuses to describe the widget root element itself', () => {
    render(`${widget('<span>tomato</span>')}<main id="app-main">hi</main>`);

    expect(describeElement(at(`[${DEVTOOLS_ROOT_ATTRIBUTE}]`))).toBeNull();
    expect(describeElement(at('#app-main'))).not.toBeNull();
  });

  it('refuses to describe the document element', () => {
    render('<main id="app-main">hi</main>');

    expect(isPickable(document.documentElement)).toBe(false);
    expect(describeElement(document.documentElement)).toBeNull();

    // The control: the body, one step below it, is describable.
    expect(selectorOf(document.body)).toBe('body');
  });

  it('refuses to describe an element no selector can reach', () => {
    render('<main id="app-main">hi</main>');

    const detached = document.createElement('div');

    detached.className = 'panel-body';

    expect(describeElement(detached)).toBeNull();

    // The control: the same element, once the document holds it.
    at('#app-main').append(detached);
    expect(selectorOf(detached)).toBe('.panel-body');
  });

  it('refuses a preferred attribute that names a different element', () => {
    render('<ul><li data-testid="app-row" class="row-item">a</li></ul>');

    const stranger = document.createElement('li');

    stranger.setAttribute('data-testid', 'app-row');

    // The testid matches exactly one element — just not this one.
    expect(matchesOf('[data-testid="app-row"]').elements)
      .toEqual([at('.row-item')]);
    expect(describeElement(stranger)).toBeNull();
  });

  it('leaves Tailwind utility classes out of the selector it builds', () => {
    render('<main class="flex items-center overflow-hidden site-main">'
      + '<p>hi</p></main>');

    const selector = selectorOf(at('main'));

    expect(selector).toBe('.site-main');
    expect(selector).not.toContain('flex');
    expect(selector).not.toContain('items-center');
    expect(selector).not.toContain('overflow-hidden');
  });

  it('leaves hashed class names out of the selector it builds', () => {
    render('<span class="Button_root__1a2b3 sc-bdVaJa css-1q2w3e card-title">'
      + 'hi</span>');

    const selector = selectorOf(at('span'));

    expect(selector).toBe('.card-title');
    expect(selector).not.toContain('Button_root');
    expect(selector).not.toContain('sc-bdVaJa');
    expect(selector).not.toContain('css-1q2w3e');
  });

  it('leaves a framework-generated id out of the selector it builds', () => {
    render('<div id="R1a2b3" class="panel-body">hi</div>');

    expect(selectorOf(at('.panel-body'))).toBe('.panel-body');

    // The control: the same element, named by a word-like id.
    at('.panel-body').setAttribute('id', 'report-panel');
    expect(selectorOf(at('.panel-body'))).toBe('#report-panel');
  });

  it('leaves an attribute value longer than the cap out of it', () => {
    const tooLong = 'a'.repeat(FEEDBACK_ATTRIBUTE_VALUE_LIMIT + 1);

    render(`<i aria-label="${tooLong}" class="panel-body"></i>`);

    expect(selectorOf(at('i'))).toBe('.panel-body');

    // The control: the same attribute, one character shorter.
    at('i').setAttribute('aria-label', 'a'.repeat(
      FEEDBACK_ATTRIBUTE_VALUE_LIMIT,
    ));
    expect(selectorOf(at('i'))).toContain('[aria-label=');
  });

  it('names no attribute outside the four it prefers', () => {
    render('<section id="alpha-panel">'
      + '<a role="link" href="/alpha" name="alpha" data-track="go">A</a>'
      + '</section><section id="beta-panel">'
      + '<a role="link" href="/beta" name="beta" data-track="go">B</a>'
      + '</section>');

    const selector = selectorOf(at('#beta-panel a'));

    // The role survives — the control that an attribute can be used
    // at all — and the three the finder's own defaults would have
    // taken do not.
    expect(selector).toContain('[role="link"]');
    expect(selector).not.toContain('href');
    expect(selector).not.toContain('name=');
    expect(selector).not.toContain('data-track');
  });

  it('refuses to climb above the body', () => {
    render('<main id="app-main"><p>hi</p></main>');

    expect(climb(document.body)).toBeNull();

    // The control: one step lower, the climb answers the body.
    expect(climb(at('#app-main'))).toBe(document.body);
  });

  it('refuses to climb from an element with no parent', () => {
    render('<main id="app-main">hi</main>');

    expect(climb(document.createElement('div'))).toBeNull();
    expect(climb(document.documentElement)).toBeNull();
  });

  it('refuses to climb out of the app and into the widget', () => {
    render(widget('<span class="devtools-label">tomato</span>'));

    expect(climb(at('.devtools-label'))).toBeNull();
  });
});

describe('what the element picker answers', () => {
  it('prefers data-testid over the id, the role and the label', () => {
    render('<section data-testid="report-panel" id="report-section"'
      + ' role="region" aria-label="Report panel">hi</section>');

    expect(selectorOf(at('section'))).toBe('[data-testid="report-panel"]');
  });

  it('prefers the id when there is no data-testid', () => {
    render('<button id="save-button" role="button"'
      + ' aria-label="Save the report">Save</button>');

    expect(selectorOf(at('button'))).toBe('#save-button');
  });

  it('prefers the role when there is neither a testid nor an id', () => {
    render('<span role="status" aria-label="Filed">ok</span>');

    expect(selectorOf(at('span'))).toBe('[role="status"]');
  });

  it('uses the label when it is the only preferred attribute', () => {
    render('<i aria-label="Close the dialog"></i>');

    expect(selectorOf(at('i'))).toBe('[aria-label="Close the dialog"]');
  });

  it('quotes an attribute value carrying a quotation mark', () => {
    render('<i aria-label=\'Close "the" dialog\'></i>');

    const selector = selectorOf(at('i'));

    expect(selector).toBe('[aria-label="Close \\"the\\" dialog"]');
    expect(matchesOf(selector).elements).toEqual([at('i')]);
  });

  it('falls through a preferred attribute naming more than one element', () => {
    render('<ul><li data-testid="row">a</li>'
      + '<li data-testid="row" id="second-row">b</li></ul>');

    expect(matchesOf('[data-testid="row"]').elements).toHaveLength(2);
    expect(selectorOf(at('#second-row'))).toBe('#second-row');
  });

  it('falls through every preferred attribute to a class worth keeping', () => {
    render('<article class="flex items-center card-title">hi</article>');

    expect(selectorOf(at('article'))).toBe('.card-title');
  });

  it('answers the tag name in lower case', () => {
    render('<main id="app-main"><svg id="app-chart"></svg></main>');

    expect(describeElement(at('#app-main'))?.tag).toBe('main');
    expect(describeElement(at('#app-chart'))?.tag).toBe('svg');
  });

  it('answers the text collapsed onto one line', () => {
    render('<p id="app-note">  Filed\n   the\treport  </p>');

    expect(describeElement(at('#app-note'))?.text).toBe('Filed the report');
  });

  it('caps a long text and marks where it was cut', () => {
    const long = 'x'.repeat(FEEDBACK_ELEMENT_TEXT_LIMIT + 40);

    render(`<p id="app-note">${long}</p>`);

    const text = describeElement(at('#app-note'))?.text ?? '';

    expect(text).toHaveLength(
      FEEDBACK_ELEMENT_TEXT_LIMIT + FEEDBACK_CONTEXT_ELLIPSIS.length,
    );
    expect(text.endsWith(FEEDBACK_CONTEXT_ELLIPSIS)).toBe(true);
  });

  it('answers an empty excerpt for an element carrying no text', () => {
    render('<input id="app-title" value="typed"><p id="app-note">   </p>');

    expect(describeElement(at('#app-title'))?.text).toBe('');
    expect(describeElement(at('#app-note'))?.text).toBe('');
  });

  it('answers the bounding box rounded to whole pixels', () => {
    render('<main id="app-main">hi</main>');

    stubRect(at('#app-main'), { x: 12.4, y: 33.6, width: 100.5, height: 40.4 });

    expect(describeElement(at('#app-main'))?.rect)
      .toEqual({ x: 12, y: 34, width: 101, height: 40 });
  });

  it('answers a selector that matches exactly the element described', () => {
    render('<main class="site-main"><ul><li data-testid="row">a</li>'
      + '<li data-testid="row" role="presentation">b</li></ul>'
      + '<button id="save-button">Save</button></main>');

    for (const element of document.querySelectorAll('main, li, button')) {
      expect(matchesOf(selectorOf(element)).elements).toEqual([element]);
    }
  });

  it('answers the matches in document order', () => {
    render('<ul><li class="row-item">a</li><li class="row-item">b</li>'
      + '<li class="row-item">c</li></ul>');

    const texts = matchesOf('.row-item')
      .elements.map((element) => element.textContent);

    expect(texts).toEqual(['a', 'b', 'c']);
  });

  it('climbs to the parent element', () => {
    render('<main id="app-main"><ul id="app-list"><li>a</li></ul></main>');

    expect(climb(at('li'))).toBe(at('#app-list'));
    expect(climb(at('#app-list'))).toBe(at('#app-main'));
  });

  it('describes what a climb arrived at', () => {
    render('<main id="app-main"><ul id="app-list"><li>a</li></ul></main>');

    const parent = climb(at('li'));

    expect(parent).not.toBeNull();
    expect(selectorOf(parent as Element)).toBe('#app-list');
  });

  it('reads the document afresh on every call', () => {
    render('<p id="app-note">before</p>');

    expect(describeElement(at('#app-note'))?.text).toBe('before');

    at('#app-note').textContent = 'after';

    expect(describeElement(at('#app-note'))?.text).toBe('after');
  });

  it('freezes everything it answers', () => {
    render('<p class="note-body">a note</p>');

    const description = describeElement(at('p'));
    const matches = matchesOf('p');

    expect(Object.isFrozen(description)).toBe(true);
    expect(Object.isFrozen(description?.rect)).toBe(true);
    expect(Object.isFrozen(matches)).toBe(true);
    expect(Object.isFrozen(matches.elements)).toBe(true);
  });
});
