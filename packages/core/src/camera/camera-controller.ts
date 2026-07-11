import type { CameraFrame, CameraSource } from "./camera-source";

export interface CountdownOptions {
  seconds: number;
  onTick?: (secondsRemaining: number) => void;
  signal?: AbortSignal;
}

export interface BurstOptions {
  count: number;
  intervalMs: number;
  countdownSeconds?: number;
  onCountdownTick?: (secondsRemaining: number, photoIndex: number) => void;
  onFrame?: (frame: CameraFrame, photoIndex: number) => void;
  signal?: AbortSignal;
}

/**
 * Orchestrates a `CameraSource` (webcam/mobile/DSLR — transport is opaque
 * here) through the guest-facing capture flow: countdown, single capture,
 * or a full burst sequence with a countdown before each frame.
 */
export class CameraController {
  constructor(private readonly source: CameraSource) {}

  get kind() {
    return this.source.kind;
  }

  async start(): Promise<void> {
    await this.source.connect();
  }

  async stop(): Promise<void> {
    await this.source.disconnect();
  }

  attachPreview(video: HTMLVideoElement): void {
    this.source.attachPreview(video);
  }

  async runCountdown({ seconds, onTick, signal }: CountdownOptions): Promise<void> {
    for (let remaining = seconds; remaining > 0; remaining--) {
      if (signal?.aborted) throw new DOMException("Countdown aborted", "AbortError");
      onTick?.(remaining);
      await delay(1000, signal);
    }
    onTick?.(0);
  }

  async captureSingle(countdownSeconds = 0, onTick?: (n: number) => void): Promise<CameraFrame> {
    if (countdownSeconds > 0) {
      await this.runCountdown({ seconds: countdownSeconds, onTick });
    }
    return this.source.captureFrame();
  }

  /**
   * Captures `count` frames, running an independent countdown before each
   * one (so guests get a visual cue between poses rather than a rapid
   * machine-gun burst). Aborting mid-sequence via `signal` returns whatever
   * frames were already captured rather than throwing.
   */
  async captureBurst(options: BurstOptions): Promise<CameraFrame[]> {
    const { count, intervalMs, countdownSeconds = 3, onCountdownTick, onFrame, signal } = options;
    const frames: CameraFrame[] = [];

    for (let i = 0; i < count; i++) {
      if (signal?.aborted) break;

      await this.runCountdown({
        seconds: countdownSeconds,
        onTick: (remaining) => onCountdownTick?.(remaining, i),
        signal,
      }).catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        throw err;
      });

      if (signal?.aborted) break;

      const frame = await this.source.captureFrame();
      frames.push(frame);
      onFrame?.(frame, i);

      if (i < count - 1 && intervalMs > 0) {
        await delay(intervalMs, signal).catch(() => undefined);
      }
    }

    return frames;
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}
