import { KittyApcParser } from '../src/services/kittyGraphics/parser.ts';
import { execFileSync } from 'child_process';
import path from 'path';

const scriptDir = import.meta.dirname;
const pythonScript = path.join(scriptDir, 'run_kitten_icat.py');
const output = execFileSync('python3', [pythonScript], { maxBuffer: 10 * 1024 * 1024 });

const parser = new KittyApcParser();
const { cleanText, commands } = parser.parse(output.toString('utf-8'));
console.log('Total parsed Kitty commands:', commands.length);

let tCount = 0;
let aCount = 0;
let fCount = 0;
let imageNumber = null;

for (const cmd of commands) {
  const id = cmd.keys.i ?? cmd.keys.I;
  if (cmd.keys.a === 'T') {
    tCount++;
    imageNumber = id;
    console.log(`Action T: id/I=${id}, format=${cmd.keys.f}, medium=${cmd.keys.t}, dims=${cmd.keys.s}x${cmd.keys.v}, q=${cmd.keys.q}`);
  } else if (cmd.keys.a === 'a') {
    aCount++;
  } else if (cmd.keys.a === 'f') {
    fCount++;
    console.log(`Action f: id/I=${id}, format=${cmd.keys.f}, medium=${cmd.keys.t}, patch=${cmd.keys.s}x${cmd.keys.v}, offset=(${cmd.keys.x},${cmd.keys.y}), c=${cmd.keys.c}, q=${cmd.keys.q}`);
  }
}

console.log(`Summary: ${tCount} root frames (T), ${fCount} animation frames (f), ${aCount} control commands (a)`);
console.log('Identified animation image number:', imageNumber);

if (tCount === 1 && fCount === 5 && aCount === 3 && imageNumber > 0) {
  console.log('PASS: Successfully parsed root frame, 5 delta frames, and 3 animation controls with Image Number I!');
} else {
  console.error('FAIL: Missing frames or image number');
  process.exit(1);
}
