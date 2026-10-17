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
  const { command, algorithm, batchSize } = e.data;
  if (command === 'stop') {
    self.running = false;
    return;
  }
  if (command === 'start') {
    self.running = true;
    runLoop(algorithm, batchSize || 1000);
  }
};

function runLoop(algorithm, batchSize) {
  let errorCount = 0;
  
  function step() {
    if (!self.running) return;
    const startTime = performance.now();
    let ops = 0;

    if (algorithm === 'sgemm_matrix') {
      // Dense Matrix Multiplication 32x32
      const N = 32;
      const A = new Float64Array(N * N);
      const B = new Float64Array(N * N);
      const C = new Float64Array(N * N);
      for (let i = 0; i < N * N; i++) {
        A[i] = (i % 7) * 0.125;
        B[i] = (i % 11) * 0.25;
      }
      for (let iter = 0; iter < 120; iter++) {
        for (let i = 0; i < N; i++) {
          for (let k = 0; k < N; k++) {
            const aik = A[i * N + k];
            for (let j = 0; j < N; j++) {
              C[i * N + j] += aik * B[k * N + j];
            }
          }
        }
        ops += 2 * N * N * N;
      }
      // Sanity check
      if (isNaN(C[0])) errorCount++;
    } else if (algorithm === 'sha256_hash') {
      // Cryptographic bitwise pressure
      let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
      for (let i = 0; i < 40000; i++) {
        let w = (i ^ 0x5a5a5a5a) + (h0 >>> 3);
        h0 = (h0 + ((h1 << 5) | (h1 >>> 27)) + (h2 ^ h3) + w) | 0;
        h1 = (h1 ^ h0 ^ (h2 << 2)) | 0;
        h2 = (h2 + (h3 >>> 4)) | 0;
        h3 = (h3 ^ (h0 << 1)) | 0;
        ops += 16;
      }
      if (h0 === 0 && h1 === 0) errorCount++;
    } else if (algorithm === 'prime_sieve') {
      // Sieve & polynomial math
      const limit = 25000;
      const isPrime = new Uint8Array(limit);
      isPrime.fill(1);
      isPrime[0] = 0;
      isPrime[1] = 0;
      for (let p = 2; p * p < limit; p++) {
        if (isPrime[p]) {
          for (let i = p * p; i < limit; i += p) {
            isPrime[i] = 0;
          }
        }
      }
      let sum = 0;
      for (let i = 0; i < limit; i++) {
        if (isPrime[i]) sum += Math.sin(i) * Math.cos(i);
      }
      ops += limit * 5;
      if (isNaN(sum)) errorCount++;
    } else {
      // Monte Carlo Ray-Sphere Tracer calculation
      let hits = 0;
      const samples = 35000;
      for (let s = 0; s < samples; s++) {
        const rx = Math.random() * 2 - 1;
        const ry = Math.random() * 2 - 1;
        const rz = Math.random() * 2 - 1;
        const lenSq = rx * rx + ry * ry + rz * rz;
        if (lenSq <= 1.0) hits++;
        ops += 10;
      }
      if (hits > samples) errorCount++;
    }

    const durationMs = Math.max(0.1, performance.now() - startTime);
    const gflops = (ops / (durationMs / 1000)) / 1e9;

    self.postMessage({
      ops,
      gflops,
      errors: errorCount,
    });

    // Schedule next iteration immediately
    setTimeout(step, 0);
  }

  step();
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
