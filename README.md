# agentic-research

The workspace map, and the `context/` pages behind it, live in `AGENTS.md`.
`docs/rafa-cutover.md` describes how the agent task loop moved to the
global `rafa` binary.

## Rolling back the rafa cutover

If the global `rafa` binary misbehaves, the in-repo loop comes back in
three steps, run from the repo root:

1. `git revert <cutover-commit-SHA>`. The cutover commit deletes
   `tools/ralph/`, and reverting it brings the directory back.
2. Restore the `ralph` script in `package.json` to
   `"ralph": "bun tools/ralph/ralph.ts"`. The script was repointed at
   `rafa` in an earlier commit, not in the cutover commit, so the revert
   leaves it calling the global binary.
3. `bun run ralph usage` to verify. The line `bun run` echoes before the
   output reads `$ bun tools/ralph/ralph.ts usage`; if it still reads
   `$ rafa usage`, step 2 did not land.

The global `rafa` install can stay where it is: once the script is
restored, `bun run ralph` no longer reaches it.

`<cutover-commit-SHA>` is a placeholder. Fill in the real SHA at step 7 of
the rafa cutover runbook, the step that makes the commit deleting
`tools/ralph/`.
