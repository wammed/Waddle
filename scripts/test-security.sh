#!/usr/bin/env bash
set -e

echo "🛡️  ============================================"
echo "🛡️  Waddle Security & Dependency Audit Suite"
echo "🛡️  ============================================"

# 1. Gitleaks Secret Detection
echo ""
echo "🔍 [1/4] Running Gitleaks repository secret scan..."
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --config .gitleaks.toml --no-banner -v
  echo "✅ Gitleaks: 0 secrets leaked."
else
  echo "⚠️  gitleaks command not found, skipping."
fi

# 2. Secretlint Static Code Audit
echo ""
echo "🔍 [2/4] Running Secretlint code audit..."
npx secretlint "**/*"
echo "✅ Secretlint: 0 credentials leaked."

# 3. RustSec Cargo Audit
echo ""
echo "🔍 [3/4] Running Cargo Audit (RustSec RUSTSEC database)..."
(cd src-tauri && cargo audit)
echo "✅ Cargo Audit: 0 vulnerabilities found."

# 4. Cargo Deny License & Dependency Audit
echo ""
echo "🔍 [4/4] Running Cargo Deny (Licenses, Bans, Advisories, Sources)..."
(cd src-tauri && cargo deny check)
echo "✅ Cargo Deny: All checks passed (licenses, advisories, bans, sources OK)."

echo ""
echo "🎉 ALL SECURITY AUDITS PASSED SUCCESSFULLY!"
