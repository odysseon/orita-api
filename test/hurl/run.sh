#!/usr/bin/env bash
# =============================================================================
# run.sh — root test runner
# Runs all hurl suites in dependency order, sharing auth tokens across suites.
#
# Usage:
#   ./test/hurl/run.sh
#   TEST_SUITE=review ./test/hurl/run.sh   # run one suite only
#
# Required env (or via test/hurl/.env):
#   HURL_api_url          e.g. http://localhost
#   HURL_owner_email
#   HURL_owner_password
#   HURL_reviewer_email
#   HURL_reviewer_password
#   HURL_intruder_email
#   HURL_intruder_password
#
# Optional:
#   HURL_admin_token      Pre-set if your DB has an admin user (for category tests)
#   TEST_RUN_ID           Override the run ID (default: unix timestamp)
# =============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORTS_DIR="$ROOT/reports"

export HURL_fixtures_dir="$ROOT/fixtures"

command -v hurl &>/dev/null || { echo "❌ hurl not installed. See https://hurl.dev"; exit 1; }
command -v jq   &>/dev/null || { echo "❌ jq not installed. See https://jqlang.org";  exit 1; }

# Load .env if present
if [[ -f "$ROOT/.env" ]]; then
    set -a; source "$ROOT/.env"; set +a
    echo "✅ Loaded $ROOT/.env"
fi

# Validate required variables
: "${HURL_api_url:?Need to set HURL_api_url}"
: "${HURL_owner_email:?Need to set HURL_owner_email}"
: "${HURL_owner_password:?Need to set HURL_owner_password}"
: "${HURL_reviewer_email:?Need to set HURL_reviewer_email}"
: "${HURL_reviewer_password:?Need to set HURL_reviewer_password}"
: "${HURL_intruder_email:?Need to set HURL_intruder_email}"
: "${HURL_intruder_password:?Need to set HURL_intruder_password}"

rm -rf "$REPORTS_DIR"
mkdir -p "$REPORTS_DIR/html"

export HURL_run_id="${TEST_RUN_ID:-$(date +%s)}"

REPORT_FLAGS=(
    --report-html  "$REPORTS_DIR/html"
    --report-junit "$REPORTS_DIR/junit.xml"
    --file-root    "/"
    --verbose
)

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║         Orita API — Hurl Test Suite      ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  🌐 API URL:     $HURL_api_url"
echo "  🏷️  Run ID:      $HURL_run_id"
echo "  📁 Fixtures:    $HURL_fixtures_dir"
echo "  📁 Reports:     $REPORTS_DIR"
echo ""

# ---------------------------------------------------------------------------
# Helper: run a single hurl file with consistent flags
# ---------------------------------------------------------------------------
run_test() {
    local label=$1
    local file=$2
    echo "  ▶ $label"
    hurl --test --color "${REPORT_FLAGS[@]}" "$file" || {
        echo ""
        echo "  ❌ FAILED: $label"
        echo "  📄 File:   $file"
        if [[ "${CI:-}" != "true" ]]; then
            command -v xdg-open &>/dev/null && xdg-open "$REPORTS_DIR/html/index.html" &
            command -v open     &>/dev/null && open     "$REPORTS_DIR/html/index.html" &
        fi
        exit 1
    }
}

run_test_with_json() {
    local label=$1
    local file=$2
    shift 2
    echo "  ▶ $label (json capture)"
    local json_output
    json_output=$(hurl --color "${REPORT_FLAGS[@]}" --json "$file") || {
        echo "  ❌ FAILED: $label"
        echo "  📄 File:   $file"
        exit 1
    }
    
    # Export all requested variables
    for var_name in "$@"; do
        local captured_val
        captured_val=$(echo "$json_output" | jq -r ".entries[].captures[]? | select(.name == \"$var_name\") | .value" | head -1)
        export "HURL_$var_name=$captured_val"
    done
    
    # Simple success message since we didn't use --test
    echo "  ✅ SUCCESS: $label"
}

# ---------------------------------------------------------------------------
# Phase 0: Register accounts (idempotent)
# ---------------------------------------------------------------------------
echo "── Phase 0: Account Setup ──────────────────"
run_test "Register accounts" "$ROOT/auth/00-register.hurl"

# ---------------------------------------------------------------------------
# Phase 1: Login — capture all tokens once for the entire run
# ---------------------------------------------------------------------------
echo ""
echo "── Phase 1: Login ──────────────────────────"
run_test_with_json "Login" "$ROOT/auth/01-login.hurl" "owner_token" "reviewer_token" "intruder_token"

[[ -z "$HURL_owner_token"    || "$HURL_owner_token"    == "null" ]] && { echo "❌ Failed to capture owner_token";    exit 1; }
[[ -z "$HURL_reviewer_token" || "$HURL_reviewer_token" == "null" ]] && { echo "❌ Failed to capture reviewer_token"; exit 1; }
[[ -z "$HURL_intruder_token" || "$HURL_intruder_token" == "null" ]] && { echo "❌ Failed to capture intruder_token"; exit 1; }

echo "  🔑 Tokens captured and exported (owner, reviewer, intruder)"

# ---------------------------------------------------------------------------
# Helper: should we run this suite?
# ---------------------------------------------------------------------------
SUITE_FILTER="${TEST_SUITE:-all}"
run_suite() { [[ "$SUITE_FILTER" == "all" || "$SUITE_FILTER" == "$1" ]]; }

# ---------------------------------------------------------------------------
# Phase 2: Auth Suite
# ---------------------------------------------------------------------------
if run_suite "auth"; then
    echo ""
    echo "── Suite: Auth ───────────────────────────────"
    run_test "AUTH 02 Identity" "$ROOT/auth/02-identity.hurl"
    run_test "AUTH 03 Interests" "$ROOT/auth/03-interests.hurl"
fi

# ---------------------------------------------------------------------------
# Phase 3: Business Profile Suite
# ---------------------------------------------------------------------------
if run_suite "business-profile"; then
    echo ""
    echo "── Suite: Business Profile ─────────────────"
    run_test "BP 02 Create"          "$ROOT/business-profile/02-create.hurl"
    run_test "BP 03 Update"          "$ROOT/business-profile/03-update.hurl"
    run_test "BP 04 Discover"        "$ROOT/business-profile/04-discover.hurl"
    run_test "BP 05 My Businesses"   "$ROOT/business-profile/05-my-businesses.hurl"
    run_test "BP 06 Delete"          "$ROOT/business-profile/06-delete.hurl"
    run_test "BP 07 Upload Branding" "$ROOT/business-profile/07-upload-branding.hurl"
fi

# ---------------------------------------------------------------------------
# Phase 3: Listing Suite
# ---------------------------------------------------------------------------
if run_suite "listing"; then
    echo ""
    echo "── Suite: Listing ──────────────────────────"
    run_test_with_json "LST 00 Setup"  "$ROOT/listing/00-setup.hurl" "biz_id"
    run_test_with_json "LST 01 Create" "$ROOT/listing/01-create.hurl" "listing_id" "listing_slug"
    run_test "LST 02 Update"      "$ROOT/listing/02-update.hurl"
    run_test "LST 03 Status"      "$ROOT/listing/03-status.hurl"
    run_test "LST 04 Discover"    "$ROOT/listing/04-discover.hurl"
    run_test "LST 05 My Listings" "$ROOT/listing/05-my-listings.hurl"
    run_test "LST 06 Media"       "$ROOT/listing/06-media.hurl"
    run_test "LST 07 Delete"      "$ROOT/listing/07-delete.hurl"
fi

# ---------------------------------------------------------------------------
# Phase 4: Review Suite
# ---------------------------------------------------------------------------
if run_suite "review"; then
    echo ""
    echo "── Suite: Review ───────────────────────────"
    run_test_with_json "REV 00 Setup"  "$ROOT/review/00-setup.hurl" "review_listing_id"
    run_test_with_json "REV 01 Create" "$ROOT/review/01-create.hurl" "review_id"
    run_test "REV 02 Update" "$ROOT/review/02-update.hurl"
    run_test "REV 03 List"   "$ROOT/review/03-list.hurl"
    run_test "REV 04 Media"  "$ROOT/review/04-media.hurl"
    run_test "REV 05 Delete" "$ROOT/review/05-delete.hurl"
fi

# ---------------------------------------------------------------------------
# Phase 5: Category Suite (requires admin token)
# ---------------------------------------------------------------------------
if run_suite "category"; then
    echo ""
    echo "── Suite: Category ─────────────────────────"
    if [[ -z "${HURL_admin_token:-}" ]]; then
        echo "  ⚠️  HURL_admin_token not set — skipping category suite."
        echo "     Grant ADMIN role to a user and export their token as HURL_admin_token."
    else
        run_test "CAT 01 Full" "$ROOT/category/01-full.hurl"
    fi
fi

# ---------------------------------------------------------------------------
# Phase 6: Tag Suite (requires admin token)
# ---------------------------------------------------------------------------
if run_suite "tag"; then
    echo ""
    echo "── Suite: Tag ──────────────────────────────"
    if [[ -z "${HURL_admin_token:-}" ]]; then
        echo "  ⚠️  HURL_admin_token not set — skipping tag suite."
    else
        run_test "TAG 01 Full" "$ROOT/tag/01-full.hurl"
    fi
fi

# ---------------------------------------------------------------------------
# Phase 7: Store Tour Suite (requires admin token)
# ---------------------------------------------------------------------------
if run_suite "store-tour"; then
    echo ""
    echo "── Suite: Store Tour ───────────────────────"
    if [[ -z "${HURL_admin_token:-}" ]]; then
        echo "  ⚠️  HURL_admin_token not set — skipping store tour suite."
    else
        run_test_with_json "TR 00 Setup" "$ROOT/store-tour/00-setup.hurl" "tour_biz_id"
        
        run_test "TR 01 Full"  "$ROOT/store-tour/01-full.hurl"
    fi
fi

# ---------------------------------------------------------------------------
# Phase 8: Opportunity Suite
# ---------------------------------------------------------------------------
if run_suite "opportunity"; then
    echo ""
    echo "── Suite: Opportunity ───────────────────────"
    # Grab a random location ID from the database for testing
    if [[ -f "$ROOT/.env" ]]; then
        source "$ROOT/.env"
    elif [[ -f "$ROOT/../.env" ]]; then
        source "$ROOT/../.env"
    fi
    # Use psql with connection string to get a valid location
    export HURL_location_id=$(psql "$DATABASE_URL" -t -c "SELECT id FROM locations LIMIT 1" | xargs)
    if [[ -z "$HURL_location_id" || "$HURL_location_id" == "null" ]]; then
        echo "⚠️ No location found in DB. Test might fail."
        export HURL_location_id="loc_test_1"
    fi
    
    run_test "OPP 00 Lifecycle"  "$ROOT/opportunity/00-lifecycle.hurl"
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║          ✅  All tests passed            ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  📊 HTML Report: $REPORTS_DIR/html/index.html"
echo "  📋 JUnit XML:   $REPORTS_DIR/junit.xml"
echo ""
