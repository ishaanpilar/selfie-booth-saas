import type { PrintRequest, PrintResult, PrinterConnectionType, PrinterProvider, PrinterStatusReport } from "../types/print";

export interface WebUsbPrinterConfig {
  printerId: string;
  vendorId: number;
  productId?: number;
  /** Vendor-specific bulk transfer protocol. WebUSB reaches the raw USB
   * pipe only — turning a PNG into bytes the printer understands is vendor
   * proprietary, so it's injected rather than hard-coded here. */
  encodeJob: (request: PrintRequest) => Promise<Uint8Array>;
  outEndpointNumber?: number;
  inEndpointNumber?: number;
}

/**
 * Optional compatible transport for the handful of dye-sub photo printers
 * that expose a workable WebUSB interface. Requires a user gesture to grant
 * device access (`navigator.usb.requestDevice`) and only works in
 * Chromium-based browsers, which is why `LocalPrintAgentProvider` — not
 * this class — is the primary, recommended path for enterprise deployments.
 */
export class WebUsbPrinterProvider implements PrinterProvider {
  readonly id: string;
  readonly connectionType: PrinterConnectionType = "WEBUSB";

  private device: USBDevice | null = null;
  private statusListeners = new Set<(status: PrinterStatusReport) => void>();
  private pollHandle: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly config: WebUsbPrinterConfig) {
    this.id = config.printerId;
  }

  static isSupported(): boolean {
    return typeof navigator !== "undefined" && "usb" in navigator;
  }

  async connect(): Promise<void> {
    if (!WebUsbPrinterProvider.isSupported()) {
      throw new Error("WebUSB is not supported in this browser.");
    }

    const filters = [{ vendorId: this.config.vendorId, ...(this.config.productId ? { productId: this.config.productId } : {}) }];
    this.device = await navigator.usb.requestDevice({ filters });
    await this.device.open();
    if (this.device.configuration === null) {
      await this.device.selectConfiguration(1);
    }
    const printerInterface = this.device.configuration!.interfaces[0]!;
    await this.device.claimInterface(printerInterface.interfaceNumber);

    this.pollHandle = setInterval(() => {
      this.status().then((s) => this.statusListeners.forEach((l) => l(s)));
    }, 5000);
  }

  async disconnect(): Promise<void> {
    if (this.pollHandle) clearInterval(this.pollHandle);
    if (this.device?.opened) await this.device.close();
    this.device = null;
  }

  isConnected(): boolean {
    return this.device?.opened ?? false;
  }

  async print(request: PrintRequest): Promise<PrintResult> {
    if (!this.device) {
      return { jobId: request.jobId, success: false, error: "Printer not connected.", completedAt: new Date().toISOString() };
    }
    try {
      const payload = await this.config.encodeJob(request);
      const endpoint = this.config.outEndpointNumber ?? 1;
      for (let copy = 0; copy < request.copies; copy++) {
        // `encodeJob` is vendor-supplied and only guaranteed to return an
        // ArrayBuffer-backed view; TS's typed-array generics can't express
        // that narrowing across the injected function boundary.
        const result = await this.device.transferOut(endpoint, payload as Uint8Array<ArrayBuffer>);
        if (result.status !== "ok") {
          throw new Error(`USB transfer failed with status "${result.status}".`);
        }
      }
      return { jobId: request.jobId, success: true, completedAt: new Date().toISOString() };
    } catch (err) {
      return { jobId: request.jobId, success: false, error: String(err), completedAt: new Date().toISOString() };
    }
  }

  async cancel(): Promise<void> {
    // Most WebUSB-reachable dye-sub printers have no in-protocol cancel;
    // once bytes are transferred the job is committed. Left as a no-op so
    // the interface stays uniform across providers.
  }

  async status(): Promise<PrinterStatusReport> {
    if (!this.device || !this.isConnected()) {
      return { status: "OFFLINE", reportedAt: new Date().toISOString() };
    }
    try {
      const inEndpoint = this.config.inEndpointNumber ?? 2;
      const result = await this.device.transferIn(inEndpoint, 64);
      if (result.status === "ok" && result.data) {
        return { status: "READY", reportedAt: new Date().toISOString() };
      }
      return { status: "UNKNOWN", reportedAt: new Date().toISOString() };
    } catch {
      return { status: "ERROR", reportedAt: new Date().toISOString() };
    }
  }

  onStatusChange(listener: (status: PrinterStatusReport) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }
}
