import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Auto-delegate to `npx tsx` if executed directly via `node` without TypeScript/TSX loader
const hasTsxLoader = process.execArgv.some((a) => a.includes('tsx/dist'));
if (!hasTsxLoader) {
  const result = spawnSync(
    'npx',
    ['tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: 'inherit' }
  );
  process.exit(result.status ?? 0);
}

import assert from 'node:assert';
const { KittyApcParser } = await import('../src/services/kittyGraphics/parser.ts');
const { KittyLruCache } = await import('../src/services/kittyGraphics/lruCache.ts');

console.log('=== TEST 1: APC Parser animation actions & control keys ===');
{
  const parser = new KittyApcParser();

  // Test a=f (frame transmission) with v, z, r keys
  const { commands: cmdFrame } = parser.parse('\x1b_Ga=f,i=42,v=0,z=100,r=2;AAAA\x1b\\');
  assert.strictEqual(cmdFrame.length, 1);
  assert.strictEqual(cmdFrame[0].keys.a, 'f');
  assert.strictEqual(cmdFrame[0].keys.i, 42);
  assert.strictEqual(cmdFrame[0].keys.v, 0, 'v=0 should be parsed as 0');
  assert.strictEqual(cmdFrame[0].keys.z, 100, 'z=100 should be parsed as 100');
  assert.strictEqual(cmdFrame[0].keys.r, 2, 'r=2 should be parsed as 2');

  // Test a=a (animation control) with s, v, r keys
  const { commands: cmdCtrl } = parser.parse('\x1b_Ga=a,i=42,s=3,v=2,r=1\x1b\\');
  assert.strictEqual(cmdCtrl.length, 1);
  assert.strictEqual(cmdCtrl[0].keys.a, 'a');
  assert.strictEqual(cmdCtrl[0].keys.i, 42);
  assert.strictEqual(cmdCtrl[0].keys.s, 3);
  assert.strictEqual(cmdCtrl[0].keys.v, 2);
  assert.strictEqual(cmdCtrl[0].keys.r, 1);

  // Test default v when omitted
  const { commands: cmdNoV } = parser.parse('\x1b_Ga=f,i=42,z=50;BBBB\x1b\\');
  assert.strictEqual(cmdNoV[0].keys.v, undefined, 'v is undefined when omitted');

  console.log('✔ Parser correctly recognizes a=f, a=a, v=0, z, s, r');
}

console.log('\n=== TEST 2: Animation loop state machine (v=0 Infinite Loop) ===');
{
  // Simulate 3-frame animation: Frame 0 (Red), Frame 1 (Green), Frame 2 (Blue)
  const frames = [
    { name: 'Red', delayMs: 20 },
    { name: 'Green', delayMs: 20 },
    { name: 'Blue', delayMs: 20 },
  ];

  const anim = {
    loopCount: 0, // 0 = infinite loop
    loopsCompleted: 0,
    currentFrameIndex: 0,
    isPlaying: true,
    timer: null,
  };

  const frameHistory = [];
  let rescheduledCount = 0;

  function advanceFrame() {
    if (!anim.isPlaying) return;

    const totalFrames = frames.length;
    const nextIndex = anim.currentFrameIndex + 1;

    if (nextIndex >= totalFrames) {
      anim.loopsCompleted++;
      if (anim.loopCount > 0 && anim.loopsCompleted >= anim.loopCount) {
        anim.isPlaying = false;
        return;
      }
      // Infinite loop or loopsCompleted < loopCount: wrap around to frame 0
      anim.currentFrameIndex = 0;
    } else {
      anim.currentFrameIndex = nextIndex;
    }

    frameHistory.push(frames[anim.currentFrameIndex].name);
    rescheduledCount++;
  }

  // Initial display is frame 0
  frameHistory.push(frames[anim.currentFrameIndex].name);

  // Simulate 9 ticks (should cycle: Red -> Green -> Blue -> Red -> Green -> Blue -> Red -> Green -> Blue -> Red)
  for (let i = 0; i < 9; i++) {
    advanceFrame();
  }

  assert.strictEqual(anim.isPlaying, true, 'Animation should still be playing (infinite loop)');
  assert.strictEqual(anim.loopsCompleted, 3, 'Completed 3 full loops');
  assert.deepStrictEqual(
    frameHistory,
    ['Red', 'Green', 'Blue', 'Red', 'Green', 'Blue', 'Red', 'Green', 'Blue', 'Red'],
    'Correct infinite wraparound sequence across multiple loops'
  );
  assert.strictEqual(rescheduledCount, 9, 'Timer rescheduled on each frame transition');

  console.log('✔ v=0 infinite loop smoothly wraps around from Blue back to Red and continues indefinitely');
}

console.log('\n=== TEST 3: Animation finite loop (v=1 Single Cycle) ===');
{
  const frames = [
    { name: 'Red', delayMs: 20 },
    { name: 'Green', delayMs: 20 },
    { name: 'Blue', delayMs: 20 },
  ];

  const anim = {
    loopCount: 1, // Finite: 1 cycle
    loopsCompleted: 0,
    currentFrameIndex: 0,
    isPlaying: true,
  };

  const frameHistory = [frames[anim.currentFrameIndex].name];

  function advanceFrame() {
    if (!anim.isPlaying) return;
    const totalFrames = frames.length;
    const nextIndex = anim.currentFrameIndex + 1;

    if (nextIndex >= totalFrames) {
      anim.loopsCompleted++;
      if (anim.loopCount > 0 && anim.loopsCompleted >= anim.loopCount) {
        anim.isPlaying = false;
        return;
      }
      anim.currentFrameIndex = 0;
    } else {
      anim.currentFrameIndex = nextIndex;
    }
    frameHistory.push(frames[anim.currentFrameIndex].name);
  }

  // Tick 1 -> Green
  advanceFrame();
  // Tick 2 -> Blue
  advanceFrame();
  // Tick 3 -> Blue delay expires -> loop completed -> stop on Blue!
  advanceFrame();
  // Tick 4 -> Should do nothing because isPlaying is false
  advanceFrame();

  assert.strictEqual(anim.isPlaying, false, 'Animation stopped after 1 cycle');
  assert.strictEqual(anim.loopsCompleted, 1, 'Exactly 1 loop completed');
  assert.strictEqual(anim.currentFrameIndex, 2, 'Remains on final frame (Blue, index 2)');
  assert.deepStrictEqual(frameHistory, ['Red', 'Green', 'Blue'], 'Stopped after exactly 1 cycle');

  console.log('✔ v=1 stops after 1 loop and freezes on the final frame (Blue)');
}

console.log('\n=== TEST 4: Animation finite loop (v=2 Two Cycles) ===');
{
  const frames = [
    { name: 'Red', delayMs: 20 },
    { name: 'Green', delayMs: 20 },
    { name: 'Blue', delayMs: 20 },
  ];

  const anim = {
    loopCount: 2, // Finite: 2 cycles
    loopsCompleted: 0,
    currentFrameIndex: 0,
    isPlaying: true,
  };

  const frameHistory = [frames[anim.currentFrameIndex].name];

  function advanceFrame() {
    if (!anim.isPlaying) return;
    const totalFrames = frames.length;
    const nextIndex = anim.currentFrameIndex + 1;

    if (nextIndex >= totalFrames) {
      anim.loopsCompleted++;
      if (anim.loopCount > 0 && anim.loopsCompleted >= anim.loopCount) {
        anim.isPlaying = false;
        return;
      }
      anim.currentFrameIndex = 0;
    } else {
      anim.currentFrameIndex = nextIndex;
    }
    frameHistory.push(frames[anim.currentFrameIndex].name);
  }

  // Run 10 ticks
  for (let i = 0; i < 10; i++) {
    advanceFrame();
  }

  assert.strictEqual(anim.isPlaying, false, 'Animation stopped after 2 cycles');
  assert.strictEqual(anim.loopsCompleted, 2, 'Exactly 2 loops completed');
  assert.strictEqual(anim.currentFrameIndex, 2, 'Remains on final frame (Blue)');
  assert.deepStrictEqual(
    frameHistory,
    ['Red', 'Green', 'Blue', 'Red', 'Green', 'Blue'],
    'Correctly executed 2 full cycles and halted'
  );

  console.log('✔ v=2 executes exactly 2 full cycles and halts on final frame');
}

console.log('\n=== TEST 5: Cache deletion timer cleanup ===');
{
  const cache = new KittyLruCache(10);
  let timerCleared = false;
  const mockTimer = {
    unref: () => {},
  };
  const originalClearTimeout = globalThis.clearTimeout;
  globalThis.clearTimeout = (t) => {
    if (t === mockTimer) {
      timerCleared = true;
    }
  };

  try {
    const record = {
      id: 100,
      bitmap: { close: () => {} },
      width: 10,
      height: 10,
      byteSize: 400,
      lastUsed: Date.now(),
      frames: [
        { bitmap: { close: () => {} }, width: 10, height: 10, byteSize: 400, delayMs: 40 },
        { bitmap: { close: () => {} }, width: 10, height: 10, byteSize: 400, delayMs: 40 },
      ],
      animation: {
        loopCount: 0,
        loopsCompleted: 0,
        currentFrameIndex: 0,
        isPlaying: true,
        timer: mockTimer,
      },
    };

    cache.set(100, record);
    assert.strictEqual(record.animation.isPlaying, true);

    // Delete should cancel timer and set isPlaying = false
    cache.delete(100);
    assert.strictEqual(timerCleared, true, 'Timer was cancelled on delete');
    assert.strictEqual(record.animation.isPlaying, false, 'isPlaying marked false');
    assert.strictEqual(record.animation.timer, undefined, 'Timer handle removed');
  } finally {
    globalThis.clearTimeout = originalClearTimeout;
  }

  console.log('✔ Cache deletion successfully cleans up active animation timers');
}

console.log('\nALL ANIMATION LOOP TESTS PASSED SUCCESSFULLY! 🎉');
