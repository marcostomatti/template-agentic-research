import type { ProbeAuthCall } from '../data/auth';
import type { DevToolsFeature, DevToolsHost } from '@ar/dev-tools';
import type {
  FeedbackValues,
  ReportFormField,
  ReportFormRenderer,
} from '@ar/dev-tools/feedback';
import type { ReactElement } from 'react';

import {
  FEEDBACK_DEFAULT_MODULE,
  FEEDBACK_FEATURE_ID,
  FEEDBACK_ITEM_ID,
  FEEDBACK_MODULE_CONTEXT_KEY,
  feedbackFeature,
} from '@ar/dev-tools/feedback';
import { describe, expect, it } from 'vitest';

import { authMode, probeAuth } from '../data/auth';

import {
  DEVTOOLS_NO_SURFACE,
  devToolsBuildVersion,
  devToolsExtra,
  devToolsFeatures,
  probeDevToolsApiVersion,
  renderDevToolsReportForm,
} from './devtools';
import { ReportForm } from './ReportForm';

/** What a flat context record is allowed to carry. */
const PRIMITIVE_TYPES: readonly string[] = ['string', 'number', 'boolean'];

/** The smallest template a renderer can be handed. */
const FIELDS: readonly ReportFormField[] = [
  { id: 'title', kind: 'text', label: 'Title', required: true },
];

/** What the drawer is handed by the one item this app plugs in. */
interface DrawnDrawerProps {
  /** The app's renderer, or `undefined` where none was configured. */
  readonly renderForm?: ReportFormRenderer;

  /** The host the feature derived from the one it was passed. */
  readonly host: DevToolsHost;
}

/** What {@link renderDevToolsReportForm} builds its element with. */
interface DrawnFormProps {
  /** The fields the slot was handed. */
  readonly fields: readonly ReportFormField[];

  /** The answers the slot was handed. */
  readonly values: FeedbackValues;

  /** The edit callback the slot was handed. */
  readonly onChange: (next: FeedbackValues) => void;
}

/**
 * A host this file owns end to end.
 *
 * Built here rather than by the widget, so a feature reading
 * anything but what it was handed would have nowhere to read it
 * from. Its endpoint is a real one: the feature's own gate refuses a
 * blank, and that refusal is the package's case rather than this
 * file's.
 *
 * @returns The host the shell would hand a surface.
 */
function createHost(): DevToolsHost {
  return {
    version: { commit: 'c0ffee1', branch: 'main', round: 'r7', api: null },
    endpoint: '/__devtools',
    context: () => ({ route: '/digest' }),
    settings: { size: 'md', corner: 'bottom-right' },
    bus: {
      subscribe: () => () => {},
      publish: () => {},
      last: () => undefined,
      recent: () => [],
    },
    fetch: () => Promise.resolve(new Response(null, { status: 204 })),
  };
}

/**
 * What the drawer of a feature's one item would be handed.
 *
 * `render` CREATES an element and never invokes the component, so
 * this stays inside the node runner's reach — see `tests/README.md`
 * on the two-runner split.
 *
 * @param feature - The feature whose item is drawn.
 * @param host - The host the shell would pass to `render`.
 * @returns The props of the element `render` built.
 * @throws If the feature contributed anything but one drawer item,
 * which is a failure of the case that called this.
 */
function drawnDrawerProps(
  feature: DevToolsFeature,
  host: DevToolsHost,
): DrawnDrawerProps {
  const [item] = feature.items(host);

  if (item === undefined || item.mode !== 'drawer') {
    throw new Error('devtools-test: the feature drew no drawer item');
  }

  const element = item.render({ close: () => {}, host });

  return (element as ReactElement<DrawnDrawerProps>).props;
}

/**
 * What the app's renderer built, for the arguments the slot passes.
 *
 * @param values - Every answer so far.
 * @param onChange - What the slot would report an edit to.
 * @returns The props of the element the renderer answered.
 */
function drawnFormProps(
  values: FeedbackValues,
  onChange: (next: FeedbackValues) => void,
): DrawnFormProps {
  const element = renderDevToolsReportForm(FIELDS, values, onChange);

  return (element as ReactElement<DrawnFormProps>).props;
}

describe('devToolsExtra', () => {
  it('reports no surface for a path that names none', () => {
    const extra = devToolsExtra('/nowhere', 'fixture');

    expect(extra.surface).toBe(DEVTOOLS_NO_SURFACE);
  });

  it('reports no surface for the single-domain index path', () => {
    const extra = devToolsExtra('/', 'fixture');

    expect(extra.surface).toBe(DEVTOOLS_NO_SURFACE);
  });

  it('answers a record of primitives only, one level deep', () => {
    const extra = devToolsExtra('/d/ai/lexicon/new', 'api');
    const types = Object.values(extra).map((value) => typeof value);

    expect(types.length).toBeGreaterThan(0);
    expect(types.every((type) => PRIMITIVE_TYPES.includes(type))).toBe(true);
  });

  it('carries the path it was handed as the route', () => {
    const extra = devToolsExtra('/digest', 'fixture');

    expect(extra.route).toBe('/digest');
  });

  it('keeps a modal sub-route on the surface that owns it', () => {
    const extra = devToolsExtra('/lexicon/new', 'fixture');

    expect(extra.surface).toBe('lexicon');
  });

  it('reads the surface out of a domain-based path', () => {
    const extra = devToolsExtra('/d/ai/sources', 'fixture');

    expect(extra.surface).toBe('sources');
  });

  it('carries the data source it was handed', () => {
    expect(devToolsExtra('/digest', 'api').dataSource).toBe('api');
    expect(devToolsExtra('/digest', 'fixture').dataSource).toBe('fixture');
  });
});

describe('probeDevToolsApiVersion', () => {
  it('answers null for a probe that rejects, rather than rejecting', async () => {
    const rejecting: ProbeAuthCall = () => Promise.reject(new Error('offline'));

    await expect(probeDevToolsApiVersion(rejecting)).resolves.toBeNull();
  });

  it('answers null when there is no probe to call', async () => {
    await expect(probeDevToolsApiVersion(undefined)).resolves.toBeNull();
  });

  it('answers null for the probe a fixture build actually holds', async () => {
    // The control: this runner has no VITE_AR_API_URL, so the selector
    // above must BE the fixture one. Without it a wired probe that
    // merely failed would read the same as no probe at all.
    expect(authMode).toBe('fixture');
    expect(probeAuth).toBeUndefined();

    await expect(probeDevToolsApiVersion(probeAuth)).resolves.toBeNull();
  });

  it('answers what a reachable service said about its auth', async () => {
    const open: ProbeAuthCall = () => Promise.resolve('open');

    await expect(probeDevToolsApiVersion(open)).resolves.toBe('open');
  });
});

describe('devToolsBuildVersion', () => {
  it('leaves every member undefined where define did not reach', () => {
    // The unit runner is a build the plugin never transformed, which is
    // the shape a production build has too: the three identifiers are
    // not declared at all, so a read that was not a `typeof` guard
    // would throw here rather than answer.
    expect(devToolsBuildVersion()).toEqual({
      commit: undefined,
      branch: undefined,
      round: undefined,
    });
  });
});

describe('devToolsFeatures', () => {
  it('plugs in one feature, and it is the feedback feature', () => {
    // Act
    const features = devToolsFeatures();

    // Assert
    expect(features).toHaveLength(1);
    expect(features[0]?.id).toBe(FEEDBACK_FEATURE_ID);
  });

  it('contributes the one report row to the menu', () => {
    // Arrange
    const [feature] = devToolsFeatures();

    // Act
    const items = feature?.items(createHost()) ?? [];

    // Assert
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe(FEEDBACK_ITEM_ID);
  });

  it('hands the drawer the form renderer this app owns', () => {
    // Arrange
    const [feature] = devToolsFeatures();

    if (feature === undefined) {
      throw new Error('devtools-test: no feature was configured');
    }

    // Act
    const props = drawnDrawerProps(feature, createHost());

    // Assert
    expect(props.renderForm).toBe(renderDevToolsReportForm);

    // Control: the slot reads `undefined` on a feature nobody
    // configured one on, so the identity above is this app's wiring
    // rather than a member that is always filled.
    expect(
      drawnDrawerProps(feedbackFeature(), createHost()).renderForm,
    ).toBeUndefined();
  });

  it('leaves the filing module at the package default', () => {
    // Arrange: this app passes no `module` option, so `web` reaching
    // the report is the package's default rather than a second
    // spelling of it here.
    const [feature] = devToolsFeatures();

    if (feature === undefined) {
      throw new Error('devtools-test: no feature was configured');
    }

    // Act
    const context = drawnDrawerProps(feature, createHost()).host.context();

    // Assert
    expect(context[FEEDBACK_MODULE_CONTEXT_KEY]).toBe(FEEDBACK_DEFAULT_MODULE);
  });

  it('builds a fresh feature per call', () => {
    // Arrange: the feature memoises the host it derives for the
    // drawer, so one list per mount is the shape `startDevTools`
    // relies on — a shared instance would outlive the widget it was
    // built for.
    const first = devToolsFeatures();

    // Act
    const second = devToolsFeatures();

    // Assert
    expect(second[0]).not.toBe(first[0]);
    expect(second[0]?.id).toBe(first[0]?.id);
  });
});

describe('renderDevToolsReportForm', () => {
  it('draws the report form component this app owns', () => {
    // Act
    const element = renderDevToolsReportForm(FIELDS, {}, () => {});

    // Assert
    expect((element as ReactElement).type).toBe(ReportForm);
  });

  it('passes the three slot arguments on untouched', () => {
    // Arrange: identity, not equality — a renderer that copied the
    // record or wrapped the callback would answer an equal value and
    // a different reference.
    const values: FeedbackValues = { title: 'The digest is blank' };
    const onChange = (): void => {};

    // Act
    const props = drawnFormProps(values, onChange);

    // Assert
    expect(props.fields).toBe(FIELDS);
    expect(props.values).toBe(values);
    expect(props.onChange).toBe(onChange);
  });

  it('builds the element without drawing it', () => {
    // Arrange: the control is the runner itself. This project is
    // node-only, so a renderer that RENDERED its component would
    // reach a document that is not there.
    expect(typeof document).toBe('undefined');

    // Act
    const element = renderDevToolsReportForm(FIELDS, {}, () => {});

    // Assert
    expect(element).not.toBeNull();
  });
});
