---
name: buildkit-log-reading
description: "Use when reading a multi-stage `docker build` log — a COPY step that appears once for several stages, or a step that neither completes nor errors."
prevents: "a step read as missing from a stage that in fact ran, and a cancelled step misdiagnosed as the failure"
signal: silent
when_to_use: "You are reading a docker build / buildx log over a multi-stage Dockerfile and trying to confirm a specific stage ran a specific instruction. Prevents: a step read as missing from a stage that in fact ran, and a cancelled step misdiagnosed as the failure"
tags:
  - docker
  - buildkit
  - verification
stack:
  - docker
---

# buildkit-log-reading — what a BuildKit log does not print

Two behaviours make a BuildKit log a poor match for "show me stage X
running instruction Y". Both are the builder working as designed, and
both read as a missing or broken step.

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
