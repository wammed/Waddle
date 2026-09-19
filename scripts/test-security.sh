#!/usr/bin/env bash
set -eo pipefail

echo "🛡️  ============================================"
echo "🛡️  Waddle Security & Dependency Audit Suite"
echo "🛡️  ============================================"

FAILED=0
MISSING_TOOLS=0

# Helper function to check if a command exists
check_required_tool() {
  local tool_name="$1"
  local tool_cmd="$2"
  if ! eval "$tool_cmd" >/dev/null 2>&1; then
    echo "❌ ERROR: Required security tool '$tool_name' is missing or not executable." >&2
    MISSING_TOOLS=$((MISSING_TOOLS + 1))
    return 1
  fi
  return 0
}

# 1. Gitleaks Secret Detection
echo ""
echo "🔍 [1/4] Running Gitleaks repository secret scan..."
if check_required_tool "gitleaks" "command -v gitleaks"; then
  if gitleaks detect --config .gitleaks.toml --no-banner -v; then
    echo "✅ Gitleaks: 0 secrets leaked."
  else
    echo "❌ Gitleaks: Security secrets detected!" >&2
    FAILED=$((FAILED + 1))
  fi
else
  FAILED=$((FAILED + 1))
fi

# 2. Secretlint Static Code Audit
echo ""
echo "🔍 [2/4] Running Secretlint code audit..."
if check_required_tool "secretlint" "npx --no-install secretlint --version"; then
  if npx secretlint "**/*"; then
    echo "✅ Secretlint: 0 credentials leaked."
  else
    echo "❌ Secretlint: Credential audit failed!" >&2
    FAILED=$((FAILED + 1))
  fi
else
  FAILED=$((FAILED + 1))
fi

# 3. RustSec Cargo Audit
echo ""
echo "🔍 [3/4] Running Cargo Audit (RustSec RUSTSEC database)..."
if check_required_tool "cargo-audit" "command -v cargo-audit || cargo audit --version"; then
  if (cd src-tauri && cargo audit); then
    echo "✅ Cargo Audit: 0 vulnerabilities found."
  else
    echo "❌ Cargo Audit: Dependency vulnerabilities detected!" >&2
    FAILED=$((FAILED + 1))
  fi
else
  FAILED=$((FAILED + 1))
fi

# 4. Cargo Deny License & Dependency Audit
echo ""
echo "🔍 [4/4] Running Cargo Deny (Licenses, Bans, Advisories, Sources)..."
if check_required_tool "cargo-deny" "command -v cargo-deny || cargo deny --version"; then
  if (cd src-tauri && cargo deny check); then
    echo "✅ Cargo Deny: All checks passed (licenses, advisories, bans, sources OK)."
  else
    echo "❌ Cargo Deny: Policy violations detected!" >&2
    FAILED=$((FAILED + 1))
  fi
else
  FAILED=$((FAILED + 1))
fi

echo ""
if [ "$FAILED" -ne 0 ] || [ "$MISSING_TOOLS" -ne 0 ]; then
  echo "❌ SECURITY AUDIT FAILED (Failed checks: $FAILED, Missing tools: $MISSING_TOOLS)" >&2
  echo "⚠️  Security audit cannot pass with missing tools or security violations." >&2
  exit 1
fi

echo "🎉 ALL SECURITY AUDITS PASSED SUCCESSFULLY!"
exit 0
