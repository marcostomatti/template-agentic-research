---
name: buildkit-log-reading
description: "Use when reading a multi-stage `docker build` log — a COPY step that appears once for several stages, a step that neither completes nor errors, or a line carrying the word `error` in a step that succeeded."
prevents: "a step read as missing from a stage that in fact ran, a cancelled step misdiagnosed as the failure, and a step's own diagnostic string read as a build failure"
signal: silent
when_to_use: "You are reading a docker build / buildx log over a multi-stage Dockerfile and trying to confirm a specific stage ran a specific instruction. Prevents: a step read as missing from a stage that in fact ran, a cancelled step misdiagnosed as the failure, and a step's own diagnostic string read as a build failure"
tags:
  - docker
  - buildkit
  - verification
stack:
  - docker
---

# buildkit-log-reading — what a BuildKit log does not print

Three behaviours make a BuildKit log a poor match for "show me stage X
running instruction Y". All are the builder working as designed, and
each reads as a missing, hung or broken step.

## Identical steps across sibling stages are printed ONCE

BuildKit's build graph is content-addressable: an instruction with the
same inputs and the same parent state is the SAME node, however many
stages declared it. Several stages sharing a `FROM` base and opening
with the same `COPY` lines collapse into one executed node, printed
once under whichever stage's label the scheduler attached it to — so a
log can show

```
#11 [web  7/18] COPY packages/dev-tools/package.json ./packages/dev-tools/
```

and nothing under `deps` or `runtime`, while all three stages have that
file. Asked to prove stage X copied something, expect ONE merged
occurrence covering several stages, not one line per stage; and take
the positive reading from a later step that could only succeed if the
copy landed (an install that accepts a frozen lockfile, say) rather
than from counting COPY lines.

This caveat does NOT fire on a single-target build (`docker build
--target web` alone). BuildKit merges an instruction into one node
only when two DIFFERENT stages in the SAME invocation share it, and
building one target in isolation presents no sibling to merge with —
so every step prints once under the one stage label, and the shape
that looks like collapsing is just the log having a single label.
Do not carry a collapsed-step explanation over to a `--target` log.

## An unrelated step that just stops was CANCELED, not hung

On the first failure anywhere in the graph, `docker build` tears the
whole build down — including independent branches with no dependency
on the failing step. Their logs simply end: no completion line, no
error. The tell is a `CANCELED` marker on the step:

```
#14 CANCELED
```

Read the FAILING step for the cause, never the cancelled one. A
cancelled `RUN bun install` says nothing about whether that install
would have succeeded.

## The word `error` in a step's output is not a failed step

A `RUN` step's stdout and stderr are printed verbatim, so a script
that PRINTS the word as part of its own conditional logic is
indistinguishable, on a naive `grep -i error`, from a step that
actually failed. A guard shaped like

```sh
grep -q 'ioredis' "$bundle" && { echo 'ERROR: ioredis leaked'; exit 1; } || exit 0
```

prints its own `ERROR:` string as the shell parses and runs it, and
the step then closes `DONE` because the `exit 0` branch is the one
that fired.

The verdict is the enclosing step's own terminator, not a match
inside it: find the step number the line sits under and read whether
that `#N` closed `DONE`, `ERROR` or `CANCELED`. Grep for `^#[0-9]*
ERROR` or for the build's final status line; never for the bare word.
