#!/usr/bin/env bash
set -e

echo "🧪 ============================================"
echo "🧪 Waddle Unit & Coverage Test Suite"
echo "🧪 ============================================"

echo ""
echo "📊 [1/2] Running Frontend Vitest with V8 coverage..."
npx vitest run --coverage

echo ""
echo "🦀 [2/2] Running Backend Cargo tests (src-tauri)..."
(cd src-tauri && cargo test)

echo ""
echo "🎉 ALL UNIT & COVERAGE TESTS PASSED SUCCESSFULLY!"
