import type { PrintRequest, PrintResult, PrinterConnectionType, PrinterProvider, PrinterStatusReport } from "../types/print";

export interface LocalPrintAgentConfig {
  /** e.g. https://127.0.0.1:9443 — the agent binds to loopback only. */
  baseUrl: string;
  /** Bearer token issued during the one-time pairing flow (admin dashboard
   * shows a pairing code; the agent exchanges it for a long-lived token
   * scoped to one booth). Never a shared/global secret. */
  authToken: string;
  printerId: string;
}

/**
 * Talks to the local print agent — a small native service (see
 * `docs/print-agent-protocol.md` in apps/web) that runs on the booth
 * machine, owns the OS-level printer driver/queue, and is the recommended
 * production transport (WebUSB is the optional fallback for the narrow set
 * of dye-sub printers that expose a usable USB protocol; most enterprise
 * photo printers require vendor drivers WebUSB cannot reach).
 *
 * Security model: the agent only accepts loopback connections, requires a
 * bearer token obtained via a one-time pairing code (never transmitted over
 * the network in plaintext outside that single exchange), and rejects any
 * `Origin` header other than the booth app's own origin.
 */
export class LocalPrintAgentProvider implements PrinterProvider {
  readonly id: string;
  readonly connectionType: PrinterConnectionType = "LOCAL_AGENT";

  private connected = false;
  private ws: WebSocket | null = null;
  private statusListeners = new Set<(status: PrinterStatusReport) => void>();

  constructor(private readonly config: LocalPrintAgentConfig) {
    this.id = config.printerId;
  }

  async connect(): Promise<void> {
    const res = await this.request("GET", "/v1/health");
    if (!res.ok) {
      throw new Error(`Print agent unreachable at ${this.config.baseUrl} (HTTP ${res.status}).`);
    }

    const wsUrl = this.config.baseUrl.replace(/^http/, "ws") + "/v1/events";
    this.ws = new WebSocket(wsUrl, ["bearer", this.config.authToken]);
    this.ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data as string) as { type: string; printerId: string; status?: PrinterStatusReport };
      if (msg.type === "status" && msg.printerId === this.config.printerId && msg.status) {
        this.statusListeners.forEach((listener) => listener(msg.status!));
      }
    });
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async print(request: PrintRequest): Promise<PrintResult> {
    const form = new FormData();
    form.append("jobId", request.jobId);
    form.append("printerId", this.config.printerId);
    form.append("copies", String(request.copies));
    form.append("widthMm", String(request.widthMm));
    form.append("heightMm", String(request.heightMm));
    form.append("dpi", String(request.dpi));
    form.append("image", request.imageBlob, `${request.jobId}.png`);

    const res = await this.request("POST", "/v1/print", form);
    if (!res.ok) {
      const error = await res.text().catch(() => res.statusText);
      return { jobId: request.jobId, success: false, error, completedAt: new Date().toISOString() };
    }
    const body = (await res.json()) as { success: boolean; error?: string };
    return { jobId: request.jobId, success: body.success, error: body.error, completedAt: new Date().toISOString() };
  }

  async cancel(jobId: string): Promise<void> {
    await this.request("POST", `/v1/cancel/${jobId}`);
  }

  async status(): Promise<PrinterStatusReport> {
    const res = await this.request("GET", `/v1/status?printerId=${this.config.printerId}`);
    if (!res.ok) {
      return { status: "OFFLINE", message: `Agent returned ${res.status}`, reportedAt: new Date().toISOString() };
    }
    return (await res.json()) as PrinterStatusReport;
  }

  onStatusChange(listener: (status: PrinterStatusReport) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private request(method: string, path: string, body?: BodyInit): Promise<Response> {
    return fetch(`${this.config.baseUrl}${path}`, {
      method,
      body,
      headers: { Authorization: `Bearer ${this.config.authToken}` },
    });
  }
}
