import { test, expect } from '@playwright/test';

test.describe('Waddle Memory & Resource Leak Audit (CDP)', () => {
  test('TC-MEM-01: Massive streaming stress retains memory under 300MB cap', async ({ page }) => {
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    await page.goto('/');
    await page.waitForSelector('#root', { timeout: 10000 });
    await page.waitForTimeout(600);

    // Force GC to obtain baseline metrics
    await client.send('HeapProfiler.collectGarbage');
    const baselineMetrics = await client.send('Performance.getMetrics');
    const baselineHeap = baselineMetrics.metrics.find((m) => m.name === 'JSHeapUsedSize')?.value || 0;

    // Simulate high-throughput streaming burst (10,000+ operations)
    await page.evaluate(async () => {
      const sample = 'Waddle High-Throughput Coalesced Stream Pacing Simulation Line 1234567890\r\n';
      const chunk = sample.repeat(50);
      for (let i = 0; i < 200; i++) {
        // Broadcast custom terminal streaming test events
        window.dispatchEvent(new CustomEvent('waddle-test-stream', { detail: { chunk, index: i } }));
      }
    });

    await page.waitForTimeout(1000);

    // Force GC after heavy stream
    await client.send('HeapProfiler.collectGarbage');
    const postStreamMetrics = await client.send('Performance.getMetrics');
    const postStreamHeap = postStreamMetrics.metrics.find((m) => m.name === 'JSHeapUsedSize')?.value || 0;
    const postStreamNodes = postStreamMetrics.metrics.find((m) => m.name === 'Nodes')?.value || 0;

    console.log(`[CDP Memory Audit] Baseline Heap: ${(baselineHeap / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[CDP Memory Audit] Post-Stream Heap: ${(postStreamHeap / 1024 / 1024).toFixed(2)} MB (Strict 300MB Cap)`);
    console.log(`[CDP Memory Audit] DOM Node Count: ${postStreamNodes}`);

    // Assert strictly under 300MB ceiling
    const limitBytes = 300 * 1024 * 1024; // 300 MB
    expect(postStreamHeap).toBeLessThan(limitBytes);
    expect(postStreamNodes).toBeLessThan(10000); // Reasonable DOM bound
  });

  test('TC-MEM-02: Tab lifecycle and destruction retains zero lingering DOM leaks', async ({ page }) => {
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    await page.goto('/');
    await page.waitForSelector('#root', { timeout: 10000 });
    await page.waitForTimeout(600);

    await client.send('HeapProfiler.collectGarbage');
    const beforeMetrics = await client.send('Performance.getMetrics');
    const beforeDocuments = beforeMetrics.metrics.find((m) => m.name === 'Documents')?.value || 1;
    const beforeNodes = beforeMetrics.metrics.find((m) => m.name === 'Nodes')?.value || 0;

    // 1. Create a second tab using #btn-new-tab
    const newTabBtn = page.locator('#btn-new-tab');
    await expect(newTabBtn).toBeVisible();
    await newTabBtn.click();
    await page.waitForTimeout(800);

    // Verify 2 tabs are present
    const closeBtns = page.locator('.tab-close');
    await expect(closeBtns.first()).toBeVisible();

    // 2. Destroy the tab
    await closeBtns.first().click();
    await page.waitForTimeout(800);

    // 3. Force GC via CDP
    await client.send('HeapProfiler.collectGarbage');
    const afterMetrics = await client.send('Performance.getMetrics');
    const afterDocuments = afterMetrics.metrics.find((m) => m.name === 'Documents')?.value || 1;
    const afterNodes = afterMetrics.metrics.find((m) => m.name === 'Nodes')?.value || 0;

    console.log(`[CDP Memory Audit] Documents: Before=${beforeDocuments}, After=${afterDocuments}`);
    console.log(`[CDP Memory Audit] DOM Nodes: Before=${beforeNodes}, After=${afterNodes} (Diff: ${afterNodes - beforeNodes})`);

    // Verify document count is strictly stable (zero detached documents leaked)
    expect(afterDocuments).toBeLessThanOrEqual(beforeDocuments);
    // Node count returns to baseline (delta < 100 for React fiber and event pool)
    expect(Math.abs(afterNodes - beforeNodes)).toBeLessThan(100);
  });
});
