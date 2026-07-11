export type PrintJobStatus = "QUEUED" | "PRINTING" | "COMPLETED" | "FAILED" | "CANCELLED" | "RETRYING";

export type PrinterConnectionType = "WEBUSB" | "LOCAL_AGENT" | "CLOUD";

export type PrinterStatusValue = "UNKNOWN" | "READY" | "OFFLINE" | "ERROR" | "OUT_OF_PAPER" | "OUT_OF_INK" | "BUSY";

export interface PrinterStatusReport {
  status: PrinterStatusValue;
  message?: string;
  reportedAt: string;
}

export interface PrintRequest {
  /** Local job id, generated client-side before the server round-trip so the
   * queue can enqueue work immediately, even offline. */
  jobId: string;
  imageBlob: Blob;
  copies: number;
  /** Physical output size, used by providers that need to select a media
   * tray or paper profile (e.g. DNP/Mitsubishi 2x6 strip vs 4x6). */
  widthMm: number;
  heightMm: number;
  dpi: number;
}

export interface PrintResult {
  jobId: string;
  success: boolean;
  error?: string;
  completedAt: string;
}

/**
 * Every print transport (WebUSB dye-sub printer, local print agent, future
 * cloud provider) implements this contract. Consumers (the print queue,
 * the admin dashboard's printer-status panel) only ever talk to this
 * interface, never to a concrete provider — swapping transports is a config
 * change, not a code change.
 */
export interface PrinterProvider {
  readonly id: string;
  readonly connectionType: PrinterConnectionType;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  print(request: PrintRequest): Promise<PrintResult>;
  cancel(jobId: string): Promise<void>;

  status(): Promise<PrinterStatusReport>;
  /** Subscribe to unsolicited status pushes (paper-out mid-job, USB unplug). */
  onStatusChange(listener: (status: PrinterStatusReport) => void): () => void;
}
