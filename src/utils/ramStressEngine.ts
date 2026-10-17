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

const ramWorkerScript = `
self.onmessage = function(e) {
  const { command, targetMb, patternType } = e.data;
  if (command === 'stop') {
    self.running = false;
    return;
  }
  if (command === 'start') {
    self.running = true;
    runRamStress(targetMb || 1024, patternType || 'bandwidth_rw');
  }
};

function runRamStress(targetMb, patternType) {
  const chunkSizeMb = 32;
  const numChunks = Math.max(1, Math.floor(targetMb / chunkSizeMb));
  const wordsPerChunk = (chunkSizeMb * 1024 * 1024) / 4; // Uint32 (4 bytes per element)
  const chunks = [];

  // Allocate actual physical buffers
  for (let c = 0; c < numChunks; c++) {
    try {
      chunks.push(new Uint32Array(wordsPerChunk));
    } catch (err) {
      break;
    }
  }

  const actualAllocatedMb = chunks.length * chunkSizeMb;
  let totalPasses = 0;
  let errorCount = 0;
  let lastReport = performance.now();
  let bytesTransferred = 0;
  let chunkIndex = 0;

  const patterns = [
    0x55555555,
    0xaaaaaaaa,
    0x33333333,
    0xcccccccc,
    0x0f0f0f0f,
    0xf0f0f0f0,
    0x00000000,
    0xffffffff,
  ];
  let patternIdx = 0;

  function loop() {
    if (!self.running || chunks.length === 0) return;

    const sliceStart = performance.now();
    // Continuous 50ms memory saturation slice
    while (performance.now() - sliceStart < 50) {
      const chunk = chunks[chunkIndex % chunks.length];
      const pVal = patterns[patternIdx % patterns.length];
      const len = chunk.length;

      if (patternType === 'bitflip_checker') {
        const step = 4;
        for (let i = 0; i < len; i += step) {
          chunk[i] = pVal;
          chunk[i + 1] = ~pVal;
        }
        for (let i = 0; i < len; i += step) {
          if (chunk[i] !== pVal) errorCount++;
          if (chunk[i + 1] !== (~pVal >>> 0)) errorCount++;
        }
        bytesTransferred += len * 8; // Write + Read
      } else if (patternType === 'cache_thrash') {
        const stride = 4099;
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 0; i < len; i += stride) {
            const idx = (i * 37) % len;
            chunk[idx] = (chunk[idx] ^ 0xabcdef01) + 1;
          }
        }
        bytesTransferred += len * 4;
      } else {
        // High bandwidth sequential + strided read/write
        for (let i = 0; i < len; i += 8) {
          chunk[i] = i ^ pVal;
          chunk[i + 1] = chunk[i] + 7;
          chunk[i + 2] = chunk[i + 1] ^ 0x12345678;
          chunk[i + 3] = chunk[i + 2] + chunk[i];
        }
        bytesTransferred += len * 4;
      }

      chunkIndex++;
      if (chunkIndex % chunks.length === 0) {
        totalPasses++;
        patternIdx++;
      }
    }

    const now = performance.now();
    const elapsed = now - lastReport;
    if (elapsed >= 250) {
      const durSec = elapsed / 1000;
      const bandwidthMbS = (bytesTransferred / (1024 * 1024)) / durSec;
      self.postMessage({
        allocatedMb: actualAllocatedMb,
        bandwidthMbS,
        passes: totalPasses,
        errors: errorCount,
        status: 'Pass ' + totalPasses + ' | 0x' + patterns[patternIdx % patterns.length].toString(16),
      });
      bytesTransferred = 0;
      lastReport = now;
    }

    if (self.running) {
      setTimeout(loop, 0);
    }
  }

  loop();
}
`;

export class RamStressController {
  private worker: Worker | null = null;
  private isRunning: boolean = false;
  private onUpdateCallback?: (update: RamUpdate) => void;

  public start(
    targetMb: number,
    patternType: RamPattern,
    onUpdate: (update: RamUpdate) => void
  ) {
    this.stop();
    this.isRunning = true;
    this.onUpdateCallback = onUpdate;

    const blob = new Blob([ramWorkerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);

    try {
      this.worker = new Worker(workerUrl);
      this.worker.onmessage = (e) => {
        if (!this.isRunning) return;
        this.onUpdateCallback?.(e.data);
      };

      this.worker.postMessage({
        command: 'start',
        targetMb,
        patternType,
      });
    } catch (err) {
      console.warn('Failed to spawn RAM stress worker:', err);
    }

    URL.revokeObjectURL(workerUrl);
  }

  public stop() {
    this.isRunning = false;
    if (this.worker) {
      try {
        this.worker.postMessage({ command: 'stop' });
        this.worker.terminate();
      } catch {
        // ignore
      }
      this.worker = null;
    }
  }
}
