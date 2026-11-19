import { FenwickHeightTree } from './fenwick-height-tree';

export interface VirtualSlotSlice {
  poolSlot: number;
  dataIndex: number;
  translateY: number;
  height: number;
}

export class VirtualViewportEngine {
  private readonly indexTree: FenwickHeightTree;
  private readonly itemCount: number;
  private readonly overscan: number;
  private readonly poolSize: number;
  private readonly slotOwnerIndex: Int32Array;
  private readonly reusableSlice: VirtualSlotSlice[];

  constructor(
    itemCount: number,
    estimatedRowHeightPx = 36,
    viewportHeightPx = 720,
    overscan = 4
  ) {
    this.itemCount = itemCount;
    this.overscan = overscan;
    this.indexTree = new FenwickHeightTree(itemCount, estimatedRowHeightPx);

    const visibleEstimate = Math.ceil(viewportHeightPx / Math.max(16, estimatedRowHeightPx));
    this.poolSize = Math.min(itemCount, visibleEstimate + overscan * 2 + 4);
    this.slotOwnerIndex = new Int32Array(this.poolSize).fill(-1);
    this.reusableSlice = Array.from({ length: this.poolSize }, (_, poolSlot) => ({
      poolSlot,
      dataIndex: -1,
      translateY: 0,
      height: estimatedRowHeightPx,
    }));
  }

  get totalScrollHeightPx(): number {
    return this.indexTree.totalHeight;
  }

  get domPoolCapacity(): number {
    return this.poolSize;
  }

  measureRow(dataIndex: number, measuredHeightPx: number): boolean {
    return this.indexTree.updateHeight(dataIndex, measuredHeightPx);
  }

  computeVisibleWindow(
    scrollTopPx: number,
    viewportHeightPx: number
  ): { readonly activeCount: number; readonly slices: readonly VirtualSlotSlice[] } {
    if (this.itemCount === 0) {
      return { activeCount: 0, slices: this.reusableSlice };
    }

    const firstVisible = this.indexTree.findIndexAtOffset(scrollTopPx);
    const lastVisible = this.indexTree.findIndexAtOffset(scrollTopPx + viewportHeightPx);

    const startIdx = Math.max(0, firstVisible - this.overscan);
    const endIdx = Math.min(
      this.itemCount - 1,
      Math.max(lastVisible + this.overscan, startIdx + this.poolSize - 1)
    );

    const windowLength = Math.min(this.poolSize, endIdx - startIdx + 1);
    let cursorY = this.indexTree.getOffsetTop(startIdx);

    for (let i = 0; i < windowLength; i++) {
      const dataIdx = startIdx + i;
      const poolSlot = dataIdx % this.poolSize;
      const rowHeight = this.indexTree.getItemHeight(dataIdx);

      this.slotOwnerIndex[poolSlot] = dataIdx;
      const slice = this.reusableSlice[i]!;
      slice.poolSlot = poolSlot;
      slice.dataIndex = dataIdx;
      slice.translateY = cursorY;
      slice.height = rowHeight;

      cursorY += rowHeight;
    }

    return { activeCount: windowLength, slices: this.reusableSlice };
  }
}
