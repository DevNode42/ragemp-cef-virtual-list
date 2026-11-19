export class FenwickHeightTree {
  private readonly size: number;
  private readonly heights: Float32Array;
  private readonly tree: Float64Array;
  private readonly highestBit: number;
  private totalHeightSum = 0;

  constructor(itemCount: number, defaultHeightPx: number) {
    this.size = itemCount;
    this.heights = new Float32Array(itemCount);
    this.tree = new Float64Array(itemCount + 1);
    this.highestBit = 1 << (31 - Math.clz32(Math.max(1, itemCount)));

    for (let i = 0; i < itemCount; i++) {
      this.heights[i] = defaultHeightPx;
      this.tree[i + 1] = defaultHeightPx;
    }

    for (let i = 1; i <= itemCount; i++) {
      const parent = i + (i & -i);
      if (parent <= itemCount) {
        this.tree[parent]! += this.tree[i]!;
      }
    }

    this.totalHeightSum = itemCount * defaultHeightPx;
  }

  get totalHeight(): number {
    return this.totalHeightSum;
  }

  getItemHeight(index: number): number {
    return this.heights[index] ?? 0;
  }

  updateHeight(index: number, newHeightPx: number): boolean {
    if (index < 0 || index >= this.size) return false;
    const prev = this.heights[index]!;
    const delta = newHeightPx - prev;
    if (Math.abs(delta) < 0.01) return false;

    this.heights[index] = newHeightPx;
    this.totalHeightSum += delta;

    for (let i = index + 1; i <= this.size; i += i & -i) {
      this.tree[i]! += delta;
    }

    return true;
  }

  getOffsetTop(index: number): number {
    let sum = 0;
    for (let i = Math.min(index, this.size); i > 0; i -= i & -i) {
      sum += this.tree[i]!;
    }
    return sum;
  }

  findIndexAtOffset(scrollTopPx: number): number {
    if (scrollTopPx <= 0 || this.size === 0) return 0;
    if (scrollTopPx >= this.totalHeightSum) return this.size - 1;

    let idx = 0;
    let remaining = scrollTopPx;

    for (let bit = this.highestBit; bit > 0; bit >>= 1) {
      const next = idx + bit;
      if (next <= this.size && this.tree[next]! <= remaining) {
        idx = next;
        remaining -= this.tree[next]!;
      }
    }

    return Math.min(idx, this.size - 1);
  }
}
