---
## Closing summary (TOP)

- **What happened:** Root `ROADMAP.md` still framed shipped work through 2026-07-31 while Aug–Sep slices were already live.
- **What was done:** Refreshed Shipped through 2026-09-14 with Aug–Sep themes (QR cart/history, `/features`, manual, stock alerts, pricing QR Menu, floating CTA, and related rows). Left `docs/0032-github-issues-roadmap.md` unchanged.
- **What was tested:** Docs checks for Shipped date, theme coverage, and no old 2026-07-31 cutoff — overall **PASS**.
- **Why closed:** All tester criteria passed.
- **Closed at (UTC):** 2026-09-14 16:36
---
# Update ROADMAP for Aug–Sep 2026 shipped work

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Status

- **WIP → UNTESTED:** ROADMAP Shipped refreshed through **2026-09-14** from CHANGELOG **2.1.149–2.1.162** and `agents2/tasks/done/2026/08/` CLOSED tasks.
- **`docs/0032-github-issues-roadmap.md`:** No edit — #52–#54 rows already match shipped MVPs; Aug–Sep items are not umbrella contradictions.
- No product code. No GitHub issue comment (issue **0**).

## Problem / goal

Root **`ROADMAP.md`** still frames shipped work as “through **2026-07-31**”. Many user-visible slices landed in **Aug–Sep 2026** (CHANGELOG **2.1.153–2.1.161** and closed tasks). Contributors reading ROADMAP miss shared QR cart, session-scoped order history, `/features`, user manual, stock alerts, platform login counts, pricing QR Menu tier, and floating delivery/QR CTA. The file’s own weekly checklist asks for this refresh; last substantive roadmap pass was **#341** (2026-08-01).

## Evidence (008 preflight / review)

- Digest 2026-09-14: `weekly_due=yes` (16 days since last 008 review); `G008_NEW_BACKLOG_PAUSE=0`; NEW=0 FEAT=4; demo checks ok; no `PAUSE new_backlog`
- `ROADMAP.md` mtime ~2026-08-09; Shipped intro still says through 2026-07-31
- `rg` on ROADMAP misses Aug keywords: shared cart / order history / stock alert / manual-usuario / login count / QR Menu free
- Evidence in CHANGELOG: **2.1.153–2.1.161**; closed tasks e.g. CLOSED-347…358, #349, #350, #360
- Do **not** duplicate open FEAT-360 / 373 / 376 / 377 (product bugs/features — not roadmap text)

## High-level instructions for coder

- Skim **`CHANGELOG.md`** from **2.1.153** through newest and recent **`agents2/tasks/done/2026/08/`** + **`09/`** CLOSED tasks
- Update **`ROADMAP.md`** Shipped (and In progress / Deferred only when evidence is clear): bump the “through …” date; add short rows/bullets with doc links for at least:
  - Public `/features` landings (#347 / #348)
  - Shared dine-in QR draft cart (#349) + session/customer order history (#350) — point at `docs/0008` / `docs/0009`
  - User manual `/manual-usuario` (#353 / #354)
  - README starter paths (#355) only if ROADMAP should mention onboarding docs
  - Platform owner/staff login counts (#315 / 2.1.156)
  - Product stock alerts (#356) + tenant ID in header (#357)
  - Public pricing QR Menu free / support tier (#358)
  - Floating order total + CTA (#360) under Delivery / guest ordering
- Align **`docs/0032-github-issues-roadmap.md`** only where a #52–#54 status contradicts shipped MVPs (do not invent umbrella status)
- Keep the weekly checklist; no bulk `docs/` rewrite; no product code
- Pass/fail: ROADMAP no longer claims shipped surface stops at 2026-07-31; `rg` hits the new Aug–Sep themes; CHANGELOG/closed-task evidence only

## What changed

- **`ROADMAP.md` Shipped:** Date through **2026-09-14**; new/updated rows for dine-in QR cart & history, delivery floating CTA, stock alerts, marketing `/features` + `/manual-usuario`, pricing QR Menu free + platform login counts, staff tenant ID, README starter paths, sticky guest header (shipped in 2.1.162).

## Testing instructions

1. Open root **`ROADMAP.md`**. Confirm Shipped intro says through **2026-09-14** (not **2026-07-31**).
2. From repo root, run:
   ```bash
   rg -n 'shared draft cart|order history|/features|manual-usuario|login counts|stock alert|QR Menu — free|floating order total|Tenant ID|Start with one feature' ROADMAP.md
   ```
   Expect hits for each theme.
3. Confirm `rg -n 'through \*\*2026-07-31\*\*' ROADMAP.md` returns no match.
4. Confirm **`docs/0032-github-issues-roadmap.md`** was not rewritten for this task (optional: skim #52–#54 table still coherent).
5. No app/runtime smoke required (docs-only).

## Test report

1. **Date/time (UTC):** 2026-09-14T16:35:21Z start → 2026-09-14T16:35:42Z end. Log window N/A (docs-only; no container checks).
2. **Environment:** Local git repo on branch `development` (synced via `./scripts/git-sync-development.sh`). No Docker / `BASE_URL` (docs-only).
3. **What was tested:** ROADMAP Shipped date and Aug–Sep theme coverage; absence of old `2026-07-31` shipped cutoff; `docs/0032-github-issues-roadmap.md` not rewritten for this task.
4. **Results:**
   - Shipped intro through **2026-09-14**: **PASS** — `ROADMAP.md` L26: “through **2026-09-14**”.
   - Theme coverage (instruction #2): **PASS** — hits for order history, `/features`, `manual-usuario`, login counts, stock alert, `QR Menu — free`, floating order total, Tenant ID, Start with one feature. Shared-cart theme present as “Shared live draft cart” (exact substring `shared draft cart` does not match; wording is equivalent).
   - No `through **2026-07-31**` in ROADMAP: **PASS** — `rg` returned no match.
   - `docs/0032-github-issues-roadmap.md` not rewritten: **PASS** — commit `609fb000` touched only `ROADMAP.md` + this task file; #52–#54 sections still present and coherent.
   - App/runtime smoke: **N/A** — docs-only per instructions.
5. **Overall:** **PASS**
6. **Product owner feedback:** ROADMAP now states shipped work through 2026-09-14 and lists the Aug–Sep product slices contributors need. No product code change. Issue **0** — no GitHub label/comment.
7. **URLs tested:** N/A — no browser
8. **Relevant log excerpts:** N/A — no container logs for docs-only verification.
