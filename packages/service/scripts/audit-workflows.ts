/**
 * @packageDocumentation
 * Reads back what an n8n instance is holding and names the workflows
 * on it that this repository does not account for. A deploy matches
 * on a display name and touches what it matched; everything else the
 * instance carries — a workflow uploaded off an older checkout, one
 * left behind by a rename, one somebody built on the canvas — is
 * invisible to it, because `deploy-external.ts` reads the listing to
 * match on and not to judge. Judging it is what this command is for.
 *
 * Read-only unless asked otherwise, which is the shape the roster in
 * `README.md` beside it gives the command rather than a caution about
 * running it: an inventory that could change what it inventories is
 * not one anybody runs for a look. The flags that do change something
 * arrive with the command line later in this stage, and so does the
 * listing they would act on.
 *
 * What has landed is the sorting. {@link classify} takes two lists
 * and answers with five readings and a verdict over them, opening no
 * socket, reading no file and knowing nothing about where either list
 * came from — so the question this command exists to settle can be
 * driven from a case holding two literals, with nothing stubbed and
 * no instance in front of it. Where those two lists come from arrives
 * later in this stage: `expectedNames` off the workflow sources, and
 * the listing off the instance.
 */

import type { RemoteWorkflow } from './n8n-client.js';

/**
 * One display name the instance holds more than one workflow under.
 *
 * Both halves are worth carrying. The name is the edit — a rename
 * under `workflows/src/`, or a workflow removed on the instance — and
 * the workflows say how far the collision goes and which of them an
 * operator is choosing between.
 */
export interface DuplicateName {
  /** The name they all answer to. */
  readonly name: string;

  /** Every workflow holding it, in the order the instance listed. */
  readonly workflows: readonly RemoteWorkflow[];
}

/**
 * What an instance is holding, sorted against what is expected of it.
 */
export interface Classification {
  /** Workflows an expected name accounts for. */
  readonly known: readonly RemoteWorkflow[];

  /** Workflows no expected name accounts for. */
  readonly stray: readonly RemoteWorkflow[];

  /**
   * The strays the instance has ARMED, which is an `active` of
   * exactly `true` and nothing looser.
   *
   * Counted apart from the rest of them because an armed stray is the
   * only kind that is spending. One sitting inert holds a name and
   * costs nothing until somebody arms it, while one on a schedule
   * runs on its own, against whatever it was built from, and answers
   * to nobody holding this repository. That is what makes it the
   * reading an operator acts on first.
   */
  readonly activeStray: readonly RemoteWorkflow[];

  /** Expected names the instance holds no workflow under. */
  readonly missing: readonly string[];

  /** Names it holds more than one workflow under. */
  readonly duplicate: readonly DuplicateName[];

  /**
   * Whether the instance is holding nothing it should not.
   *
   * A stray or a duplicate makes this false and a missing workflow
   * alone leaves it true, which is not an oversight. What is missing
   * is the instance sitting BEHIND this repository and one deploy
   * away from being level with it; a stray is the instance carrying
   * something no part of this repository accounts for, and a
   * duplicate is a name that has stopped naming one workflow. Both of
   * those are states only a read of the instance itself can find.
   */
  readonly clean: boolean;
}

/**
 * Sort what an instance is holding against what is expected of it.
 *
 * Nothing is read and nothing is reached: the two lists are the whole
 * of the input and the answer is built out of them. Neither is
 * written to, so a caller may hold on to both and read them again
 * afterwards.
 *
 * What those readings are worth is settled outside this function.
 * {@link Classification.stray} and {@link Classification.clean} are
 * claims about `expected` as much as about the instance, and nothing
 * here knows or checks where that list came from, which makes the
 * choice of list the caller's whole responsibility rather than a
 * detail of it. What this command hands over is read off
 * `workflows/src/` — `expectedNames`, arriving later in this stage —
 * and never off a record of what some deploy put on an instance.
 *
 * A record of deploys would be answering a different question in the
 * same shape. It accounts for acts, where an audit asks what this
 * repository declares, and the two come apart in precisely the cases
 * this command exists for. Shared, such a record carries whatever
 * another machine's deploy uploaded, off a branch or a fork this
 * checkout knows nothing about, so the workflow an audit is for reads
 * as expected and is never named. Kept per machine it goes wrong the
 * other way, ratifying what this machine put there off an older
 * checkout under a name no source carries any more, which is the case
 * `deploy` in `deploy-external.ts` names as the one it does not
 * notice.
 *
 * Nor is there such a record to prefer: `deploy` answers with a
 * report of what it did and writes nothing down. What reading the
 * sources costs instead is that the expected set moves with the
 * checkout — it is whatever this commit declares, so an audit run
 * from an older one reports the workflows a newer one added as
 * strays. The verdict is the instance held against one commit, and
 * which commit that is belongs to whoever ran the command.
 *
 * A workflow whose name is not a string is a stray rather than one
 * this passes over. It can equal no expected name, so it is not a
 * match that was dropped but one that was never there — which is the
 * reading `remoteIdsByName` in `deploy-external.ts` already takes,
 * where such a workflow is skipped and what an instance is doing
 * holding it is handed on to an audit. This is that audit. Carrying
 * no name it is keyed under none, so it can be neither missing nor a
 * duplicate: those two are claims about names.
 *
 * {@link Classification.missing} follows the order `expected` was
 * given in, and a name given twice is one name. The other four follow
 * the order the instance listed in, which is the instance's own order
 * and not this repository's.
 *
 * @param remote - Every workflow the instance answered with.
 * @param expected - Every display name this repository accounts for.
 * @returns The five readings over those two lists, and the verdict.
 */
export function classify(
  remote: readonly RemoteWorkflow[],
  expected: readonly string[],
): Classification {
  const wanted = new Set(expected);
  const held = new Map<string, RemoteWorkflow[]>();
  const known: RemoteWorkflow[] = [];
  const stray: RemoteWorkflow[] = [];
  const activeStray: RemoteWorkflow[] = [];

  for (const workflow of remote) {
    const { name } = workflow;

    if (typeof name === 'string') {
      const sharing = held.get(name) ?? [];

      sharing.push(workflow);
      held.set(name, sharing);

      if (wanted.has(name)) {
        known.push(workflow);
        continue;
      }
    }

    stray.push(workflow);

    if (workflow.active === true) {
      activeStray.push(workflow);
    }
  }

  const missing = [...wanted].filter((name) => !held.has(name));
  const duplicate = [...held]
    .filter(([, sharing]) => sharing.length > 1)
    .map(([name, workflows]) => ({ name, workflows }));

  return {
    activeStray,
    clean: stray.length === 0 && duplicate.length === 0,
    duplicate,
    known,
    missing,
    stray,
  };
}
