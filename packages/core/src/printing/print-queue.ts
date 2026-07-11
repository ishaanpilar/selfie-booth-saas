import type { PrintJobStatus, PrintRequest, PrinterProvider } from "../types/print";

export interface QueuedPrintJob {
  jobId: string;
  request: PrintRequest;
  status: PrintJobStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Persistence seam for the queue. `apps/web` provides an IndexedDB-backed
 * implementation (packages/core stays free of a browser-storage dependency
 * so it can also run in the print agent / tests), but any adapter that
 * satisfies this shape works — including the `InMemoryPrintQueueStorage`
 * below, used by default and in unit tests.
 */
export interface PrintQueueStorage {
  save(job: QueuedPrintJob): Promise<void>;
  update(jobId: string, patch: Partial<QueuedPrintJob>): Promise<void>;
  getAll(): Promise<QueuedPrintJob[]>;
  remove(jobId: string): Promise<void>;
}

export class InMemoryPrintQueueStorage implements PrintQueueStorage {
  private jobs = new Map<string, QueuedPrintJob>();

  async save(job: QueuedPrintJob): Promise<void> {
    this.jobs.set(job.jobId, job);
  }
  async update(jobId: string, patch: Partial<QueuedPrintJob>): Promise<void> {
    const existing = this.jobs.get(jobId);
    if (existing) this.jobs.set(jobId, { ...existing, ...patch, updatedAt: new Date().toISOString() });
  }
  async getAll(): Promise<QueuedPrintJob[]> {
    return [...this.jobs.values()];
  }
  async remove(jobId: string): Promise<void> {
    this.jobs.delete(jobId);
  }
}

export interface PrintQueueOptions {
  storage?: PrintQueueStorage;
  maxAttempts?: number;
  /** Base delay for exponential backoff between retries, in ms. */
  baseRetryDelayMs?: number;
}

type QueueListener = (jobs: QueuedPrintJob[]) => void;

/**
 * Queues print jobs so a booth can accept guest requests even when the
 * printer is momentarily busy, offline, or out of paper, retries failed
 * jobs with exponential backoff, and supports N copies per job. The queue
 * is provider-agnostic: `processQueue` is handed whichever `PrinterProvider`
 * is currently active (WebUSB or local agent), so a printer swap or
 * reconnect is just a different argument to the same method.
 */
export class PrintQueue {
  private readonly storage: PrintQueueStorage;
  private readonly maxAttempts: number;
  private readonly baseRetryDelayMs: number;
  private listeners = new Set<QueueListener>();
  private processing = false;

  constructor(options: PrintQueueOptions = {}) {
    this.storage = options.storage ?? new InMemoryPrintQueueStorage();
    this.maxAttempts = options.maxAttempts ?? 3;
    this.baseRetryDelayMs = options.baseRetryDelayMs ?? 2000;
  }

  async enqueue(request: PrintRequest): Promise<QueuedPrintJob> {
    const job: QueuedPrintJob = {
      jobId: request.jobId,
      request,
      status: "QUEUED",
      attempts: 0,
      maxAttempts: this.maxAttempts,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.storage.save(job);
    await this.notify();
    return job;
  }

  async cancel(jobId: string, provider?: PrinterProvider): Promise<void> {
    await provider?.cancel(jobId).catch(() => undefined);
    await this.storage.update(jobId, { status: "CANCELLED" });
    await this.notify();
  }

  async list(): Promise<QueuedPrintJob[]> {
    return this.storage.getAll();
  }

  onChange(listener: QueueListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Drains every QUEUED/RETRYING job against `provider`, in FIFO order, one
   * at a time (dye-sub printers cannot interleave jobs). Safe to call
   * repeatedly/concurrently — re-entrant calls are ignored while one drain
   * is already in flight.
   */
  async processQueue(provider: PrinterProvider): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      if (!provider.isConnected()) {
        await provider.connect();
      }

      let jobs = (await this.storage.getAll()).filter((j) => j.status === "QUEUED" || j.status === "RETRYING");
      jobs = jobs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      for (const job of jobs) {
        await this.attemptJob(job, provider);
      }
    } finally {
      this.processing = false;
    }
  }

  private async attemptJob(job: QueuedPrintJob, provider: PrinterProvider): Promise<void> {
    await this.storage.update(job.jobId, { status: "PRINTING" });
    await this.notify();

    const result = await provider.print(job.request);
    const attempts = job.attempts + 1;

    if (result.success) {
      await this.storage.update(job.jobId, { status: "COMPLETED", attempts });
      await this.notify();
      return;
    }

    if (attempts >= job.maxAttempts) {
      await this.storage.update(job.jobId, { status: "FAILED", attempts, lastError: result.error });
      await this.notify();
      return;
    }

    await this.storage.update(job.jobId, { status: "RETRYING", attempts, lastError: result.error });
    await this.notify();

    const backoff = this.baseRetryDelayMs * 2 ** (attempts - 1) + Math.random() * 250;
    await new Promise((resolve) => setTimeout(resolve, backoff));

    const stillPending = (await this.storage.getAll()).find((j) => j.jobId === job.jobId);
    if (stillPending?.status === "RETRYING") {
      await this.attemptJob({ ...job, attempts }, provider);
    }
  }

  private async notify(): Promise<void> {
    const jobs = await this.storage.getAll();
    this.listeners.forEach((listener) => listener(jobs));
  }
}
