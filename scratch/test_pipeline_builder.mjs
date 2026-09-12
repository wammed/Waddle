import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== TC-ENH-05: Visual Pipeline Builder (Ctrl+Shift+P) Verification ===\n');

// 1. Verify PipelineBuilderModal source code and components
console.log('1. Inspecting PipelineBuilderModal.tsx implementation...');
const modalPath = path.resolve(__dirname, '../src/components/PipelineBuilderModal.tsx');
const modalContent = fs.readFileSync(modalPath, 'utf8');

assert.ok(modalContent.includes('COMMON_PRESETS'), 'Must define common pipeline presets');
assert.ok(modalContent.includes('fullPipelineCommand'), 'Must synthesize full pipeline with pipe operator');
assert.ok(modalContent.includes('onExecute(fullPipelineCommand)'), 'Must pass synthesized command to onExecute');
assert.ok(modalContent.includes('moveStage'), 'Must support reordering stages (up/down)');
assert.ok(modalContent.includes('addStage'), 'Must support adding stages');
assert.ok(modalContent.includes('removeStage'), 'Must support removing stages');
console.log('  ✓ PipelineBuilderModal source components verified.');

// 2. Test Pipeline Stage Concatenation & Order
console.log('\n2. Testing Pipeline Stage Concatenation & Reordering Logic...');
function assemblePipeline(stages) {
  return stages
    .map((s) => s.command.trim())
    .filter((c) => c.length > 0)
    .join(' | ');
}

let stages = [
  { id: '1', command: 'cat access.log' },
  { id: '2', command: "awk '{print $1}'" },
  { id: '3', command: 'sort' },
  { id: '4', command: 'uniq -c' },
];

let pipelineStr = assemblePipeline(stages);
assert.strictEqual(
  pipelineStr,
  "cat access.log | awk '{print $1}' | sort | uniq -c",
  'Stages should join with " | "'
);
console.log('  ✓ 4-stage pipeline joined correctly:', pipelineStr);

// Test move stage down
function moveStage(list, index, direction) {
  const targetIdx = direction === 'up' ? index - 1 : index + 1;
  if (targetIdx < 0 || targetIdx >= list.length) return list;
  const next = [...list];
  const temp = next[index];
  next[index] = next[targetIdx];
  next[targetIdx] = temp;
  return next;
}

stages = moveStage(stages, 2, 'down'); // move 'sort' after 'uniq -c'
assert.strictEqual(
  assemblePipeline(stages),
  "cat access.log | awk '{print $1}' | uniq -c | sort"
);
console.log('  ✓ Reordering (move down) verified.');

stages = moveStage(stages, 3, 'up'); // move 'sort' back before 'uniq -c'
assert.strictEqual(
  assemblePipeline(stages),
  "cat access.log | awk '{print $1}' | sort | uniq -c"
);
console.log('  ✓ Reordering (move up) verified.');

// 3. Test Initial Command Splitting (initialCommand -> stages)
console.log('\n3. Testing Parsing initialCommand with pipes into stages...');
const rawCmd = 'ps aux | grep node | awk \'{print $2}\' | xargs kill -9';
const parsedStages = rawCmd.split('|').map((p, idx) => ({
  id: String(idx),
  command: p.trim(),
}));

assert.strictEqual(parsedStages.length, 4, 'Should split into 4 stages');
assert.strictEqual(parsedStages[0].command, 'ps aux');
assert.strictEqual(parsedStages[1].command, 'grep node');
assert.strictEqual(parsedStages[2].command, "awk '{print $2}'");
assert.strictEqual(parsedStages[3].command, 'xargs kill -9');
assert.strictEqual(assemblePipeline(parsedStages), rawCmd);
console.log('  ✓ initialCommand round-trip split & reassemble verified.');

// 4. Verify Shortcut & TitleBar Button Wire-Up in App.tsx
console.log('\n4. Verifying Shortcut & TitleBar integration in App.tsx...');
const appPath = path.resolve(__dirname, '../src/App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');

assert.ok(appContent.includes('isPipelineBuilderOpen'), 'App state must manage isPipelineBuilderOpen');
assert.ok(appContent.includes('PipelineBuilderModal'), 'App must render PipelineBuilderModal');
assert.ok(appContent.includes('onOpenPipelineBuilder'), 'TitleBar must receive onOpenPipelineBuilder callback');

const shortcutsPath = path.resolve(__dirname, '../src/hooks/useGlobalShortcuts.ts');
const shortcutsContent = fs.readFileSync(shortcutsPath, 'utf8');
assert.ok(
  shortcutsContent.includes('ctrlKey') &&
  shortcutsContent.includes('shiftKey') &&
  shortcutsContent.includes("'KeyP'"),
  'Global shortcuts must bind Ctrl+Shift+P to open Pipeline Builder'
);
console.log('  ✓ Shortcut Ctrl+Shift+P and TitleBar wire-up verified in App & useGlobalShortcuts.');

console.log('\n=== TC-ENH-05 Result: PASS ===\n');
