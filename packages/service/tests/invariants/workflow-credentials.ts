/**
 * @packageDocumentation
 * Every credential a built workflow binds, collected as the
 * `(type, id, name)` triples n8n resolves a binding by.
 *
 * N8N RESOLVES A CREDENTIAL BY ID, and that one fact is what this
 * module exists for. Every credential-bearing node across the six
 * built artifacts names a triple, `scripts/n8n-credentials.ts`
 * declares the credentials a local bootstrap creates, and the two
 * have to agree exactly. They are written down in different files
 * for different readers — an artifact by whoever drew the canvas, a
 * roster entry by whoever wrote the bootstrap — and nothing today
 * holds them together.
 *
 * WHAT DISAGREEMENT COSTS IS A RUN THAT NEVER STOPS. A node bound to
 * a credential the bootstrap does not create imports cleanly,
 * activates cleanly and publishes cleanly: the import verb writes the
 * workflow whatever its nodes name, and `activate-workflows.sh` reads
 * triggers rather than bindings. The failure surfaces at the first
 * node that opens a socket, as a credential the editor shows as
 * missing, and it surfaces on an operator's machine rather than in
 * the suite. A workflow gaining a node bound to a third credential is
 * the ordinary way to get there, and it is a canvas edit that looks
 * like every other canvas edit.
 *
 * THE SUBJECT IS THE BUILT TREE, not `workflows/src/`. What
 * `scripts/import-workflows.sh` feeds a container is what
 * `workflows/dist/` holds, so that is the tree whose bindings decide
 * anything. Measured on this branch: the two agree node for node
 * today, every source's credential-bearing nodes carrying the same
 * bindings its artifact does — so the choice buys nothing yet and
 * costs nothing, and it is the choice that keeps reporting the truth
 * if marker resolution ever does touch a binding.
 *
 * THE TYPE COMES FROM THE KEY AND THE REST FROM THE VALUE, which is
 * the one parse decision here with teeth. A node's `credentials`
 * member is a mapping from credential TYPE to the `{ id, name }` pair
 * bound at it, so two thirds of a triple are read out of a value and
 * the remaining third is the key that value sat under. A reader
 * taking the whole member as one object would answer bindings with no
 * type on them, and a type is what decides which credential class
 * n8n resolves the fields against.
 *
 * REFUSING AN EMPTY READ is owed for the reason `workflow-dist.ts`
 * next door argues at length, one level up from where it argues it.
 * The assertion standing on this reader is a set equality, so an
 * empty read is not silent — but it reddens naming every roster entry
 * as referenced by no artifact, which reads as a canvas that lost its
 * bindings and sends a reader to `workflows/src/`. The edit is
 * `bun run build:workflows`, and {@link NoWorkflowsReadError} is what
 * says so.
 *
 * REFUSING A MALFORMED BINDING closes the same hole one level down,
 * and that one IS silent. A node whose `id` parsed as a number
 * matches no roster entry, so dropping it quietly would leave the
 * equality answered by its thirty-nine well-formed siblings while the
 * node itself is bound to nothing. There is no reading in a green run
 * that parts the two, which is why the walk raises instead.
 *
 * Split from the assertions the way `workflow-dist.ts`,
 * `compose-service.ts` and `openapi-coverage.ts` are: the input to a
 * check is a subject in its own right, and a case can ask it
 * questions rather than assume the answers.
 * `workflow-credentials.test.ts` beside it holds the answer against
 * the roster and plants both directions.
 */

import type { BuiltWorkflow, BuiltWorkflowNode } from './workflow-dist.js';

/**
 * The node member a binding is read out of.
 *
 * Named once because it is spelled by the walk and by every refusal
 * message below, and a reader chasing one of those messages back into
 * an artifact is searching for exactly this string.
 */
const CREDENTIALS_MEMBER = 'credentials';

/**
 * The two members a binding carries, and the two a triple needs
 * beside the type it sat under.
 *
 * A roster rather than two tests written out, so a refusal can name
 * both at once: a binding that is not an object at all is short of
 * both, and a reader sent back for one member and then for the other
 * reads the second failure as a new defect. The same shape
 * `DECLARED_NODE_MEMBERS` takes in `workflow-dist.ts`, for the same
 * reason.
 */
const BINDING_MEMBERS = ['id', 'name'] as const;

/**
 * What separates the three parts of a printed triple.
 *
 * Exported because it is the one assumption the label rests on: the
 * label is only a faithful key while no part of a triple carries it,
 * and a case holds both sides to that rather than leaving it stated.
 *
 * Spaced rather than bare, so a name carrying a slash of its own —
 * which is a display name and free to carry anything — does not read
 * as a part boundary at a glance.
 */
export const TRIPLE_SEPARATOR = ' / ';

/**
 * A credential as n8n resolves one, and as both sides of the
 * comparison spell it.
 *
 * Three members and no more, because three is what the two sides have
 * in common. An artifact's binding carries nothing else; a roster
 * entry carries a `role` besides, which is prose for a reader and
 * reaches no instance. Declaring the intersection is what lets one
 * label function serve both, so neither side is converted on its way
 * into the comparison.
 */
export interface CredentialTriple {
  /**
   * The id n8n stores the credential under, and the only member the
   * resolution actually turns on.
   */
  readonly id: string;

  /**
   * The display name shown beside the binding.
   *
   * Part of the triple rather than cosmetic: it is stored on the row
   * AND written into every node that binds it, so a name that moved
   * on one side alone shows an operator one label on the credential
   * and another on the node bound to it.
   */
  readonly name: string;

  /**
   * The credential type whose field set n8n resolves the stored data
   * against.
   *
   * n8n's own spelling rather than this repository's — `postgres` and
   * `openAiApi` are the base package's and the langchain node's — so
   * it is a value to transcribe and never one to choose.
   */
  readonly type: string;
}

/**
 * One binding, as a built artifact carries it.
 *
 * The triple plus where it was found. The two extra members are never
 * compared and are the whole of what a failure has to go on: a triple
 * on its own says some canvas binds a credential nobody creates, and
 * these two say which canvas and which node.
 */
export interface CredentialReference extends CredentialTriple {
  /**
   * Name of the artifact it was read out of, as
   * {@link BuiltWorkflow.file} spells it.
   *
   * The build writes one artifact per source under the source's own
   * name, so this names the file to open under `workflows/src/`.
   */
  readonly file: string;

  /** The node's name on the canvas, the other half of that answer. */
  readonly node: string;
}

/**
 * Thrown when there is no built workflow to collect bindings from.
 *
 * The vacuity this closes is not a silent one — the equality standing
 * on this reader must FIND every roster entry, so an empty read
 * reddens either way. What it closes is a failure that names the
 * wrong edit: every roster entry reported as referenced by no
 * artifact reads as six canvases that lost their bindings, when what
 * happened is that nothing was built.
 *
 * Over `loadBuiltWorkflows`'s own answer this can never fire.
 * That reader refuses an empty tree one level up, under
 * `EmptyDistDirectoryError`, and refuses an artifact carrying no node
 * under `EmptyWorkflowError`. This refusal is for the other caller —
 * one that assembled a list of its own — and it is the difference
 * between this walk and `nodesMatching` next door, which deliberately
 * does not refuse because an empty answer is the PASSING answer for
 * every absence check reading it. Here an empty answer is a failing
 * one, and it fails saying something untrue.
 *
 * A distinct class rather than a bare `Error`, so a case covering
 * this path pins the failure to this cause. Every other way the walk
 * can fail arrives as `Error`, and an assertion taking one of those
 * would pass for a read that got further than this one ever does.
 */
export class NoWorkflowsReadError extends Error {
  constructor() {
    super(
      'No built workflow was handed to the credential walk, so the ' +
      'triples it answers are empty and every credential the roster ' +
      'in `scripts/n8n-credentials.ts` declares reports as ' +
      'referenced by nothing. That reads as six canvases that lost ' +
      'their bindings; what it means is that there was nothing to ' +
      'read. `bun run build:workflows` writes `workflows/dist/`, and ' +
      '`pretest` runs it for the `test` script and for no other.',
    );
    this.name = this.constructor.name;
  }
}

/**
 * The bindings one node carries.
 *
 * @param node - The node, as `loadBuiltWorkflows` handed it
 *   back.
 * @param file - Name of the artifact it came out of, for the messages
 *   and for the answer.
 * @returns One reference per binding, in the member's own order,
 *   empty for a node that binds nothing — which most nodes do.
 * @throws Error When `credentials` is present and is not a mapping,
 *   or when a binding under it is short of a string `id` or a string
 *   `name`.
 *
 * @remarks
 * BOTH REFUSALS ARE ABOUT THE SAME QUIET FAILURE. A binding this walk
 * could not read is a binding that leaves the answer, and the answer
 * is compared as a SET: thirty-nine well-formed siblings keep the
 * triple present, so the equality passes over a node bound to
 * nothing. Nothing in a green run parts that from a healthy tree.
 *
 * Plain `Error`s rather than classes, on the split `workflow-dist.ts`
 * draws over its own node members: a class is what lets a case pin a
 * cause, and a malformed artifact is a defect to report rather than a
 * path this suite covers.
 */
function referencesOfNode(
  node: BuiltWorkflowNode,
  file: string,
): readonly CredentialReference[] {
  const member = node[CREDENTIALS_MEMBER];

  if (member === undefined || member === null) {
    return [];
  }

  if (typeof member !== 'object' || Array.isArray(member)) {
    throw new Error(
      `Node '${node.name}' of built workflow '${file}' carries a ` +
      `'${CREDENTIALS_MEMBER}' that is ${typeof member} and not a ` +
      'mapping from credential type to the binding under it. Read ' +
      'as anything else it answers no binding at all, which is what ' +
      'a node binding nothing answers, and this walk is how a bound ' +
      'credential is found.',
    );
  }

  return Object.entries(member as Record<string, unknown>)
    .map(([type, value]) => {
      const bound: Record<string, unknown> =
        typeof value === 'object' && value !== null && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const wrong = BINDING_MEMBERS
        .filter((name) => typeof bound[name] !== 'string')
        .map((name) => `string ${name}`)
        .join(' and no ');

      if (wrong !== '') {
        throw new Error(
          `Node '${node.name}' of built workflow '${file}' binds ` +
          `'${type}' through an entry carrying no ${wrong}. A ` +
          'binding this walk cannot read drops out of the triples ' +
          'it answers, and the triples are compared as a set — so ' +
          'a sibling node binding the same credential correctly ' +
          'would leave that comparison green over a node bound to ' +
          'nothing. The node belongs in the source of that name ' +
          'under `workflows/src/`: the build rebuilds a parsed ' +
          'source without adding a member or dropping one.',
        );
      }

      return {
        file,
        id: bound['id'] as string,
        name: bound['name'] as string,
        node: node.name,
        type,
      };
    });
}

/**
 * Every credential binding the given workflows carry.
 *
 * @param workflows - Built workflows to walk, ordinarily the whole of
 *   what `loadBuiltWorkflows` returned. Handed in rather than read,
 *   so a case drives the refusals and both plants over a tree it
 *   controls.
 * @returns One {@link CredentialReference} per binding, workflows in
 *   the order they were given and nodes in each artifact's own order.
 *   Empty only for a tree whose every node binds nothing, which is a
 *   reading rather than a refusal.
 * @throws NoWorkflowsReadError When `workflows` is empty.
 * @throws Error When a node's `credentials` member, or a binding
 *   under it, is not shaped the way an artifact spells one.
 *
 * @remarks
 * ONE ENTRY PER BINDING AND NOT PER TRIPLE. Forty of these carry the
 * same triple as each other, which is the point: the answer is what a
 * failure names an offender out of, and folding it to a set here
 * would leave a caller holding a triple with nowhere to send a
 * reader. {@link referencedTriples} is the fold, and it sits beside
 * this rather than inside it.
 */
export function credentialReferences(
  workflows: readonly BuiltWorkflow[],
): readonly CredentialReference[] {
  if (workflows.length === 0) {
    throw new NoWorkflowsReadError();
  }

  return workflows.flatMap((workflow) => workflow.nodes
    .flatMap((node) => referencesOfNode(node, workflow.file)));
}

/**
 * A triple as both sides of the comparison print it.
 *
 * @param triple - Either side: a binding read off an artifact, or an
 *   entry of the roster in `scripts/n8n-credentials.ts`, whose extra
 *   `role` member is not part of the comparison and is not read here.
 * @returns `<type> / <id> / <name>`.
 *
 * @remarks
 * ONE FUNCTION FOR BOTH SIDES, which is safe here for a reason worth
 * stating rather than assuming. `openapi-coverage.ts` deliberately
 * rewrites one of its two sides only, because a conversion both sides
 * shared could hide a difference by mapping two unlike things
 * together. This is a JOIN and not a conversion: nothing is dropped,
 * folded or normalised, so two triples share a label only if some
 * part of one carried {@link TRIPLE_SEPARATOR} and moved a boundary.
 * That is left as an assumption in neither place — the case beside
 * this holds every part of every triple on both sides to carrying no
 * separator, which is what makes the label a faithful key rather than
 * a likely one.
 *
 * A label to READ and never one to split, the way `<file>:<node>` is
 * in `nodesMatching`.
 */
export function tripleLabel(triple: CredentialTriple): string {
  return [triple.type, triple.id, triple.name].join(TRIPLE_SEPARATOR);
}

/**
 * Every distinct credential the given workflows bind.
 *
 * @param workflows - Built workflows to walk.
 * @returns One {@link tripleLabel} per distinct triple, in first-seen
 *   order.
 * @throws NoWorkflowsReadError When `workflows` is empty.
 * @throws Error When a binding is not shaped the way an artifact
 *   spells one.
 *
 * @remarks
 * A set because the comparison is one: forty-three bindings across
 * six artifacts spell two credentials, and what the roster can be
 * held to is which credentials exist rather than how often each is
 * bound. A count would move with every canvas edit that added a
 * database node, which is not a fact about the bootstrap.
 */
export function referencedTriples(
  workflows: readonly BuiltWorkflow[],
): ReadonlySet<string> {
  return new Set(credentialReferences(workflows).map(tripleLabel));
}
