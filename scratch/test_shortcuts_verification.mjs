import assert from 'node:assert';
import fs from 'node:fs';

console.log('Running Shortcuts & Key Binding Verification Suite...');

// 1. SingleTerminalView.tsx verification
const singleTermSrc = fs.readFileSync(new URL('../src/components/SingleTerminalView.tsx', import.meta.url), 'utf8');
assert.ok(singleTermSrc.includes('attachCustomKeyEventHandler'), 'SingleTerminalView must have attachCustomKeyEventHandler');
assert.ok(singleTermSrc.includes("keyLower === 'k' || code === 'KeyK'"), 'Ctrl+K must be intercepted from xterm');
assert.ok(singleTermSrc.includes("keyLower === 'b' || code === 'KeyB'"), 'Ctrl+B must be intercepted from xterm');
assert.ok(singleTermSrc.includes("keyLower === 'e' || code === 'KeyE'"), 'Ctrl+E must be intercepted from xterm');
assert.ok(singleTermSrc.includes("keyLower === 't' || code === 'KeyT'"), 'Ctrl+T must be intercepted from xterm');
assert.ok(singleTermSrc.includes("keyLower === 'w' || code === 'KeyW'"), 'Ctrl+W must be intercepted from xterm');
assert.ok(singleTermSrc.includes("keyLower === 'z' || code === 'KeyZ'"), 'Alt+Z must be intercepted from xterm');
assert.ok(singleTermSrc.includes("['1', '2', '3', '4']"), 'Alt+1..4 keys must be intercepted from xterm');
assert.ok(singleTermSrc.includes("['Digit1', 'Digit2', 'Digit3', 'Digit4'"), 'Alt+1..4 codes must be intercepted from xterm');
assert.ok(singleTermSrc.includes("code === 'ArrowLeft'"), 'Alt+Arrows must be intercepted from xterm');
console.log('✓ SingleTerminalView keyboard interception verified.');

// 2. useGlobalShortcuts.ts verification
const shortcutsSrc = fs.readFileSync(new URL('../src/hooks/useGlobalShortcuts.ts', import.meta.url), 'utf8');
assert.ok(shortcutsSrc.includes("window.addEventListener('keydown', handleKeyDown, true)"), 'Must use capture phase');
assert.ok(shortcutsSrc.includes('handleToggleZoomPane'), 'Must accept and handle handleToggleZoomPane');
assert.ok(shortcutsSrc.includes("keyLower === 'z' || code === 'KeyZ'"), 'Must handle Alt+Z');
assert.ok(shortcutsSrc.includes("code === 'Digit1'"), 'Must support Digit1');
assert.ok(shortcutsSrc.includes("code === 'Numpad1'"), 'Must support Numpad1');
assert.ok(shortcutsSrc.includes("code === 'ArrowUp'"), 'Must support ArrowUp');
assert.ok(shortcutsSrc.includes("keyLower === 'k' || code === 'KeyK'"), 'Must support Ctrl+K');
assert.ok(shortcutsSrc.includes("keyLower === 'b' || code === 'KeyB'"), 'Must support Ctrl+B');
assert.ok(shortcutsSrc.includes("keyLower === 'e' || code === 'KeyE'"), 'Must support Ctrl+E');
assert.ok(shortcutsSrc.includes("keyLower === 't' || code === 'KeyT'"), 'Must support Ctrl+T');
assert.ok(shortcutsSrc.includes("keyLower === 'w' || code === 'KeyW'"), 'Must support Ctrl+W');
console.log('✓ useGlobalShortcuts handler logic verified.');

// 3. App.tsx wiring verification
const appSrc = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
assert.ok(appSrc.includes('handleToggleZoomPane,\n    createNewTab') || appSrc.includes('handleToggleZoomPane,'), 'App must pass handleToggleZoomPane to useGlobalShortcuts');
console.log('✓ App.tsx shortcut wiring verified.');

// 4. GitQuickPopover.tsx verification
const gitPopoverSrc = fs.readFileSync(new URL('../src/components/GitQuickPopover.tsx', import.meta.url), 'utf8');
assert.ok(gitPopoverSrc.includes("e.key === 'Escape'"), 'GitQuickPopover must handle Escape');
assert.ok(gitPopoverSrc.includes("e.code === 'Enter' ||") && gitPopoverSrc.includes("e.code === 'NumpadEnter'"), 'Git commit input must support Enter codes');
assert.ok(gitPopoverSrc.includes('handleCommit()'), 'Git commit input must trigger handleCommit()');
console.log('✓ GitQuickPopover keyboard handling verified.');

// 5. AiCommandModal.tsx verification
const aiModalSrc = fs.readFileSync(new URL('../src/components/AiCommandModal.tsx', import.meta.url), 'utf8');
assert.ok(aiModalSrc.includes("handleGlobalKeyDown"), 'AiCommandModal must have window Escape listener');
assert.ok(aiModalSrc.includes("handleRun(suggestion.command)"), 'AiCommandModal must run on Ctrl+Enter');
assert.ok(aiModalSrc.includes("code === 'Enter'"), 'AiCommandModal must check code === Enter');
console.log('✓ AiCommandModal keyboard handling verified.');

// 6. SettingsModal.tsx verification
const settingsSrc = fs.readFileSync(new URL('../src/components/SettingsModal.tsx', import.meta.url), 'utf8');
assert.ok(settingsSrc.includes("e.key === 'Escape'"), 'SettingsModal must handle Escape');
console.log('✓ SettingsModal Escape handling verified.');

// 7. DangerousCommandModal.tsx verification
const dangerousSrc = fs.readFileSync(new URL('../src/components/DangerousCommandModal.tsx', import.meta.url), 'utf8');
assert.ok(dangerousSrc.includes("e.key === 'Escape'"), 'DangerousCommandModal must handle Escape');
console.log('✓ DangerousCommandModal Escape handling verified.');

// 8. AiErrorBanner.tsx verification
const bannerSrc = fs.readFileSync(new URL('../src/components/AiErrorBanner.tsx', import.meta.url), 'utf8');
assert.ok(bannerSrc.includes("e.key === 'Escape'"), 'AiErrorBanner must handle Escape');
console.log('✓ AiErrorBanner Escape handling verified.');

// 9. EditorPane.tsx verification
const editorSrc = fs.readFileSync(new URL('../src/components/EditorPane.tsx', import.meta.url), 'utf8');
assert.ok(editorSrc.includes("isAiModalOpen"), 'EditorPane must manage isAiModalOpen');
assert.ok(editorSrc.includes("e.stopPropagation()"), 'EditorPane must stop propagation on Ctrl+Shift+K');
console.log('✓ EditorPane shortcut handling verified.');

console.log('All 9 keyboard shortcut verification checks passed successfully! 🎉');
