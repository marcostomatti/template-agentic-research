# The rafa cutover

The agent task loop no longer runs from source in this repository. It runs
through `rafa`, a binary installed globally on the machine, outside this
workspace. The loop's interface is unchanged: the same `plan`, `start`,
`usage` and `effort` commands, run from the repo root, with plans and
trackers still in `.plans/`.

## `bun run ralph` resolves to the global binary

The root `package.json` keeps the `ralph` script, so every existing
invocation still works, but its body is now the bare command:
`"ralph": "rafa"`. It is neither `bun rafa` nor a path into `tools/`.

Nothing in the workspace provides that command. There is no
`node_modules/.bin/rafa` and no `bun.lock` entry for it, so when `bun run`
looks for the script's command it finds nothing in `node_modules/.bin` and
falls through to `PATH`, where the global install lives. Every
`bun run ralph ...` therefore hands its arguments straight to the global
binary.

To confirm it on a given machine, read the line `bun run` echoes before it
runs a script: `bun run ralph --help` prints `$ rafa --help`, then the
loop's usage. Without a global install on `PATH` the script fails with
exit 127; it never falls back to the in-repo loop. Where `rafa` sits in
`~/.bun/bin`, the directory `bun` itself runs from, a trimmed `PATH` hides
both, so call `bun` by absolute path to see that case:
`env PATH=/usr/bin:/bin "$(command -v bun)" run ralph usage` echoes
`$ rafa usage`, then ends `error: script "ralph" exited with code 127`.

## `tools/ralph/` is retired by the cutover commit

The in-repo loop under `tools/ralph/` is retired by the cutover commit,
which deletes the whole directory on `main` in one commit. Until that commit
lands the directory is still in the tree, but nothing runs it: the `ralph`
script no longer points there.

The deletion leaves prose behind that still describes the old loop as
living here, and the cutover commit, or the one straight after it, owes a
sweep of it:

- `context/loop.md`, which maps the old loop's modules;
- the header comment of `.github/workflows/back.yml`;
- the root `vitest.config.ts`, and this one is more than prose, so it
  changes in the cutover commit itself: its note calls the root suite the
  old loop's, and its only `include` glob, `tools/**/*.test.ts`, matches no
  file once the directory is gone. `vitest run` then prints
  `No test files found, exiting with code 1`, which reds the root
  `bun run test`, the `test:all` fan-out it gates, and the test step of
  `back.yml`.
