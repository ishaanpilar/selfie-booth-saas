import QRCode from "qrcode";

export async function renderQrToCanvas(text: string, sizePx: number, colors: { dark: string; light: string }): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, text, {
    width: sizePx,
    margin: 0,
    color: { dark: colors.dark, light: colors.light },
    errorCorrectionLevel: "M",
  });
  return canvas;
}
