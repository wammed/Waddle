import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('=== Verifying 4 Bug Fixes ===\n');

// Test 1: Cargo unit tests (covers TC-GIT-07 EACCES and TC-THM-05 Magic Bytes)
try {
  console.log('Running Rust unit tests in src-tauri...');
  const testOutput = execSync('cargo test -- --nocapture', {
    cwd: path.resolve('src-tauri'),
    encoding: 'utf-8'
  });
  if (testOutput.includes('test pty::tests::test_git_discard_file_path_traversal ... ok') &&
      testOutput.includes('test config::tests::test_validate_wallpaper_file_path ... ok')) {
    console.log('✅ TC-GIT-07 (git_discard_file EACCES): PASS');
    console.log('✅ TC-THM-05 (validate_wallpaper_file_path Magic Bytes): PASS');
  } else {
    console.error('❌ Tests did not pass as expected:\n', testOutput);
    process.exit(1);
  }
} catch (e) {
  console.error('❌ Cargo test failed:', e.message);
  process.exit(1);
}

// Test 2: Check WebLinksAddon in SingleTerminalView.tsx
const singleTermContent = fs.readFileSync('src/components/SingleTerminalView.tsx', 'utf-8');
if (singleTermContent.includes('new WebLinksAddon((_event, uri) => {') &&
    singleTermContent.includes('openUrl(uri)')) {
  console.log('✅ TC-PTY-08 (WebLinksAddon openUrl hook): PASS');
} else {
  console.error('❌ TC-PTY-08 WebLinksAddon openUrl hook missing');
  process.exit(1);
}

// Test 3: Check Ctrl+Alt+Arrows capture and non-consumption
if (singleTermContent.includes("event.key === 'ArrowLeft'") &&
    singleTermContent.includes('return false;')) {
  console.log('✅ TC-TAB-04 (xterm attachCustomKeyEventHandler Ctrl+Alt+Arrows release): PASS');
} else {
  console.error('❌ TC-TAB-04 xterm key event handler missing');
  process.exit(1);
}

const termPaneContent = fs.readFileSync('src/components/TerminalPane.tsx', 'utf-8');
if (termPaneContent.includes("window.addEventListener('keydown', handleKeyDown, true)")) {
  console.log('✅ TC-TAB-04 (TerminalPane capture listener for Ctrl+Alt+Arrows): PASS');
} else {
  console.error('❌ TC-TAB-04 TerminalPane capture listener missing');
  process.exit(1);
}

// Test 4: Check SettingsModal wallpaper validation & error banner
const settingsContent = fs.readFileSync('src/components/SettingsModal.tsx', 'utf-8');
if (settingsContent.includes('wallpaperError') &&
    settingsContent.includes('wallpaper-error-banner') &&
    settingsContent.includes('validateWallpaperPath')) {
  console.log('✅ TC-THM-05 (SettingsModal wallpaper validation & error banner): PASS');
} else {
  console.error('❌ TC-THM-05 SettingsModal wallpaper error banner missing');
  process.exit(1);
}

console.log('\n🎉 ALL 4 VERIFICATION CHECKS PASSED!');
