#!/usr/bin/env bash
set -e

START_TIME=$(date +%s)

echo "================================================================"
echo "🐧⚡ WADDLE INTEGRATED TEST & QUALITY PIPELINE (test:all)"
echo "================================================================"
echo "Starting comprehensive quality, security, visual & memory audits..."
echo ""

# Stage 1: Security & Static Audit
echo "▶ [Stage 1/4] Running Security & Dependency Audit..."
npm run test:security
echo "✅ Stage 1 passed: Security, Credentials & Licenses OK"
echo ""

# Stage 2: Unit & Coverage
echo "▶ [Stage 2/4] Running Unit Tests & V8 Coverage..."
npm run test:unit
echo "✅ Stage 2 passed: Frontend & Backend Unit Tests OK"
echo ""

# Stage 3: Visual Regression
echo "▶ [Stage 3/4] Running Playwright Visual Regression Tests..."
npm run test:visual
echo "✅ Stage 3 passed: Canvas, Unicode Placeholder & Theme Snapshots OK"
echo ""

# Stage 4: Memory & Resource Leak Audit
echo "▶ [Stage 4/4] Running CDP Memory & Resource Leak Audit..."
npm run test:memory
echo "✅ Stage 4 passed: Heap < 300MB & Zero Lingering DOM Leaks OK"
echo ""

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "================================================================"
echo "🎉 ALL AUDIT & TEST SUITES PASSED SUCCESSFULLY (ALL PASS)!"
echo "⏱️  Total Duration: ${DURATION}s"
echo "================================================================"
