/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CpuAlgorithm } from '../types/benchmark';

export interface CpuProgressUpdate {
  threadIndex: number;
  ops: number;
  gflops: number;
  errors: number;
}

// Worker source code to run in isolated Web Worker threads
const workerScript = `
self.onmessage = function(e) {
  const { command, algorithm } = e.data;
  if (command === 'stop') {
    self.running = false;
    return;
  }
  if (command === 'start') {
    self.running = true;
    runLoop(algorithm || 'sgemm_matrix');
  }
};

function runLoop(algorithm) {
  let errorCount = 0;
  let totalOps = 0;
  let lastReport = performance.now();

  // Pre-allocate buffers once to prevent garbage collection pauses
  const N = 48;
  const A = new Float64Array(N * N);
  const B = new Float64Array(N * N);
  const C = new Float64Array(N * N);
  for (let i = 0; i < N * N; i++) {
    A[i] = (i % 17) * 0.125 + 1.0;
    B[i] = (i % 23) * 0.0625 + 0.5;
  }

  const sieveSize = 65536;
  const isPrime = new Uint8Array(sieveSize);

  function stressSlice() {
    if (!self.running) return;
    const sliceStart = performance.now();

    // 100ms of continuous, unbroken compute loop to saturate CPU core to 100%!
    while (performance.now() - sliceStart < 100) {
      if (algorithm === 'sgemm_matrix') {
        for (let iter = 0; iter < 50; iter++) {
          for (let i = 0; i < N; i++) {
            const iN = i * N;
            for (let k = 0; k < N; k++) {
              const aik = A[iN + k];
              const kN = k * N;
              for (let j = 0; j < N; j++) {
                C[iN + j] += aik * B[kN + j];
              }
            }
          }
          totalOps += 2 * N * N * N;
        }
        if (isNaN(C[0])) errorCount++;
      } else if (algorithm === 'sha256_hash') {
        let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
        for (let iter = 0; iter < 150000; iter++) {
          let w = (iter ^ 0x5a5a5a5a) + (h0 >>> 3);
          h0 = (h0 + ((h1 << 5) | (h1 >>> 27)) + (h2 ^ h3) + w) | 0;
          h1 = (h1 ^ h0 ^ (h2 << 2)) | 0;
          h2 = (h2 + (h3 >>> 4)) | 0;
          h3 = (h3 ^ (h0 << 1)) | 0;
        }
        totalOps += 150000 * 16;
        if (h0 === 0 && h1 === 0) errorCount++;
      } else if (algorithm === 'prime_sieve') {
        isPrime.fill(1);
        isPrime[0] = 0;
        isPrime[1] = 0;
        for (let p = 2; p * p < sieveSize; p++) {
          if (isPrime[p]) {
            for (let i = p * p; i < sieveSize; i += p) {
              isPrime[i] = 0;
            }
          }
        }
        let sum = 0;
        for (let i = 0; i < sieveSize; i += 4) {
          sum += isPrime[i] * Math.sin(i);
        }
        totalOps += sieveSize * 8;
        if (isNaN(sum)) errorCount++;
      } else {
        // Monte Carlo Ray-Sphere Tracer
        let hits = 0;
        for (let s = 0; s < 120000; s++) {
          const rx = (s * 0.0001) % 2 - 1;
          const ry = (s * 0.0003) % 2 - 1;
          const rz = (s * 0.0007) % 2 - 1;
          if (rx * rx + ry * ry + rz * rz <= 1.0) hits++;
        }
        totalOps += 120000 * 10;
        if (hits < 0) errorCount++;
      }
    }

    const now = performance.now();
    const elapsed = now - lastReport;
    if (elapsed >= 250) {
      const gflops = (totalOps / (elapsed / 1000)) / 1e9;
      self.postMessage({
        ops: totalOps,
        gflops,
        errors: errorCount,
      });
      totalOps = 0;
      lastReport = now;
    }

    if (self.running) {
      // Continue immediately without sleeping
      setTimeout(stressSlice, 0);
    }
  }

  stressSlice();
}
`;

export class CpuStressController {
  private workers: Worker[] = [];
  private isRunning: boolean = false;
  private onUpdateCallback?: (update: CpuProgressUpdate) => void;

  public start(
    threads: number,
    algorithm: CpuAlgorithm,
    onUpdate: (update: CpuProgressUpdate) => void
  ) {
    this.stop();
    this.isRunning = true;
    this.onUpdateCallback = onUpdate;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);

    const safeThreads = Math.max(1, Math.min(threads, 64));

    for (let i = 0; i < safeThreads; i++) {
      try {
        const worker = new Worker(workerUrl);
        const threadIndex = i;

        worker.onmessage = (e) => {
          if (!this.isRunning) return;
          const { ops, gflops, errors } = e.data;
          this.onUpdateCallback?.({
            threadIndex,
            ops,
            gflops,
            errors,
          });
        };

        worker.postMessage({
          command: 'start',
          algorithm,
        });

        this.workers.push(worker);
      } catch (err) {
        console.warn(`Failed to spawn CPU worker thread ${i}:`, err);
      }
    }

    // Revoke object URL after initialization
    URL.revokeObjectURL(workerUrl);
  }

  public stop() {
    this.isRunning = false;
    for (const worker of this.workers) {
      try {
        worker.postMessage({ command: 'stop' });
        worker.terminate();
      } catch {
        // ignore
      }
    }
    this.workers = [];
  }

  public getActiveWorkerCount(): number {
    return this.workers.length;
  }
}
