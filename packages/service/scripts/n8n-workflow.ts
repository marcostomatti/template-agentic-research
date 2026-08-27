/**
 * @packageDocumentation
 * The questions an instance-facing command has to answer about a
 * workflow before it can act on one: which of a workflow's nodes
 * would arm it if it were activated, and which of a built artifact's
 * members may cross the public API. Three commands in this directory
 * deal with an n8n instance — the deploy, activate and audit paths —
 * and the answers live here rather than in any one of them, so that
 * all three answer the same questions the same way.
 *
 * Which of these a given command reaches for is that command's own
 * business. What is not negotiable is that no two of them may answer
 * differently, and three separate readings would drift without
 * anything saying so: nothing in this package holds one script's
 * answer against another's, both readings are plausible on their own,
 * and the disagreement surfaces as an operator running two commands
 * about one instance and being told two things.
 *
 * Everything here is answered from a workflow VALUE. Nothing below
 * opens a socket, reads a file or wants a credential, which is the
 * same line `workflow-markers.ts` draws against `build-workflows.ts`
 * with a different dependency on the far side — there a transpiler
 * and a directory tree, here a running instance and the key to reach
 * it. That half is `n8n-client.ts`, arriving later in this stage.
 *
 * The payoff is the package's isolated and live test split. The
 * default suite touches no external service, so a rule answerable
 * from a value is drivable there directly, with a workflow a case
 * wrote by hand and no instance anywhere in the run — and the live
 * seam is left covering what genuinely needs one. A rule that had to
 * ask an instance could be exercised only against an instance.
 *
 * This package depends on no n8n package of any kind. `n8n-workflow`
 * is a published one, and this module carries the name because it is
 * about the same subject rather than because anything here imports
 * it, so every shape below is one this repo declares and holds
 * against what a real artifact carries. Nothing resolves by that bare
 * specifier either: a caller reaches this module as
 * `./n8n-workflow.js`, the relative form every first-party import in
 * this package takes.
 *
 * The helpers arrive next in this stage — two rosters naming the
 * trigger types that do and do not arm a workflow,
 * `isActivatableTrigger` and `activatableTriggers` reading them, and
 * `toApiWorkflow` for the projection — and the three commands that
 * call them arrive with them.
 */
