# Runbook: Copy the EDS Quality-Guardrail Layer to a New Project (Blind Copy)

**Audience:** an AI coding agent (Claude) or the AOE lead, working with **local clones**.
**Master source of truth:** [`meejain/ema-eds-guardrail`](https://github.com/meejain/ema-eds-guardrail) — the canonical guardrail repo. Always copy *from a fresh clone of the master*.
**Model:** blind copy a fixed set of paths from the master → into the target → push to a **branch** → open a **PR** → the PR diff is the review gate → human approves & merges to `main`.

> **Safe-when assumption:** blind copy is clean when the target is a **fresh aem-boilerplate clone**. The master's `AGENTS.md` and `package.json` are supersets of the stock boilerplate (package name is still the generic `@adobe/aem-boilerplate`), so overwriting them is safe on a fresh project. **If the target has already been customized** (its own AGENTS.md content, extra `package.json` deps, or its own quality files), the blind overwrite will drop that — the **PR reviewer must catch it in the diff**. When in doubt, review the two overwrite files (`AGENTS.md`, `package.json`) in the PR carefully.

---

## Step 1 — Prerequisites (human)

1. Clone **both** repos locally:
   ```sh
   git clone https://github.com/meejain/ema-eds-guardrail.git   # the master source
   git clone https://github.com/<owner>/<target-repo>.git       # the destination
   ```
2. Create a working branch in the **target**:
   `cd <target-repo> && git checkout -b add-eds-guardrails`
3. Give the agent two paths: `SOURCE` = the `ema-eds-guardrail` clone, `TARGET` = the target clone.

---

## Step 2 — Blind copy the guardrail layer (agent)

Copy exactly this set from `SOURCE` → `TARGET`, overwriting if present. These are the only paths the guardrail layer owns.

```sh
SOURCE=/path/to/ema-eds-guardrail   # the master clone
TARGET=/path/to/target-repo         # the fresh target clone

# 1. Skills library (entire folder, includes README index + svg-assets converter)
mkdir -p "$TARGET/skills"          && cp -R "$SOURCE/skills/."          "$TARGET/skills/"

# 2. Deterministic checkers
mkdir -p "$TARGET/tools/quality"   && cp -R "$SOURCE/tools/quality/."   "$TARGET/tools/quality/"

# 3. Accessibility test suite (all modes: single / sweep / nav-states + reporter)
mkdir -p "$TARGET/tests/a11y"      && cp -R "$SOURCE/tests/a11y/."      "$TARGET/tests/a11y/"

# 4. CI workflow (a11y on every PR)
mkdir -p "$TARGET/.github/workflows" && cp "$SOURCE/.github/workflows/a11y.yml" "$TARGET/.github/workflows/"

# 5. The two overwrite files (supersets of the boilerplate on a fresh project)
cp "$SOURCE/AGENTS.md"    "$TARGET/AGENTS.md"
cp "$SOURCE/CLAUDE.md"    "$TARGET/CLAUDE.md"
cp "$SOURCE/package.json" "$TARGET/package.json"

# 6. Native skill discovery
mkdir -p "$TARGET/.claude" && ln -sf ../skills "$TARGET/.claude/skills"
```

**Do NOT copy** (these are project content or master-repo meta, not the guardrail layer):
`content/`, `blocks/`, `styles/`, `icons/`, `fonts/`, `reference/`, `templates/`, `.migration/`, `PROJECT-*.md`, `favicon.ico`, and any `instructions-copy-edsguardrail.md` / `README.md` describing the master itself.

---

## Step 3 — Adapt the one per-project value (agent)

- `tests/a11y/a11y.config.js` → set `urls[]` to the TARGET's real pages (one per unique page/template). Inspect the target's `content/` or sitemap. If only a homepage exists, leave `['/']` and note it. *A page not listed is never swept.*

Everything else is generic and needs no change.

---

## Step 4 — Validate before commit (agent)

Run from `TARGET`:
```sh
node -e "require('./package.json')"                  # valid JSON
node --check tools/quality/breakpoint-check.mjs
node --check tools/quality/svg-size-check.mjs
node tools/quality/breakpoint-check.mjs              # passes, or lists real violations
node tools/quality/svg-size-check.mjs                # passes
```
Also confirm: every folder under `skills/` has a `SKILL.md` and a row in `skills/README.md`, and `AGENTS.md` has exactly one `## Rules (non-negotiable)` section.

Report each result honestly. A checker listing violations in the target's *existing* CSS is expected — flag them; don't fix silently.

---

## Step 5 — Hand off to human (git — agent does NOT run git)

Tell the human:
1. **Review the diff** — especially `AGENTS.md` and `package.json` (the two overwrites). Confirm nothing custom was lost.
2. `npm install` (pulls a11y deps + Chromium via postinstall).
3. Optional local verify: `npm run lint`, `node tools/quality/breakpoint-check.mjs`, and with `npx aem up` running, `npm run test:a11y http://localhost:3000/`.
4. Commit + push the branch. Suggested message:
   `Add EDS quality-guardrail layer: AGENTS.md rules, skills, breakpoint + a11y + svg checkers`
5. Open the PR → the `a11y.yml` workflow runs automatically.
6. **One-time repo setting:** Settings → Branches → protect `main` → require the `a11y` check to pass before merging (this is what makes CI *block* a bad merge; it is not a file).

---

## What gets copied (quick reference)

| Copied verbatim (blind) | Adapt | Never copied | Human-only |
|---|---|---|---|
| `skills/`, `tools/quality/`, `tests/a11y/`, `.github/workflows/a11y.yml`, `AGENTS.md`, `CLAUDE.md`, `package.json`, `.claude/skills` symlink | `tests/a11y/a11y.config.js` `urls[]` | `content/`, `blocks/`, `styles/`, project assets, `PROJECT-*.md`, the master's own README/runbook | `npm install`, commit/push, branch protection |

---

## Maintaining the master

All guardrail improvements land in [`meejain/ema-eds-guardrail`](https://github.com/meejain/ema-eds-guardrail) first — never hand-edit a generic skill/checker in a downstream project. Downstream repos re-run this runbook (blind copy) to pull the latest. Keep the master a **superset of stock aem-boilerplate** so blind copy stays safe on fresh clones.
