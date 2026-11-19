import { performance } from 'node:perf_hooks';
import { VirtualViewportEngine } from '../virtualizer/viewport-window';

const runVirtualScrollBench = (): void => {
  const TOTAL_ROWS = 50_000;
  const VIEWPORT_HEIGHT = 720;
  const SCROLL_FRAMES = 5_000;

  const engine = new VirtualViewportEngine(TOTAL_ROWS, 36, VIEWPORT_HEIGHT, 4);

  for (let i = 0; i < TOTAL_ROWS; i += 3) {
    engine.measureRow(i, i % 2 === 0 ? 52 : 74);
  }

  const maxScroll = Math.max(0, engine.totalScrollHeightPx - VIEWPORT_HEIGHT);

  global.gc?.();
  const memBefore = process.memoryUsage().heapUsed;
  const t0 = performance.now();

  let renderedTotal = 0;
  for (let frame = 0; frame < SCROLL_FRAMES; frame++) {
    const scrollTop = ((frame * 137) % 1000) / 1000 * maxScroll;
    const win = engine.computeVisibleWindow(scrollTop, VIEWPORT_HEIGHT);
    renderedTotal += win.activeCount;
  }

  const elapsedMs = performance.now() - t0;
  global.gc?.();
  const memAfter = process.memoryUsage().heapUsed;

  console.log(
    JSON.stringify(
      {
        datasetRows: TOTAL_ROWS,
        domNodesAllocated: engine.domPoolCapacity,
        domReductionPercent: Number(
          ((1 - engine.domPoolCapacity / TOTAL_ROWS) * 100).toFixed(3)
        ),
        scrollFramesSimulated: SCROLL_FRAMES,
        totalFrameCalcMs: Number(elapsedMs.toFixed(2)),
        avgFrameCalcMs: Number((elapsedMs / SCROLL_FRAMES).toFixed(5)),
        heapDeltaKb: Number(((memAfter - memBefore) / 1024).toFixed(2)),
        checksumRenderedRows: renderedTotal,
      },
      null,
      2
    )
  );
};

runVirtualScrollBench();
