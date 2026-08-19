# Visual CI on the grow-box runner — operator setup

Operator steps to host this repo on GitHub and run its visual regression suite on
the existing grow-box self-hosted runner. Each step has a command and a "confirm
it worked" check.

## 0. The pipeline is OFF by default — enabling is untracked

`.github/workflows/front.yml` is a **reference implementation**: anyone
pulling this library into their project gets the shape of the gate, but the
job is a no-op until the repository Actions variable `VISUAL_CI` is set to
`enabled`. That flag — like the runner registration itself — lives in GitHub
settings, so the real pipeline wiring (which runner, whether it runs at all)
is never tracked in the repo. The local suite (`bun run test:visual`,
`bun run test:visual:update`) is independent of all of this and always works.

```bash
gh variable set VISUAL_CI --body enabled     # turn the gate on
gh variable delete VISUAL_CI                 # turn it back off
```

Optional: point the job at a different runner without editing the workflow by
setting `VISUAL_CI_RUNNER` to a JSON label array:

```bash
gh variable set VISUAL_CI_RUNNER --body '["self-hosted","my-runner"]'
```

**Confirm:** `gh variable list` shows `VISUAL_CI` = `enabled`; the next push's
"Visual Regression" run executes instead of skipping.

Only proceed with the steps below when you actually want the gate live.

**Context.** The grow-box runner (see grow-box `docs/runbooks/cicd.md` and
`migrations/0008-github-runner.sh`) is a native systemd runner on the Ubuntu host:
unprivileged `actions-runner` user, labels `self-hosted, grow-box`, **no Docker
access** (by design). If it is still registered repo-scoped, that scope is the one
thing blocking this repo from using it. The visual suite here runs natively
(bun + Playwright Chromium in the runner user's cache) — no Docker required,
matching the runner's constraints.

## 1. Create the GitHub repo and push

```bash
cd ~/projects/components-library
gh repo create components-library --private --source=. --remote=origin
git push -u origin main
```
**Confirm:** `gh repo view --web` opens the repo; `main` shows the commits.

## 2. Make the runner available to this repo

Pick ONE:

### Option A — promote the runner to org scope (recommended)

One runner serves every repo in the org. On github.com: **Organization →
Settings → Actions → Runners → New runner**, then on the grow-box host,
re-register the existing runner against the org URL (this replaces the repo-scoped
registration; the runner's other repos keep working because org runners serve all
repos):

```bash
sudo systemctl stop actions.runner.*    # stop the current runner service
cd /opt/actions-runner
sudo -u actions-runner ./config.sh remove --token <REMOVAL_TOKEN_FROM_OLD_REPO_SETTINGS>
sudo -u actions-runner ./config.sh --unattended --replace \
  --url https://github.com/<ORG> \
  --token <ORG_RUNNER_TOKEN> \
  --name grow-box --labels self-hosted,grow-box --work _work
sudo ./svc.sh install actions-runner && sudo ./svc.sh start
```

Then in **Org → Settings → Actions → Runner groups**, allow the group for
this repo (or all repos).

**Confirm:** the repo's **Settings → Actions → Runners** shows `grow-box` as
**Idle** (inherited from the org).

> **API visibility gotcha (hit 2026-07-16):** org-level runners do NOT appear
> in the repo endpoint — `gh api repos/<owner>/<repo>/actions/runners` returns
> an empty set even when the org runner serves the repo. Query
> `gh api orgs/<owner>/actions/runners` instead, which needs a token with the
> `admin:org` scope (classic PAT) or the org-level "Self-hosted runners: read"
> fine-grained permission: `gh auth refresh -s admin:org`.
> `scripts/verify-visual-ci.sh` uses the org endpoint for this reason.

> If grow-box's runner registration is managed by its `ci/runner.env` +
> `make upgrade` flow, prefer updating `GITHUB_REPO_URL` there to the org URL and
> re-running the migration, so the repo stays the source of truth.

### Option B — second, repo-scoped runner

Keep the existing runner untouched; register another runner instance (new
directory, e.g. `/opt/actions-runner-components`) against this repo's URL with
the same `self-hosted,grow-box` labels, same unprivileged-user pattern, installed
as a second systemd service.

**Confirm:** this repo's **Settings → Actions → Runners** shows the new runner **Idle**.

## 3. One-time host prep: bun + Playwright OS libraries

The job runs `bun install` and `bunx playwright install chromium` itself (browsers
go to the runner user's `~/.cache/ms-playwright`). Chromium's **shared OS
libraries** are the only sudo-requiring piece, once:

```bash
# as the operator (sudo), on the grow-box host
sudo apt-get update
sudo npx playwright@1.61.1 install-deps chromium
# bun, if the runner user doesn't have it yet:
sudo -u actions-runner bash -lc 'command -v bun || curl -fsSL https://bun.sh/install | bash'
```

**Confirm:**
```bash
sudo -u actions-runner bash -lc 'bun --version'
sudo -u actions-runner bash -lc 'cd /tmp && bun x playwright@1.61.1 install chromium && bun x playwright@1.61.1 launch-server chromium --help >/dev/null 2>&1; echo browsers-ok'
```
prints a bun version and `browsers-ok`.

> Network note: the suite loads Google Fonts at render time, so the runner needs
> egress to fonts.googleapis.com / fonts.gstatic.com. Self-hosting the fonts is a
> tracked follow-up.

## 4. Fork-PR safety

The runner is on the home network. Keep **Settings → Actions → Fork pull request
workflows** requiring approval; `front.yml` also guards with a same-repo `if:`.

**Confirm:** a PR from a fork does not auto-start the Visual Regression job.

## 5. Prove the gate bites

Once the runner shows **Online/Idle** for this repo, run
`scripts/verify-visual-ci.sh`, then a canary: a no-op PR should come back green
(or "seeded" on the very first run); a PR with a real visual change should come
back red with downloadable diffs; reverting it should go green again.

## Baseline storage (current state + follow-up)

The runner's baselines persist via `actions/cache` (GitHub cloud backend), key
`visual-baselines-Linux-pw1.61.1-*`, refreshed on every push to `main`. Cache
eviction (~7 days unused) only costs one non-gating "seeded" run. A durable
alternative (a published baseline package or WebDAV storage) is a possible
follow-up if eviction becomes annoying.
