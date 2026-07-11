import { CameraSourceError, type CameraFrame, type CameraSource } from "./camera-source";

type AgentTextMessage =
  | { type: "liveview"; mimeType: string }
  | { type: "capture-result"; requestId: string; success: true; mimeType: string; widthPx: number; heightPx: number }
  | { type: "capture-result"; requestId: string; success: false; error: string }
  | { type: "status"; connected: boolean; model?: string };

/**
 * DSLR integration architecture.
 *
 * No browser API can open a USB connection to a DSLR, drive its shutter, or
 * pull a tethered live-view feed — that requires vendor SDKs (Canon EDSDK,
 * Nikon SDK) or gphoto2, none of which run in a browser sandbox. The
 * pattern mirrors the local print agent:
 *
 *   DSLR (USB) <-> local capture agent (native process) <-> WebSocket <-> this class
 *
 * The agent is a small always-on service on the booth machine that:
 *  1. Owns the camera SDK/gphoto2 session.
 *  2. Streams live-view frames as {type:"liveview"} JSON header + binary
 *     JPEG payload, one pair per frame, over the same socket.
 *  3. On {type:"capture", requestId}, triggers the shutter and replies with
 *     a {type:"capture-result", ...} header + binary full-resolution image.
 *
 * This class only speaks that protocol; it has no knowledge of which SDK or
 * OS the agent wraps, so swapping Canon <-> Nikon <-> gphoto2 on the agent
 * side requires zero changes here.
 */
export class DslrAgentCameraSource implements CameraSource {
  readonly kind = "dslr" as const;

  private ws: WebSocket | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private canvas = document.createElement("canvas");
  private connected = false;
  private pendingCaptures = new Map<
    string,
    { resolve: (frame: CameraFrame) => void; reject: (err: Error) => void }
  >();
  private pendingBinaryFor: "liveview" | { requestId: string } | null = null;

  constructor(private readonly agentUrl: string = "ws://localhost:8787/dslr") {}

  async connect(): Promise<void> {
    if (this.ws) return;
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.agentUrl);
      socket.binaryType = "arraybuffer";

      const timeout = setTimeout(() => {
        socket.close();
        reject(new CameraSourceError(`Timed out connecting to DSLR agent at ${this.agentUrl}.`, "AGENT_UNREACHABLE"));
      }, 5000);

      socket.addEventListener("open", () => {
        clearTimeout(timeout);
        this.ws = socket;
        this.connected = true;
        resolve();
      });
      socket.addEventListener("error", () => {
        clearTimeout(timeout);
        reject(new CameraSourceError(`Could not reach DSLR agent at ${this.agentUrl}.`, "AGENT_UNREACHABLE"));
      });
      socket.addEventListener("close", () => {
        this.connected = false;
        this.ws = null;
      });
      socket.addEventListener("message", (event) => this.handleMessage(event));
    });
  }

  async disconnect(): Promise<void> {
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  attachPreview(video: HTMLVideoElement): void {
    this.videoEl = video;
  }

  async captureFrame(): Promise<CameraFrame> {
    if (!this.ws || !this.connected) {
      throw new CameraSourceError("DSLR agent is not connected.", "NOT_CONNECTED");
    }
    const requestId = crypto.randomUUID();
    const result = new Promise<CameraFrame>((resolve, reject) => {
      this.pendingCaptures.set(requestId, { resolve, reject });
    });
    this.ws.send(JSON.stringify({ type: "capture", requestId }));

    const capturedTimeout = setTimeout(() => {
      const pending = this.pendingCaptures.get(requestId);
      if (pending) {
        pending.reject(new CameraSourceError("DSLR capture timed out.", "CAPTURE_FAILED"));
        this.pendingCaptures.delete(requestId);
      }
    }, 15000);

    try {
      return await result;
    } finally {
      clearTimeout(capturedTimeout);
    }
  }

  private handleMessage(event: MessageEvent): void {
    if (typeof event.data === "string") {
      const msg = JSON.parse(event.data) as AgentTextMessage;
      if (msg.type === "liveview") {
        this.pendingBinaryFor = "liveview";
      } else if (msg.type === "capture-result") {
        this.pendingBinaryFor = msg.success ? { requestId: msg.requestId } : null;
        if (!msg.success) {
          const pending = this.pendingCaptures.get(msg.requestId);
          pending?.reject(new CameraSourceError(msg.error, "CAPTURE_FAILED"));
          this.pendingCaptures.delete(msg.requestId);
        } else {
          this.pendingCaptureMeta = { requestId: msg.requestId, mimeType: msg.mimeType, widthPx: msg.widthPx, heightPx: msg.heightPx };
        }
      }
      return;
    }

    const bytes = event.data as ArrayBuffer;
    if (this.pendingBinaryFor === "liveview") {
      this.renderLiveviewFrame(bytes);
    } else if (this.pendingBinaryFor && "requestId" in this.pendingBinaryFor) {
      const meta = this.pendingCaptureMeta;
      const pending = this.pendingCaptures.get(this.pendingBinaryFor.requestId);
      if (pending && meta) {
        const blob = new Blob([bytes], { type: meta.mimeType });
        pending.resolve({ blob, widthPx: meta.widthPx, heightPx: meta.heightPx, capturedAt: new Date().toISOString() });
      }
      this.pendingCaptures.delete(this.pendingBinaryFor.requestId);
      this.pendingCaptureMeta = null;
    }
    this.pendingBinaryFor = null;
  }

  private pendingCaptureMeta: { requestId: string; mimeType: string; widthPx: number; heightPx: number } | null = null;

  private renderLiveviewFrame(bytes: ArrayBuffer): void {
    if (!this.videoEl) return;
    const blob = new Blob([bytes], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      this.canvas.width = img.width;
      this.canvas.height = img.height;
      const ctx = this.canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      // The <video> element is repurposed as a poster target for DSLR
      // live-view since MediaStream isn't available for this transport;
      // the preview component swaps in a <canvas> when kind === "dslr".
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  /** Preview surface for DSLR live-view (used instead of the <video> element). */
  getLiveviewCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
