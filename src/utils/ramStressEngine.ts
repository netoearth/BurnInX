/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RamPattern } from '../types/benchmark';

export interface RamUpdate {
  allocatedMb: number;
  bandwidthMbS: number;
  passes: number;
  errors: number;
  status: string;
}

export class RamStressController {
  private chunks: Uint32Array[] = [];
  private isRunning: boolean = false;
  private intervalId: number | null = null;
  private totalPasses: number = 0;
  private errorCount: number = 0;
  private onUpdateCallback?: (update: RamUpdate) => void;
  private currentPatternIndex: number = 0;

  private patterns = [
    0x55555555, // 01010101...
    0xaaaaaaaa, // 10101010...
    0x33333333, // 00110011...
    0xcccccccc, // 11001100...
    0x0f0f0f0f, // 00001111...
    0xf0f0f0f0, // 11110000...
    0x00000000,
    0xffffffff,
  ];

  public start(
    targetMb: number,
    patternType: RamPattern,
    onUpdate: (update: RamUpdate) => void
  ) {
    this.stop();
    this.isRunning = true;
    this.onUpdateCallback = onUpdate;
    this.totalPasses = 0;
    this.errorCount = 0;

    // Allocate in 32MB chunks to stay safe with browser heap allocation
    const chunkSizeMb = 32;
    const numChunks = Math.max(1, Math.floor(targetMb / chunkSizeMb));
    const wordsPerChunk = (chunkSizeMb * 1024 * 1024) / 4; // Uint32 is 4 bytes

    this.chunks = [];
    for (let c = 0; c < numChunks; c++) {
      try {
        const arr = new Uint32Array(wordsPerChunk);
        this.chunks.push(arr);
      } catch (err) {
        console.warn(`Memory allocation limit reached at chunk ${c}:`, err);
        break;
      }
    }

    const actualAllocatedMb = this.chunks.length * chunkSizeMb;
    let chunkIndex = 0;

    const stressTick = () => {
      if (!this.isRunning || this.chunks.length === 0) return;

      const startTime = performance.now();
      const chunk = this.chunks[chunkIndex % this.chunks.length];
      const patternVal = this.patterns[this.currentPatternIndex % this.patterns.length];
      let bytesTransferred = 0;

      if (patternType === 'bitflip_checker') {
        // Write pattern across chunk
        const step = 4;
        for (let i = 0; i < chunk.length; i += step) {
          chunk[i] = patternVal;
          chunk[i + 1] = ~patternVal;
        }
        // Verify pattern integrity
        for (let i = 0; i < chunk.length; i += step) {
          if (chunk[i] !== patternVal) this.errorCount++;
          if (chunk[i + 1] !== (~patternVal >>> 0)) this.errorCount++;
        }
        bytesTransferred = chunk.length * 4 * 2; // Write + Read
      } else if (patternType === 'cache_thrash') {
        // Prime stride cache trashing (stride = 4096 words = 16KB)
        const stride = 4099;
        const len = chunk.length;
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 0; i < len; i += stride) {
            const idx = (i * 37) % len;
            chunk[idx] = (chunk[idx] ^ 0xabcdef01) + 1;
          }
        }
        bytesTransferred = len * 4;
      } else {
        // High bandwidth sequential & random read/write
        const len = chunk.length;
        for (let i = 0; i < len; i += 8) {
          chunk[i] = i ^ patternVal;
          chunk[i + 1] = chunk[i] + 7;
          chunk[i + 2] = chunk[i + 1] ^ 0x12345678;
          chunk[i + 3] = chunk[i + 2] + chunk[i];
        }
        bytesTransferred = len * 4;
      }

      const elapsedMs = Math.max(0.1, performance.now() - startTime);
      const bandwidthMbS = (bytesTransferred / (1024 * 1024)) / (elapsedMs / 1000);

      chunkIndex++;
      if (chunkIndex % this.chunks.length === 0) {
        this.totalPasses++;
        this.currentPatternIndex++;
      }

      this.onUpdateCallback?.({
        allocatedMb: actualAllocatedMb,
        bandwidthMbS,
        passes: this.totalPasses,
        errors: this.errorCount,
        status: `Pattern 0x${patternVal.toString(16).toUpperCase()} | Pass ${this.totalPasses}`,
      });

      if (this.isRunning) {
        // Schedule next slice
        this.intervalId = window.setTimeout(stressTick, 16);
      }
    };

    stressTick();
  }

  public stop() {
    this.isRunning = false;
    if (this.intervalId !== null) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    // Release memory
    this.chunks = [];
  }
}
