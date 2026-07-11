export type CameraSourceKind = "webcam" | "mobile" | "dslr";

export interface CameraFrame {
  blob: Blob;
  widthPx: number;
  heightPx: number;
  capturedAt: string;
}

/**
 * Transport-agnostic capture contract. `WebcamCameraSource` covers both the
 * "webcam" and "mobile" cases (a phone's front/rear camera is just a
 * `getUserMedia` device with a `facingMode` constraint) — the two brief
 * items are the same implementation, one constraint difference.
 *
 * `DslrAgentCameraSource` is the architecture for tethered DSLR shooting:
 * no browser API can drive a DSLR shutter or pull a live-view feed directly,
 * so a local companion process (gphoto2 on Linux/macOS, digiCamControl or
 * the vendor SDK on Windows) owns the USB connection and exposes it over a
 * local WebSocket — mirroring the local print agent's trust model
 * (packages/core/printing/local-agent-provider.ts). The web app never talks
 * to DSLR hardware directly.
 */
export interface CameraSource {
  readonly kind: CameraSourceKind;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  /** Attaches the live preview feed to a <video> element already in the DOM. */
  attachPreview(video: HTMLVideoElement): void;
  captureFrame(): Promise<CameraFrame>;
}

export class CameraSourceError extends Error {
  constructor(
    message: string,
    public readonly code: "PERMISSION_DENIED" | "NO_DEVICE" | "NOT_CONNECTED" | "CAPTURE_FAILED" | "AGENT_UNREACHABLE",
  ) {
    super(message);
    this.name = "CameraSourceError";
  }
}
