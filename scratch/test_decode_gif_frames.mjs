import { execFileSync } from 'child_process';
import path from 'path';
import { KittyApcParser } from '../src/services/kittyGraphics/parser.ts';

const scriptDir = import.meta.dirname;
const pythonScript = path.join(scriptDir, 'run_kitten_icat.py');
const output = execFileSync('python3', [pythonScript], { maxBuffer: 10 * 1024 * 1024 });
const parser = new KittyApcParser();
const { commands } = parser.parse(output.toString('utf-8'));

let pass = true;
console.log('Commands parsed:', commands.length);
for (const cmd of commands) {
  if (cmd.keys.a === 'T' || cmd.keys.a === 'f') {
    const s = cmd.keys.s;
    const v = cmd.keys.v;
    const S = cmd.keys.S;
    const pixelCount = (s && v) ? s * v : 0;
    const inferred = (pixelCount > 0 && S === pixelCount * 4) ? 32 : (pixelCount > 0 && S === pixelCount * 3) ? 24 : 'unknown';
    console.log(`Action ${cmd.keys.a}: s=${s}, v=${v}, S=${S}, explicit_f=${cmd.keys.f}, inferred_f=${inferred}, c=${cmd.keys.c}`);
    if (cmd.keys.a === 'T' && inferred !== 24) pass = false;
    if (cmd.keys.a === 'f' && inferred !== 32) pass = false;
  }
}

if (pass) {
  console.log('\n✅ PASS: Base frame is 24-bit RGB and all delta frames are successfully auto-detected as 32-bit RGBA!');
} else {
  console.error('\n❌ FAIL: Format auto-detection mismatch');
  process.exit(1);
}
