#!/usr/bin/env bash
# Preflight for agent 008 (enhancement reviewer): weekly improvement sweep signals.
# Writes digest to stdout or AGENT_008_CTX file; sets G008_* for pos-cursor-loop.sh gating.
#
# Usage: enhancement-reviewer-preflight.sh [digest_file]
# Env: POS_REPO_ROOT, AGENT_008_STATE (override state json path), ENHANCEMENT_PREFLIGHT_READONLY=1 (no stamp),
#      ENHANCEMENT_STAMP_KEEP_LINES (default 100; see rotate-008-time-of-last-review.sh),
#      ENHANCEMENT_STAMP_ROTATE=0 to skip stamp rotation

set -euo pipefail

ROOT="${POS_REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
TASKDIR="${ROOT}/agents2/tasks"
STATE_DIR="${ROOT}/agents2/008-enhancement-reviewer"
STATE_FILE="${AGENT_008_STATE:-${STATE_DIR}/last-scan.json}"
STAMP_FILE="${STATE_DIR}/time-of-last-review.txt"
ROTATE_SCRIPT="${ROOT}/scripts/rotate-008-time-of-last-review.sh"
CTX="${1:-}"

G008_OK=1
G008_DAYS_SINCE_LAST_REVIEW=999
G008_WEEKLY_DUE=0
G008_DOC_DRIFT=0
G008_TASK_SIGNALS=0
G008_DEMO_SIGNALS=0
G008_SIGNALS=0
G008_NEW_BACKLOG_PAUSE=0
# Pause 008 task creation when root NEW-* depth exceeds this (override with ENHANCEMENT_NEW_BACKLOG_MAX).
NEW_BACKLOG_MAX="${ENHANCEMENT_NEW_BACKLOG_MAX:-20}"

emit() {
  if [[ -n "$CTX" ]]; then
    echo "$*" >>"$CTX"
  else
    echo "$*"
  fi
}

days_between_iso() {
  local iso="$1"
  [[ -n "$iso" ]] || { echo 999; return; }
  python3 - "$iso" <<'PY'
import sys
from datetime import datetime, timezone
raw = sys.argv[1].strip()
for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S"):
    try:
        dt = datetime.strptime(raw[:19].replace("T", " " if " " in fmt else "T"), fmt.replace("T", " " if " " in fmt else "T"))
        if "Z" in raw or fmt.endswith("Z"):
            dt = dt.replace(tzinfo=timezone.utc)
        delta = datetime.now(timezone.utc) - dt.astimezone(timezone.utc)
        print(max(0, delta.days))
        sys.exit(0)
    except ValueError:
        pass
print(999)
PY
}

last_review_iso() {
  # Stamp file is append-only (then rotated). Prefer the latest agent summary
  # line (| FEAT: / | NEW:); otherwise the latest ISO timestamp on any line.
  [[ -f "$STAMP_FILE" ]] || return 0
  local iso=""
  iso=$(grep -E '\| FEAT:|\| NEW:' "$STAMP_FILE" 2>/dev/null \
    | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z' \
    | tail -1 || true)
  if [[ -z "$iso" ]]; then
    iso=$(grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z' "$STAMP_FILE" 2>/dev/null \
      | tail -1 || true)
  fi
  printf '%s' "$iso"
}

count_root_tasks() {
  local prefix="$1"
  shopt -s nullglob
  local n=0 f
  for f in "$TASKDIR"/${prefix}*.md; do
    ((n++)) || true
  done
  shopt -u nullglob
  echo "$n"
}

# Newest CHANGELOG version section date (YYYY-MM-DD), or empty.
newest_changelog_version_date() {
  awk '
    /^## \[[0-9]+\.[0-9]+\.[0-9]+\] - [0-9]{4}-[0-9]{2}-[0-9]{2}/ {
      if (match($0, /[0-9]{4}-[0-9]{2}-[0-9]{2}/)) {
        print substr($0, RSTART, RLENGTH)
        exit
      }
    }
  ' CHANGELOG.md 2>/dev/null || true
}

# Calendar days (UTC) since YYYY-MM-DD; 999 if unparseable.
days_since_ymd() {
  local ymd="$1"
  [[ -n "$ymd" ]] || { echo 999; return; }
  python3 - "$ymd" <<'PY'
import sys
from datetime import datetime, timezone, date
raw = sys.argv[1].strip()[:10]
try:
    d = date.fromisoformat(raw)
except ValueError:
    print(999)
    raise SystemExit(0)
today = datetime.now(timezone.utc).date()
print(max(0, (today - d).days))
PY
}

# Hours since CHANGELOG.md git last-touch (or mtime); 99999 if unknown.
changelog_touch_age_hours() {
  python3 - <<'PY'
import subprocess, os
from datetime import datetime, timezone
ts = None
try:
    out = subprocess.check_output(
        ["git", "log", "-1", "--format=%cI", "--", "CHANGELOG.md"],
        stderr=subprocess.DEVNULL,
        text=True,
    ).strip()
    if out:
        ts = datetime.fromisoformat(out.replace("Z", "+00:00"))
except Exception:
    pass
if ts is None and os.path.isfile("CHANGELOG.md"):
    ts = datetime.fromtimestamp(os.path.getmtime("CHANGELOG.md"), timezone.utc)
if ts is None:
    print(99999)
else:
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    hours = (datetime.now(timezone.utc) - ts.astimezone(timezone.utc)).total_seconds() / 3600.0
    print(int(max(0, hours)))
PY
}

# True (0) when changelog_sparse should be suppressed after a recent version cut.
# - Newest ## [N.N.N] - YYYY-MM-DD within last 2 calendar days (UTC), or
# - CHANGELOG git/mtime touch within 48h and Unreleased has 0 bullets.
changelog_sparse_fresh_cut() {
  local unreleased_lines="${1:-0}"
  local version_date days age_h
  version_date="$(newest_changelog_version_date)"
  days="$(days_since_ymd "$version_date")"
  if (( days <= 2 )); then
    return 0
  fi
  if (( unreleased_lines == 0 )); then
    age_h="$(changelog_touch_age_hours)"
    if (( age_h <= 48 )); then
      return 0
    fi
  fi
  return 1
}

# Count back/ + front/src/ commits strictly after YYYY-MM-DD (UTC day boundary:
# since the next calendar day 00:00). Empty/unparseable date → 0.
code_commits_after_version_date() {
  local version_date="$1"
  local since n
  [[ -n "$version_date" ]] || { echo 0; return; }
  if ! git rev-parse HEAD >/dev/null 2>&1; then
    echo 0
    return
  fi
  since=$(python3 - "$version_date" <<'PY'
import sys
from datetime import date, timedelta
raw = sys.argv[1].strip()[:10]
try:
    d = date.fromisoformat(raw)
except ValueError:
    print("")
    raise SystemExit(0)
print((d + timedelta(days=1)).isoformat())
PY
)
  [[ -n "$since" ]] || { echo 0; return; }
  n=$(git log --since="${since}" --oneline -- back/ front/src/ 2>/dev/null | wc -l | tr -d ' ')
  echo "${n:-0}"
}

# First open root task that owns a stale docs/*.md stem (task basename), or empty.
# stem = file basename without .md (e.g. 0026-haproxy-ssl-amvara9, PRINTING).
# Match: filename contains stem, or body mentions docs/<stem> / <stem>.md (case-insensitive).
# Excludes this preflight meta-task so it never owns the SIGNAL it is fixing.
open_stale_doc_owner() {
  local stem="$1"
  local f base
  [[ -n "$stem" ]] || return 1
  shopt -s nullglob
  for f in "$TASKDIR"/NEW-*.md "$TASKDIR"/FEAT-*.md "$TASKDIR"/WIP-*.md \
    "$TASKDIR"/UNTESTED-*.md "$TASKDIR"/TESTING-*.md; do
    [[ -f "$f" ]] || continue
    base=$(basename "$f")
    case "$base" in
      *preflight-skip-queued-stale-docs*) continue ;;
    esac
    if printf '%s' "$base" | grep -qiF -- "$stem"; then
      echo "$base"
      shopt -u nullglob
      return 0
    fi
    # Prefer path/basename forms so casual "PRINTING" / "0014" mentions do not own the SIGNAL.
    if grep -qiF -- "docs/${stem}" "$f" 2>/dev/null \
      || grep -qiF -- "${stem}.md" "$f" 2>/dev/null; then
      echo "$base"
      shopt -u nullglob
      return 0
    fi
  done
  shopt -u nullglob
  return 1
}

# First open root task that owns demo-table repair (basename), or empty.
# Matches filename/body markers from 008 (check_demo_tables|seed_demo_tables|repair-demo-tables).
# Excludes this preflight meta-task; ignores doc-only body cites without a repair/demo-tables slug.
open_demo_tables_repair_owner() {
  local f base
  shopt -s nullglob
  for f in "$TASKDIR"/NEW-*.md "$TASKDIR"/FEAT-*.md "$TASKDIR"/WIP-*.md \
    "$TASKDIR"/UNTESTED-*.md "$TASKDIR"/TESTING-*.md; do
    [[ -f "$f" ]] || continue
    base=$(basename "$f")
    case "$base" in
      *preflight-skip-demo-tables*) continue ;;
    esac
    case "$base" in
      *repair-demo-tables* | *repair_demo_tables* | *missing-tables*)
        echo "$base"
        shopt -u nullglob
        return 0
        ;;
    esac
    if [[ "$base" == *check_demo_tables* || "$base" == *seed_demo_tables* || "$base" == *repair-demo-tables* ]]; then
      echo "$base"
      shopt -u nullglob
      return 0
    fi
    case "$base" in
      *demo-table* | *demo_table* | *seed-demo-table* | *check-demo-table*)
        if grep -qE 'check_demo_tables|seed_demo_tables|repair-demo-tables' "$f" 2>/dev/null; then
          echo "$base"
          shopt -u nullglob
          return 0
        fi
        ;;
    esac
  done
  shopt -u nullglob
  return 1
}

# First open root task that owns a demo soft-check repair (products / delivery), or empty.
# $1 = meta basename substring to exclude (never owns its own SIGNAL)
# $2 = ERE matched against basename for direct ownership
# $3 = ERE for body when basename already looks demo-related ($4)
# $4 = optional basename ERE gate before body grep (default: always try body if $2 missed)
open_demo_soft_check_owner() {
  local meta_excl="$1"
  local base_re="$2"
  local body_re="$3"
  local slug_re="${4:-.}"
  local f base
  shopt -s nullglob
  for f in "$TASKDIR"/NEW-*.md "$TASKDIR"/FEAT-*.md "$TASKDIR"/WIP-*.md \
    "$TASKDIR"/UNTESTED-*.md "$TASKDIR"/TESTING-*.md; do
    [[ -f "$f" ]] || continue
    base=$(basename "$f")
    case "$base" in
      *"${meta_excl}"*) continue ;;
    esac
    if printf '%s' "$base" | grep -qE -- "$base_re"; then
      echo "$base"
      shopt -u nullglob
      return 0
    fi
    if printf '%s' "$base" | grep -qE -- "$slug_re"; then
      if grep -qE -- "$body_re" "$f" 2>/dev/null; then
        echo "$base"
        shopt -u nullglob
        return 0
      fi
    fi
  done
  shopt -u nullglob
  return 1
}

open_demo_products_repair_owner() {
  open_demo_soft_check_owner \
    "preflight-wire-demo-products" \
    'repair-demo-products|repair_demo_products|missing-products|check_demo_products|seed_demo_products|check-demo-products|seed-demo-products' \
    'check_demo_products|seed_demo_products|repair-demo-products' \
    'demo-product|demo_product|seed-demo-product|check-demo-product'
}

open_demo_delivery_orders_repair_owner() {
  open_demo_soft_check_owner \
    "preflight-wire-demo-products" \
    'repair-demo-delivery-orders|missing-delivery-orders|check_demo_delivery_orders|check-demo-delivery-orders|seed-demo-delivery-order|seed_demo_delivery' \
    'check_demo_delivery_orders|seed_demo_orders|repair-demo-delivery' \
    'demo-delivery|demo_delivery|delivery-order|delivery_order|satisfecho.delivery'
}

open_demo_delivery_settings_repair_owner() {
  open_demo_soft_check_owner \
    "preflight-wire-demo-products" \
    'repair-demo-delivery-settings|missing-delivery-settings|check_demo_delivery_settings|check-demo-delivery-settings|seed_demo_delivery_settings|seed-demo-delivery-settings|delivery-zone|delivery-fee' \
    'check_demo_delivery_settings|seed_demo_delivery_settings|repair-demo-delivery-settings' \
    'demo-delivery|demo_delivery|delivery-setting|delivery_setting|delivery-zone|delivery-fee'
}

mkdir -p "$STATE_DIR"
[[ -f "$STATE_FILE" ]] || echo '{"last_run":null,"findings":[]}' >"$STATE_FILE"

# Cap stamp growth: archive older lines before cadence / append (idempotent under keep cap).
if [[ -f "$ROTATE_SCRIPT" ]]; then
  POS_REPO_ROOT="$ROOT" bash "$ROTATE_SCRIPT" >&2 || true
fi

utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)
if [[ -n "$CTX" ]]; then
  : >"$CTX"
fi

emit "pos-agent-loop 008 enhancement-reviewer preflight — ${utc} (UTC)"
emit "repo: ${ROOT}  tasks: ${TASKDIR}  state: ${STATE_FILE}"
emit ""

last_iso="$(last_review_iso)"
G008_DAYS_SINCE_LAST_REVIEW=$(days_between_iso "$last_iso")
(( G008_DAYS_SINCE_LAST_REVIEW >= 7 )) && G008_WEEKLY_DUE=1

emit "=== Review cadence ==="
emit "last_review_iso=${last_iso:-never}"
emit "days_since_last_review=${G008_DAYS_SINCE_LAST_REVIEW}"
emit "weekly_due=$([[ $G008_WEEKLY_DUE -eq 1 ]] && echo yes || echo no)"
emit ""

emit "=== Task queue (agents2/tasks/) ==="
new_n=$(count_root_tasks "NEW-")
feat_n=$(count_root_tasks "FEAT-")
wip_n=$(count_root_tasks "WIP-")
untested_n=$(count_root_tasks "UNTESTED-")
testing_n=$(count_root_tasks "TESTING-")
closed_n=$(count_root_tasks "CLOSED-")
emit "NEW=${new_n} FEAT=${feat_n} WIP=${wip_n} UNTESTED=${untested_n} TESTING=${testing_n} CLOSED=${closed_n}"
# Soft hint when NEW is elevated but still at/under the pause threshold (no SIGNAL).
if (( new_n > 0 && new_n <= NEW_BACKLOG_MAX )); then
  emit "hint new_queue NEW=${new_n} (prefer drain NEW before more FEAT/doc tasks; SIGNAL/PAUSE at >${NEW_BACKLOG_MAX})"
fi
# Deep NEW pile: SIGNAL (wakes digest counters) + PAUSE (008 creates 0 tasks until drain).
# Threshold override: ENHANCEMENT_NEW_BACKLOG_MAX (default 20).
if (( new_n > NEW_BACKLOG_MAX )); then
  G008_TASK_SIGNALS=$((G008_TASK_SIGNALS + 1))
  G008_NEW_BACKLOG_PAUSE=1
  emit "SIGNAL task_backlog new=${new_n} (prefer drain NEW before more FEAT/doc tasks)"
  emit "PAUSE new_backlog NEW=${new_n} (threshold=${NEW_BACKLOG_MAX}; create 0 NEW/FEAT until drain — main coder 002)"
fi
if (( wip_n + testing_n > 8 )); then
  G008_TASK_SIGNALS=$((G008_TASK_SIGNALS + 1))
  emit "SIGNAL task_backlog wip+testing=${wip_n}+${testing_n} (consider pausing new FEAT until drain)"
fi
emit ""

emit "=== Docs / changelog drift (heuristic) ==="
cd "$ROOT"
code_commits_14d=0
if git rev-parse HEAD >/dev/null 2>&1; then
  code_commits_14d=$(git log --since="14 days ago" --oneline -- back/ front/src/ 2>/dev/null | wc -l | tr -d ' ')
fi
emit "code_commits_last_14d(back+front/src)=${code_commits_14d}"

changelog_touch=""
if [[ -f CHANGELOG.md ]]; then
  changelog_touch=$(git log -1 --format=%ci -- CHANGELOG.md 2>/dev/null | head -1 || stat -f %Sm -t "%Y-%m-%d" CHANGELOG.md 2>/dev/null || true)
  if grep -q '^\[Unreleased\]' CHANGELOG.md 2>/dev/null || grep -q '## \[Unreleased\]' CHANGELOG.md 2>/dev/null; then
    unreleased_lines=$(awk '/^## \[Unreleased\]/{f=1;next} /^## \[[0-9]/{f=0} f && /^- /{c++} END{print c+0}' CHANGELOG.md)
    newest_ver_date="$(newest_changelog_version_date)"
    emit "changelog_unreleased_bullets=${unreleased_lines:-0} changelog_last_touch=${changelog_touch:-unknown}"
    emit "changelog_newest_version_date=${newest_ver_date:-unknown}"
    if (( code_commits_14d > 5 && unreleased_lines < 2 )); then
      post_cut_commits="$(code_commits_after_version_date "$newest_ver_date")"
      if changelog_sparse_fresh_cut "$unreleased_lines"; then
        emit "changelog_sparse=suppressed (recent version cut; newest=${newest_ver_date:-unknown}, unreleased=${unreleased_lines})"
      elif (( post_cut_commits == 0 )); then
        emit "changelog_sparse=suppressed (no commits after version date; newest=${newest_ver_date:-unknown}, unreleased=${unreleased_lines})"
      else
        G008_DOC_DRIFT=$((G008_DOC_DRIFT + 1))
        emit "SIGNAL changelog_sparse Unreleased may lag recent code (${code_commits_14d} commits, ${unreleased_lines} bullets, ${post_cut_commits} after ${newest_ver_date:-unknown})"
      fi
    fi
  fi
fi

stale_docs=0
stale_docs_owned=0
if [[ -d docs ]]; then
  while IFS= read -r doc; do
    [[ -f "$doc" ]] || continue
    doc_age_days=$(python3 - "$doc" <<'PY'
import os, sys, time
from datetime import datetime, timezone
path = sys.argv[1]
mtime = os.path.getmtime(path)
delta = datetime.now(timezone.utc) - datetime.fromtimestamp(mtime, timezone.utc)
print(delta.days)
PY
)
    if (( doc_age_days > 90 && code_commits_14d > 3 )); then
      stem=$(basename "$doc" .md)
      owner="$(open_stale_doc_owner "$stem" || true)"
      if [[ -n "$owner" ]]; then
        stale_docs_owned=$((stale_docs_owned + 1))
        emit "stale_doc path=${doc} age_days=${doc_age_days} (owned by open task ${owner})"
      else
        stale_docs=$((stale_docs + 1))
        emit "stale_doc path=${doc} age_days=${doc_age_days}"
      fi
    fi
  done < <(find docs -maxdepth 1 -name '*.md' -type f 2>/dev/null | head -20)
  if (( stale_docs_owned > 0 )); then
    emit "docs_stale_owned count=${stale_docs_owned} (open tasks already cover these basenames; not SIGNAL)"
  fi
  if (( stale_docs > 0 )); then
    G008_DOC_DRIFT=$((G008_DOC_DRIFT + stale_docs))
    emit "SIGNAL docs_stale count=${stale_docs} (docs/*.md untouched >90d while code moved)"
  fi
fi
emit ""

emit "=== Demo tenant 1 (seeds) ==="
emit "reset_script=scripts/reset-demo-data-on-server.sh"
emit "seed_module=back/app/seeds/reset_demo_data.py (idempotent orders+reservations reset)"
emit "check_tables=back/app/seeds/check_demo_tables.py"
emit "check_waiting_list=back/app/seeds/check_demo_waiting_list.py"
emit "check_products=back/app/seeds/check_demo_products.py"
emit "check_delivery_orders=back/app/seeds/check_demo_delivery_orders.py"
emit "check_delivery_settings=back/app/seeds/check_demo_delivery_settings.py"
if [[ -x "${ROOT}/scripts/reset-demo-data-on-server.sh" ]]; then
  if grep -qR '0 4 \* \* \*.*reset-demo-data-on-server\.sh' "${ROOT}/docs" 2>/dev/null; then
    emit "demo_daily_reset=documented (docs mention 04:00 UTC cron + reset-demo-data-on-server.sh)"
  else
    G008_DEMO_SIGNALS=1
    emit "SIGNAL demo_daily_reset_not_scheduled Existing reset path is manual/cron-only — consider FEAT for amvara9 cron"
  fi
else
  emit "demo_reset_script=not_executable (chmod +x scripts/reset-demo-data-on-server.sh)"
fi
if command -v docker >/dev/null 2>&1; then
  if docker compose -f "${ROOT}/docker-compose.yml" -f "${ROOT}/docker-compose.dev.yml" ps -q back 2>/dev/null | grep -q .; then
    if docker compose -f "${ROOT}/docker-compose.yml" -f "${ROOT}/docker-compose.dev.yml" exec -T back python -m app.seeds.check_demo_tables 2>/dev/null; then
      emit "demo_tables_check=ok"
    else
      demo_tables_owner="$(open_demo_tables_repair_owner || true)"
      if [[ -n "$demo_tables_owner" ]]; then
        emit "demo_tables_check=fail (owned by open task ${demo_tables_owner})"
      else
        G008_DEMO_SIGNALS=$((G008_DEMO_SIGNALS + 1))
        emit "SIGNAL demo_tables_check=fail (run seed_demo_tables)"
      fi
    fi
    if docker compose -f "${ROOT}/docker-compose.yml" -f "${ROOT}/docker-compose.dev.yml" exec -T back python -m app.seeds.check_demo_waiting_list 2>/dev/null; then
      emit "demo_waiting_list_check=ok"
    else
      G008_DEMO_SIGNALS=$((G008_DEMO_SIGNALS + 1))
      emit "SIGNAL demo_waiting_list_check=fail (run seed_demo_waiting_list or reset_demo_data)"
    fi
    if docker compose -f "${ROOT}/docker-compose.yml" -f "${ROOT}/docker-compose.dev.yml" exec -T back python -m app.seeds.check_demo_products 2>/dev/null; then
      emit "demo_products_check=ok"
    else
      demo_products_owner="$(open_demo_products_repair_owner || true)"
      if [[ -n "$demo_products_owner" ]]; then
        emit "demo_products_check=fail (owned by open task ${demo_products_owner})"
      else
        G008_DEMO_SIGNALS=$((G008_DEMO_SIGNALS + 1))
        emit "SIGNAL demo_products_check=fail (run seed_demo_products)"
      fi
    fi
    if docker compose -f "${ROOT}/docker-compose.yml" -f "${ROOT}/docker-compose.dev.yml" exec -T back python -m app.seeds.check_demo_delivery_orders 2>/dev/null; then
      emit "demo_delivery_orders_check=ok"
    else
      demo_delivery_orders_owner="$(open_demo_delivery_orders_repair_owner || true)"
      if [[ -n "$demo_delivery_orders_owner" ]]; then
        emit "demo_delivery_orders_check=fail (owned by open task ${demo_delivery_orders_owner})"
      else
        G008_DEMO_SIGNALS=$((G008_DEMO_SIGNALS + 1))
        emit "SIGNAL demo_delivery_orders_check=fail (run seed_demo_orders or reset_demo_data)"
      fi
    fi
    if docker compose -f "${ROOT}/docker-compose.yml" -f "${ROOT}/docker-compose.dev.yml" exec -T back python -m app.seeds.check_demo_delivery_settings 2>/dev/null; then
      emit "demo_delivery_settings_check=ok"
    else
      demo_delivery_settings_owner="$(open_demo_delivery_settings_repair_owner || true)"
      if [[ -n "$demo_delivery_settings_owner" ]]; then
        emit "demo_delivery_settings_check=fail (owned by open task ${demo_delivery_settings_owner})"
      else
        G008_DEMO_SIGNALS=$((G008_DEMO_SIGNALS + 1))
        emit "SIGNAL demo_delivery_settings_check=fail (run seed_demo_delivery_settings)"
      fi
    fi
  else
    emit "demo_tables_check=skipped (back container not running)"
    emit "demo_waiting_list_check=skipped (back container not running)"
    emit "demo_products_check=skipped (back container not running)"
    emit "demo_delivery_orders_check=skipped (back container not running)"
    emit "demo_delivery_settings_check=skipped (back container not running)"
  fi
else
  emit "demo_tables_check=skipped (docker not on PATH)"
  emit "demo_waiting_list_check=skipped (docker not on PATH)"
  emit "demo_products_check=skipped (docker not on PATH)"
  emit "demo_delivery_orders_check=skipped (docker not on PATH)"
  emit "demo_delivery_settings_check=skipped (docker not on PATH)"
fi
emit ""

emit "=== Summary ==="
G008_SIGNALS=$((G008_WEEKLY_DUE + G008_DOC_DRIFT + G008_TASK_SIGNALS + G008_DEMO_SIGNALS))
emit "G008_OK=${G008_OK}"
emit "G008_DAYS_SINCE_LAST_REVIEW=${G008_DAYS_SINCE_LAST_REVIEW}"
emit "G008_WEEKLY_DUE=${G008_WEEKLY_DUE}"
emit "G008_DOC_DRIFT=${G008_DOC_DRIFT}"
emit "G008_TASK_SIGNALS=${G008_TASK_SIGNALS}"
emit "G008_DEMO_SIGNALS=${G008_DEMO_SIGNALS}"
emit "G008_NEW_BACKLOG_PAUSE=${G008_NEW_BACKLOG_PAUSE}"
emit "G008_SIGNALS=${G008_SIGNALS}"
emit "cursor_agent_when: (not paused) AND (G008_WEEKLY_DUE=1 OR G008_DOC_DRIFT>0 OR G008_TASK_SIGNALS>0 OR G008_DEMO_SIGNALS>0 OR AGENT_ENHANCEMENT_REVIEWER_ALWAYS=1)"
emit "pause_when: NEW > ${NEW_BACKLOG_MAX} (ENHANCEMENT_NEW_BACKLOG_MAX); create 0 tasks until drain"

if [[ "${ENHANCEMENT_PREFLIGHT_READONLY:-0}" != "1" ]]; then
  printf '%s UTC | 008 preflight | days=%s weekly_due=%s signals=%s doc_drift=%s demo=%s\n\n' \
    "$utc" "$G008_DAYS_SINCE_LAST_REVIEW" "$G008_WEEKLY_DUE" "$G008_SIGNALS" "$G008_DOC_DRIFT" "$G008_DEMO_SIGNALS" >>"$STAMP_FILE"
  python3 - "$STATE_FILE" "$utc" "$G008_SIGNALS" <<'PY'
import json, os, sys
path, utc, signals = sys.argv[1:4]
data = {"last_run": None, "findings": []}
if os.path.isfile(path):
    with open(path) as f:
        data = json.load(f)
data["last_run"] = utc
data["last_signals"] = int(signals)
os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, "w") as f:
    json.dump(data, f, indent=2, sort_keys=True)
    f.write("\n")
PY
fi
