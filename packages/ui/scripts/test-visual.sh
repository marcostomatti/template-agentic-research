#!/usr/bin/env bash
# Visual regression suite — native (no Docker; the grow-box CI runner is
# deliberately Docker-less, so there is no shared image to standardize on).
# Baselines are per-environment and untracked: this machine only ever diffs
# against baselines this machine generated. CI is the gating environment.
#
# Usage:
#   scripts/test-visual.sh            # assert against this env's baselines
#   scripts/test-visual.sh --update   # (re)generate this env's baselines
set -euo pipefail
cd "$(dirname "$0")/.."

# 6016, not 6006 — must not collide with a `storybook dev` session.
PORT="${VISUAL_PORT:-6016}"

# Jest args after `--`: always emit the JSON report (local + CI read the same
# visual-report.json). --update adds -u to overwrite existing baselines.
JEST_ARGS="--json --outputFile=visual-report.json"
if [[ "${1:-}" == "--update" ]]; then
  JEST_ARGS="$JEST_ARGS -u"
fi

# `bun x`, not `bunx`, throughout: the CI runner host has the bun binary but
# not the bunx alias symlink; the subcommand form works everywhere.
# Browsers for the pinned playwright version (no-op when already installed).
bun x playwright install chromium

bun run build:storybook

# CI and GITHUB_ACTIONS are cleared for the jest child on purpose: under CI
# detection (jest checks BOTH vars) jest refuses to WRITE missing snapshots
# and fails them instead, which would redden every PR that adds a new story.
# The gate's job is to protect EXISTING baselines — changed pixels still
# fail; brand-new stories seed their baselines and pass (on CI those writes
# are discarded: PR jobs never save the baseline cache).
bun x concurrently -k -s first \
  "bun scripts/serve-static.ts storybook-static ${PORT}" \
  "bun x wait-on tcp:127.0.0.1:${PORT} && CI= GITHUB_ACTIONS= bun x test-storybook --url http://127.0.0.1:${PORT} -- ${JEST_ARGS}"
