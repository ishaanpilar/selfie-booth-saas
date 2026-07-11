import { CameraSourceError, type CameraFrame, type CameraSource, type CameraSourceKind } from "./camera-source";

export interface WebcamCameraSourceOptions {
  /** "mobile" just selects a facingMode default; same transport as "webcam". */
  kind?: Extract<CameraSourceKind, "webcam" | "mobile">;
  deviceId?: string;
  facingMode?: "user" | "environment";
  idealWidth?: number;
  idealHeight?: number;
}

/**
 * `getUserMedia`-backed capture source, used for desktop webcams, tablet
 * front cameras, and phone front/rear cameras. Frame capture draws the
 * current video frame to an offscreen canvas rather than using
 * `ImageCapture.takePhoto()` — that API is unsupported in Safari, and
 * drawing from `<video>` works identically everywhere getUserMedia does.
 */
export class WebcamCameraSource implements CameraSource {
  readonly kind: CameraSourceKind;
  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private readonly options: WebcamCameraSourceOptions;

  constructor(options: WebcamCameraSourceOptions = {}) {
    this.options = options;
    this.kind = options.kind ?? "webcam";
  }

  static async listVideoDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "videoinput");
  }

  async connect(): Promise<void> {
    if (this.stream) return;
    const video: MediaTrackConstraints = {
      width: { ideal: this.options.idealWidth ?? 1920 },
      height: { ideal: this.options.idealHeight ?? 1080 },
    };
    if (this.options.deviceId) {
      video.deviceId = { exact: this.options.deviceId };
    } else {
      video.facingMode = this.options.facingMode ?? (this.kind === "mobile" ? "user" : undefined);
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
    } catch (err) {
      if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError")) {
        throw new CameraSourceError("Camera permission was denied.", "PERMISSION_DENIED");
      }
      if (err instanceof DOMException && err.name === "NotFoundError") {
        throw new CameraSourceError("No camera device was found.", "NO_DEVICE");
      }
      throw new CameraSourceError(`Failed to acquire camera stream: ${String(err)}`, "CAPTURE_FAILED");
    }

    if (this.videoEl) {
      this.videoEl.srcObject = this.stream;
      await this.videoEl.play().catch(() => undefined);
    }
  }

  async disconnect(): Promise<void> {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.videoEl) this.videoEl.srcObject = null;
  }

  isConnected(): boolean {
    return this.stream !== null;
  }

  attachPreview(video: HTMLVideoElement): void {
    this.videoEl = video;
    if (this.stream) {
      video.srcObject = this.stream;
      void video.play().catch(() => undefined);
    }
  }

  async captureFrame(): Promise<CameraFrame> {
    if (!this.videoEl || !this.stream) {
      throw new CameraSourceError("Camera is not connected.", "NOT_CONNECTED");
    }
    const { videoWidth, videoHeight } = this.videoEl;
    const canvas = document.createElement("canvas");
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new CameraSourceError("Canvas 2D context unavailable.", "CAPTURE_FAILED");
    ctx.drawImage(this.videoEl, 0, 0, videoWidth, videoHeight);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 1));
    if (!blob) throw new CameraSourceError("Failed to encode captured frame.", "CAPTURE_FAILED");

    return { blob, widthPx: videoWidth, heightPx: videoHeight, capturedAt: new Date().toISOString() };
  }
}
