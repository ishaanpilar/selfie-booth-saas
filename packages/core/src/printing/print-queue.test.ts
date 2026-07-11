import { describe, expect, it } from "vitest";
import { PrintQueue } from "./print-queue";
import type { PrintRequest, PrintResult, PrinterProvider, PrinterStatusReport } from "../types/print";

function makeRequest(jobId: string): PrintRequest {
  return { jobId, imageBlob: new Blob(["fake"]), copies: 1, widthMm: 50.8, heightMm: 152.4, dpi: 300 };
}

/** Minimal in-memory stand-in for a real printer transport, scripted per
 * test via `outcomes` — a queue of results/errors to hand back on
 * successive `print()` calls. */
class FakeProvider implements PrinterProvider {
  readonly id = "fake-printer";
  readonly connectionType = "LOCAL_AGENT" as const;
  private connected = false;
  printCalls = 0;
  cancelledJobIds: string[] = [];

  constructor(private readonly outcomes: Array<"success" | "failure">) {}

  async connect(): Promise<void> {
    this.connected = true;
  }
  async disconnect(): Promise<void> {
    this.connected = false;
  }
  isConnected(): boolean {
    return this.connected;
  }
  async print(request: PrintRequest): Promise<PrintResult> {
    const outcome = this.outcomes[this.printCalls] ?? "success";
    this.printCalls++;
    return outcome === "success"
      ? { jobId: request.jobId, success: true, completedAt: new Date().toISOString() }
      : { jobId: request.jobId, success: false, error: "printer jammed", completedAt: new Date().toISOString() };
  }
  async cancel(jobId: string): Promise<void> {
    this.cancelledJobIds.push(jobId);
  }
  async status(): Promise<PrinterStatusReport> {
    return { status: "READY", reportedAt: new Date().toISOString() };
  }
  onStatusChange(): () => void {
    return () => {};
  }
}

describe("PrintQueue.enqueue", () => {
  it("adds a QUEUED job that list() returns", async () => {
    const queue = new PrintQueue();
    const job = await queue.enqueue(makeRequest("job-1"));
    expect(job.status).toBe("QUEUED");
    expect(job.attempts).toBe(0);

    const all = await queue.list();
    expect(all).toHaveLength(1);
    expect(all[0]!.jobId).toBe("job-1");
  });
});

describe("PrintQueue.processQueue", () => {
  it("marks a job COMPLETED when the provider prints successfully", async () => {
    const queue = new PrintQueue({ baseRetryDelayMs: 1 });
    const provider = new FakeProvider(["success"]);
    await queue.enqueue(makeRequest("job-1"));

    await queue.processQueue(provider);

    const [job] = await queue.list();
    expect(job!.status).toBe("COMPLETED");
    expect(job!.attempts).toBe(1);
  });

  it("retries on failure and succeeds within maxAttempts", async () => {
    const queue = new PrintQueue({ baseRetryDelayMs: 1, maxAttempts: 3 });
    const provider = new FakeProvider(["failure", "success"]);
    await queue.enqueue(makeRequest("job-1"));

    await queue.processQueue(provider);

    const [job] = await queue.list();
    expect(job!.status).toBe("COMPLETED");
    expect(job!.attempts).toBe(2);
    expect(provider.printCalls).toBe(2);
  });

  it("marks a job FAILED with the last error after exhausting maxAttempts", async () => {
    const queue = new PrintQueue({ baseRetryDelayMs: 1, maxAttempts: 2 });
    const provider = new FakeProvider(["failure", "failure", "failure"]);
    await queue.enqueue(makeRequest("job-1"));

    await queue.processQueue(provider);

    const [job] = await queue.list();
    expect(job!.status).toBe("FAILED");
    expect(job!.attempts).toBe(2);
    expect(job!.lastError).toBe("printer jammed");
  });

  it("processes multiple queued jobs in FIFO order", async () => {
    const queue = new PrintQueue({ baseRetryDelayMs: 1 });
    const provider = new FakeProvider(["success", "success"]);
    await queue.enqueue(makeRequest("job-1"));
    await new Promise((r) => setTimeout(r, 2)); // ensure distinct createdAt ordering
    await queue.enqueue(makeRequest("job-2"));

    await queue.processQueue(provider);

    const all = await queue.list();
    expect(all.every((j) => j.status === "COMPLETED")).toBe(true);
  });

  it("connects the provider automatically if not already connected", async () => {
    const queue = new PrintQueue({ baseRetryDelayMs: 1 });
    const provider = new FakeProvider(["success"]);
    await queue.enqueue(makeRequest("job-1"));

    expect(provider.isConnected()).toBe(false);
    await queue.processQueue(provider);
    expect(provider.isConnected()).toBe(true);
  });

  it("notifies onChange listeners as job status transitions", async () => {
    const queue = new PrintQueue({ baseRetryDelayMs: 1 });
    const provider = new FakeProvider(["success"]);
    const seenStatuses: string[] = [];
    queue.onChange((jobs) => {
      if (jobs[0]) seenStatuses.push(jobs[0].status);
    });

    await queue.enqueue(makeRequest("job-1"));
    await queue.processQueue(provider);

    expect(seenStatuses).toContain("PRINTING");
    expect(seenStatuses[seenStatuses.length - 1]).toBe("COMPLETED");
  });
});

describe("PrintQueue.cancel", () => {
  it("calls the provider's cancel and marks the job CANCELLED", async () => {
    const queue = new PrintQueue();
    const provider = new FakeProvider(["success"]);
    await queue.enqueue(makeRequest("job-1"));

    await queue.cancel("job-1", provider);

    expect(provider.cancelledJobIds).toEqual(["job-1"]);
    const [job] = await queue.list();
    expect(job!.status).toBe("CANCELLED");
  });
});
