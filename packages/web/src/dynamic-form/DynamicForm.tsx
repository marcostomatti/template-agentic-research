/**
 * @packageDocumentation
 * The two-column shell: the structure on the left, and the ONE form
 * for whatever is selected on the right.
 *
 * This is the shape the provider's recursion question was closed at.
 * A value nests, and a form that nested with it would mount a form
 * per level, each holding its own field state and each re-rendering
 * the ones beneath it. So the recursion lives in the TREE —
 * `./tree.ts` builds it and holds no field state at all — and
 * exactly one `./NodeForm.tsx` is mounted at a time, over the node
 * this file selected. `@ar/ui`'s `TreeNav` draws the left column and
 * its `Breadcrumb` names the trail above the right one; neither of
 * them knows what a `FieldDef` is, which is the whole point of the
 * projection `./tree.ts` hands them.
 *
 * ## Which props are the seam, and which are presentation
 *
 * `../components/JsonEditor.tsx` is the box this replaces, and its
 * header states the bargain in three props:
 * {@link DynamicFormProps.value}, {@link DynamicFormProps.onChange}
 * and {@link DynamicFormProps.schema}. All three arrive here
 * unchanged and mean exactly what they mean there — a payload, a
 * report of one the schema accepted, and what a payload has to
 * satisfy. That is what makes the swap a COMPONENT exchange at the
 * page rather than an edit to every editor composing one.
 *
 * {@link DynamicFormProps.defs} is the ONE addition, and it belongs
 * to the seam rather than to presentation for the same reason
 * `schema` is a prop rather than an inference: the page is what
 * knows the shape it is editing. It cannot be derived from the
 * schema here either — the labels an operator reads are not in a
 * zod type — so a page hands over both readings of one shape.
 *
 * {@link DynamicFormProps.label} is presentation, exactly as it is
 * next door: it names the left column's tree and nothing else. So is
 * everything this file draws — that the structure is a tree, that
 * the trail is a breadcrumb, that a refusal is a banner. A page that
 * never learned any of it cannot be broken by changing it. There is
 * no `readOnly` mode here: v1 has no caller for one, and an API with
 * no caller is kept alive by the next reader assuming one exists.
 *
 * ## One selection, and where the expansion lives
 *
 * The selected PATH is held in one `useState` here and nowhere else.
 * `./NodeForm.tsx` is handed a node and `./FieldControl.tsx` a path,
 * and neither remembers where it is — so there is no second reading
 * of "which node is open" to drift from this one, and the tree's
 * selected row, the breadcrumb's last step and the mounted form are
 * three drawings of one state.
 *
 * A path can stop naming a node, which is why the shown node is
 * {@link nodeAt} falling back to the root rather than an assertion:
 * `./nodePath.ts` records that an index segment is not stable across
 * a reorder. The breadcrumb is then built from the node that is
 * SHOWN rather than from the path that was asked for, so the two
 * cannot disagree about where an operator is.
 *
 * Which branches are OPEN is a second state and deliberately not
 * derived from the selection. Deriving it would make the twisty a
 * dead control and leave ArrowLeft on the selected row with nothing
 * to do, `TreeNav` routing both of those through `onToggle`. The
 * cost is that collapsing a branch can hide the selected row; that
 * is survivable because a row is not where an operator reads their
 * position — the breadcrumb and the mounted form are, and neither
 * moves. Selecting or drilling into a node OPENS it, because
 * arriving somewhere and not being shown what is under it is the one
 * shape that would read as a fault.
 *
 * ## Every edit is checked as a WHOLE candidate
 *
 * An edit reports a value and a path, never a patch. This file
 * applies it through `./values.ts`, hands the WHOLE result to
 * {@link DynamicFormProps.schema}, and reports through
 * {@link DynamicFormProps.onChange} only what came back accepted.
 * Same order the JSON box uses and for the same reason: a rule
 * spanning two members — a schema refusing an empty list, or one
 * entry read against another — has nowhere to be checked but over
 * the whole value. A per-field check would accept an edit the save
 * path then refuses, which is exactly the drift between two
 * presentations that one `describeSchemaIssues` exists to prevent.
 *
 * A write `./values.ts` REFUSED answers the value it was handed, by
 * identity, and that is a designed reading rather than a coincidence
 * — its header offers `next === value` as the whole check. So the
 * identity guard in {@link applied} is "was this edit applied at
 * all", and skipping the report is what keeps a path that has just
 * stopped existing from marking a draft dirty with a value nothing
 * changed.
 *
 * Two consequences are worth stating rather than discovering.
 * Clearing a box the schema requires is a REFUSAL naming that member
 * — `./readers.ts` answers `null` for an empty box, per the ruling
 * that `''` beside `null` would be two spellings of one state — so
 * the banner is the honest outcome there and not a gap. And a
 * refused edit leaves `value` where it was while the box keeps the
 * text that was typed, `./FieldControl.tsx` holding it beside the
 * reported value; that is what lets an operator read the sentence
 * and the member it is about at the same time.
 *
 * ## The refusal region is there before there is a refusal
 *
 * Rendered from mount rather than arriving with its first sentence:
 * assistive technology watches regions that already exist, and one
 * inserted at the same moment as its content is routinely missed.
 * Polite, because it changes while an operator is typing. The one
 * difference from the box next door is that nothing here points an
 * `aria-describedby` at it — a refusal names a member, and there is
 * no single control for it to describe.
 *
 * The sentences come from `../components/jsonDraft.ts` unchanged, so
 * the two presentations give ONE answer to one question and neither
 * can drift from the other's rules. The value is checked on ARRIVAL
 * too, for the reason the box next door checks it: a stored payload
 * this app cannot read is what somebody needs told before they touch
 * anything.
 *
 * ## No test in this package reaches this file
 *
 * A fact about the runner rather than an omission, and the one both
 * its neighbours record: `@ar/web` runs vitest over `src` in a NODE
 * environment with an include of `*.test.ts`, so a `.tsx` is neither
 * collected nor renderable there. Everything worth asserting sits in
 * the colocated cases over the six modules this one composes. What
 * is left here is composition, one lookup and three reports.
 *
 * `check-types` proves the bindings, from inside `packages/web`, at
 * EXIT 2, and the code follows the SITE rather than the shape of the
 * fault. Measured: a leaf def handed as {@link DynamicFormProps.defs}
 * is TS2322 at the prop, the shown node handed to `./NodeForm.tsx` as
 * a path is TS2739 at the prop, and {@link DynamicFormProps.onChange}
 * handed something the schema's type parameter does not admit is
 * TS2345 at the CALL. Typing a reorder index as a string answers
 * BOTH — TS2322 where the prop is declared and TS2345 where
 * {@link withListReordered} is called — which is the clearest
 * reading of that rule there is.
 *
 * Two offline probes measure the rest, neither needing a DOM. A
 * static render prints the real markup; standing in a hook
 * dispatcher makes this component callable as a plain function, so
 * the three reports are drivable and what {@link
 * DynamicFormProps.onChange} received is readable. 45 readings, of
 * which 13 mutation legs red 21 — the undefended remainder being
 * the ACCEPTING ones a guard-removal leg structurally cannot reach,
 * and the one leg that does reach them answering the refusal
 * unconditionally. Both DEAD legs name the same unreached state: a
 * form or a breadcrumb built from the ROOT rather than from the
 * selection agrees with itself while nothing has been selected yet,
 * which a mount and a single call both are. What none of it reaches
 * is the click, the drag and the keystroke, which are Playwright's.
 */

import type { LeafValue } from './FieldControl';
import type { ContainerFieldDef } from './fieldDef';
import type { NodePath } from './nodePath';
import type { FormNode } from './tree';
import type { ZodType } from 'zod';

import { Banner, Breadcrumb, TreeNav } from '@ar/ui';
import { useState } from 'react';

import { describeSchemaIssues } from '../components/jsonDraft';

import { NodeForm } from './NodeForm';
import { ROOT_PATH, pathKey } from './nodePath';
import {
  breadcrumbTo,
  buildFormTree,
  nodeAt,
  treeNavNodes,
} from './tree';
import { withListReordered, withValueAt } from './values';

/**
 * The key of the position every tree here is rooted at.
 *
 * Computed from `./nodePath.ts` rather than spelled, so the seed
 * below cannot drift from what {@link treeNavNodes} answers for the
 * same node — the two would then disagree about whether the top
 * level is open, which draws as a tree with no children at all.
 */
const ROOT_NODE_KEY = pathKey(ROOT_PATH);

/**
 * No refusal, as one shared value.
 *
 * Frozen and shared for the reason `ROOT_PATH` is: it is handed out
 * repeatedly, and its identity being stable is also what keeps a
 * clearing edit from re-rendering the banner's region with a second
 * empty list.
 */
const NO_REFUSAL: readonly string[] = Object.freeze([]);

/**
 * What the banner over a refused edit is titled.
 *
 * The same sentence `../components/JsonEditor.tsx` uses, retyped
 * rather than shared: the two presentations answering one question
 * the same way is the claim, and a constant imported across them
 * would make it true by construction instead of by agreement. The
 * CONSEQUENCE rather than the fault, because the sentences under it
 * already carry the fault.
 */
const REFUSED_TITLE = 'This cannot be saved';

/** The two columns, stacking under `sm` where 220px is most of it. */
const SHELL_LAYOUT = 'grid grid-cols-1 items-start gap-4 '
  + 'sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]';

/**
 * The left column's panel.
 *
 * Sunk, which `../components/JsonEditor.tsx` fixed the meaning of as
 * "not where you type" — a navigation column being the reuse that
 * reading was written for. `p-2` replaces `TreeNav`'s own `p-0`
 * through tailwind-merge rather than stacking on it.
 */
const TREE_PANEL = 'rounded-xl border border-border-soft '
  + 'bg-surface-sunk p-2';

/** The right column: the trail, then the one mounted form. */
const FORM_COLUMN = 'flex min-w-0 flex-col gap-3';

/**
 * The path a tree key names, or `null` if it names no node.
 *
 * The reverse of {@link pathKey}, which `TreeNav` and `Breadcrumb`
 * both need because they speak in keys: they are given a projection
 * carrying no paths, deliberately, so nothing drawing a tree learns
 * what a position IS. Sound as a walk rather than as a parse because
 * the spelling is injective, which `./nodePath.ts` states and its
 * cases measure.
 *
 * @param node - The node to search from; the root, at the call.
 * @param key - The key to resolve.
 * @returns The path, or `null` if no node under `node` spells `key`.
 * @throws If any node's path carries a segment kind `./nodePath.ts`
 * does not declare.
 */
function pathForKey(node: FormNode, key: string): NodePath | null {
  if (pathKey(node.path) === key) {
    return node.path;
  }

  for (const child of node.children) {
    const found = pathForKey(child, key);

    if (found !== null) {
      return found;
    }
  }

  return null;
}

/**
 * The open branches, with one more open.
 *
 * A new list or the one handed over, never a write into it: the
 * immutability every module in this directory obeys, and what lets
 * the already-open case skip a render rather than perform one.
 *
 * @param keys - The branches open now.
 * @param key - The branch to open.
 * @returns The open branches; `keys` itself if it was already open.
 */
function withBranchOpened(
  keys: readonly string[],
  key: string,
): readonly string[] {
  return keys.includes(key)
    ? keys
    : [...keys, key];
}

/**
 * The open branches, with one flipped.
 *
 * @param keys - The branches open now.
 * @param key - The branch whose twisty was asked.
 * @returns The open branches, with `key` added or removed.
 */
function withBranchToggled(
  keys: readonly string[],
  key: string,
): readonly string[] {
  return keys.includes(key)
    ? keys.filter((each) => each !== key)
    : [...keys, key];
}

/**
 * What a value arriving from a page is refused for, if anything.
 *
 * Separate from the check an edit takes because it answers a
 * different question — what is wrong with what was STORED, before
 * anybody has touched it — and because it runs once, as a lazy
 * state seed, where the other runs per edit.
 *
 * @typeParam T - What the schema accepts.
 * @param value - The payload as it arrived.
 * @param schema - What a payload has to satisfy.
 * @returns One sentence per issue, or {@link NO_REFUSAL}.
 */
function storedRefusal<T>(
  value: T,
  schema: ZodType<T>,
): readonly string[] {
  const checked = schema.safeParse(value);

  return checked.success
    ? NO_REFUSAL
    : describeSchemaIssues(checked.error);
}

/**
 * The candidate a write produced, or `null` if it was refused.
 *
 * The identity check the header names: `./values.ts` answers the
 * value it was handed when it refuses, and offers that as the whole
 * reading. The one accepted write that also answers identity — a
 * root write of the value onto itself — is reported here as a
 * refusal, which costs nothing: what would have been reported is the
 * value the caller already has.
 *
 * @param value - The value the write was made against.
 * @param written - What `./values.ts` answered.
 * @returns The new value, or `null` if nothing moved.
 */
function applied(value: unknown, written: unknown): unknown {
  return written === value
    ? null
    : written;
}

/** What an editor hands the dynamic form provider. */
export interface DynamicFormProps<T extends object> {
  /**
   * What the structure column is called.
   *
   * The tree's accessible name, and presentation rather than
   * contract — the header says why, and why it is the only prop
   * here that is not part of the bargain inherited from
   * `../components/JsonEditor.tsx`.
   */
  readonly label: string;
  /**
   * The payload as it stands.
   *
   * Read on every render, unlike the JSON box's text: a form edits a
   * VALUE, so there is no half-typed intermediate state at this
   * level to be overwritten. The one that exists lives per box, in
   * `./FieldControl.tsx`, which is where it can be held against the
   * member it belongs to.
   */
  readonly value: T;
  /**
   * Report a payload the schema accepted.
   *
   * Fires on nothing else, which is the whole of the refusal this
   * provider performs, and the same promise the box next door makes.
   */
  readonly onChange: (next: T) => void;
  /**
   * What a payload has to satisfy before it is reported.
   *
   * Supplied by the page for the reason its neighbour states: the
   * page is what knows the shape it is editing. Checked over the
   * WHOLE candidate on every edit — see the header.
   */
  readonly schema: ZodType<T>;
  /**
   * What to draw, and what to call each part of it.
   *
   * The root container of the shape {@link DynamicFormProps.schema}
   * describes: `./tree.ts` roots a tree at it and `./NodeForm.tsx`
   * draws one node of that tree at a time. A page whose shape v1
   * cannot express answers no defs at all and keeps the JSON box.
   */
  readonly defs: ContainerFieldDef;
}

/**
 * The dynamic form provider: a structure to navigate, and one form.
 *
 * @typeParam T - The payload being edited.
 * @param props - The label, the payload, the report, the schema and
 * the defs to draw it from.
 * @returns The two columns, and the refusal region under them.
 * @throws If any def in the walk carries a container type outside
 * the two, which `check-types` rules out for defs written here.
 */
export const DynamicForm = <T extends object>({
  label,
  value,
  onChange,
  schema,
  defs,
}: DynamicFormProps<T>) => {
  // The one holder of where an operator is; the header says why
  // nothing below it keeps a second reading.
  const [selectedPath, setSelectedPath] = useState<NodePath>(
    ROOT_PATH,
  );
  const [openKeys, setOpenKeys] = useState<readonly string[]>(
    [ROOT_NODE_KEY],
  );
  const [refusal, setRefusal] = useState<readonly string[]>(
    () => storedRefusal(value, schema),
  );

  // Rebuilt per render from the value the page has now, so a list
  // that changed length is a tree that changed with it. Pure, and
  // the arity is all it reads.
  const tree = buildFormTree(defs, value);
  const node = nodeAt(tree, selectedPath) ?? tree;
  const trail = breadcrumbTo(tree, node.path);
  const nodeKey = pathKey(node.path);

  const report = (candidate: unknown) => {
    if (candidate === null) {
      return;
    }

    const checked = schema.safeParse(candidate);

    if (!checked.success) {
      setRefusal(describeSchemaIssues(checked.error));

      return;
    }

    setRefusal(NO_REFUSAL);
    onChange(checked.data);
  };

  const goTo = (path: NodePath) => {
    setSelectedPath(path);
    setOpenKeys(withBranchOpened(openKeys, pathKey(path)));
  };

  const selectKey = (key: string) => {
    const path = pathForKey(tree, key);

    if (path !== null) {
      goTo(path);
    }
  };

  const toggleKey = (key: string) => {
    setOpenKeys(withBranchToggled(openKeys, key));
  };

  const selectStep = (index: number) => {
    const step = trail[index];

    if (step !== undefined) {
      selectKey(step.key);
    }
  };

  return (
    // No gap on the outer column: the region below is empty most of
    // the time, and a flex gap would hold a space open for a banner
    // that is not there. The margin travels with the banner instead.
    <div className="flex flex-col">
      <div className={SHELL_LAYOUT}>
        <TreeNav
          className={TREE_PANEL}
          label={label}
          nodes={treeNavNodes(tree)}
          selectedKey={nodeKey}
          onSelect={selectKey}
          expandedKeys={openKeys}
          onToggle={toggleKey}
        />

        <div className={FORM_COLUMN}>
          {/* The last step is where we are: `breadcrumbTo` answers
              the trail root first and inclusive, so the index is a
              position rather than a number computed some other
              way. */}
          <Breadcrumb
            items={trail}
            index={trail.length - 1}
            onChange={selectStep}
          />

          {/* Keyed by the node, so moving between two nodes drawing
              the same members remounts rather than reuses: a control
              holds half-typed text for as long as it is mounted, and
              a reused one would show it under another member. */}
          <NodeForm
            key={nodeKey}
            node={node}
            value={value}
            onValueChange={(path: NodePath, next: LeafValue) => {
              report(applied(value, withValueAt(value, path, next)));
            }}
            onDrillIn={goTo}
            onReorder={(path: NodePath, from: number, to: number) => {
              const moved = withListReordered(value, path, from, to);

              report(applied(value, moved));
            }}
          />
        </div>
      </div>

      <div role="status">
        {refusal.length > 0 && (
          <Banner className="mt-3" tone="danger" title={REFUSED_TITLE}>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {refusal.map((sentence, index) => (
                // Keyed by position: the list is rebuilt whole on
                // every check and never reordered, and two issues
                // are free to phrase the same sentence twice.
                <li key={index}>{sentence}</li>
              ))}
            </ul>
          </Banner>
        )}
      </div>
    </div>
  );
};
