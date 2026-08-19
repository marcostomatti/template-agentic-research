#!/usr/bin/env bash
# Claude-runnable end-to-end check that the visual CI pipeline is wired
# correctly. Exit non-zero on the first failed check. Run from repo root.
#
#   SKIP_LOCAL=1 scripts/verify-visual-ci.sh   # skip the local visual run
set -uo pipefail

fail() { echo "❌ $1"; exit 1; }
ok()   { echo "✅ $1"; }

# 1. GitHub remote configured
git remote get-url origin >/dev/null 2>&1 || fail "no 'origin' remote — push the repo to GitHub first (docs/ci/grow-box-runner-setup.md §1)"
ok "git remote 'origin': $(git remote get-url origin)"

# 2. gh authenticated
gh auth status >/dev/null 2>&1 || fail "gh CLI not authenticated — run 'gh auth login'"
ok "gh CLI authenticated"

# 3. Runner registered, online, labeled 'grow-box'.
# The runner is registered at ORG level: repo-level
# `gh api repos/{owner}/{repo}/actions/runners` does NOT list org runners
# (it returns an empty set), so query the org endpoint — which requires a
# token with the `admin:org` scope (classic PAT) or the org "Self-hosted
# runners: read" fine-grained permission. `gh auth refresh -s admin:org`
# adds it to an existing gh login.
RUNNERS_JSON="$(gh api orgs/{owner}/actions/runners 2>/dev/null)" \
  || fail "cannot query org runners — token likely lacks admin:org scope (run 'gh auth refresh -s admin:org'); runner state is also visible in Org Settings → Actions → Runners"
ONLINE="$(echo "$RUNNERS_JSON" | python3 -c '
import sys, json
d = json.load(sys.stdin)
n = sum(1 for r in d.get("runners", [])
        if r.get("status") == "online"
        and any(l.get("name") == "grow-box" for l in r.get("labels", [])))
print(n)')"
[ "${ONLINE:-0}" -ge 1 ] || fail "no ONLINE runner labeled 'grow-box' available to this repo (docs/ci/grow-box-runner-setup.md §2)"
ok "runner online with 'grow-box' label"

# 4. Workflow present on the default branch
gh api repos/{owner}/{repo}/contents/.github/workflows/front.yml >/dev/null 2>&1 \
  || fail "front.yml not found on the default branch — merge it to main"
ok "front.yml present on default branch"

# 4b. Pipeline enabled — the workflow is a no-op until the untracked
# VISUAL_CI repository variable is set (docs/ci/grow-box-runner-setup.md §0)
VISUAL_CI_VALUE="$(gh variable get VISUAL_CI 2>/dev/null)"
[ "${VISUAL_CI_VALUE}" = "enabled" ] \
  || fail "VISUAL_CI variable not 'enabled' — the gate is off; run 'gh variable set VISUAL_CI --body enabled' (docs/ci/grow-box-runner-setup.md §0)"
ok "VISUAL_CI variable is 'enabled'"

# 5. Local visual path works (advisory environment)
if [ "${SKIP_LOCAL:-0}" != "1" ]; then
  echo "▶ Running local visual suite (set SKIP_LOCAL=1 to skip)…"
  bun run test:visual >/dev/null 2>&1 || fail "local 'bun run test:visual' failed — run it directly for output"
  ok "local visual suite passes"
fi

echo
echo "🎉 All visual-CI checks passed. Run the canary (docs/ci/grow-box-runner-setup.md §5) for full end-to-end proof."
