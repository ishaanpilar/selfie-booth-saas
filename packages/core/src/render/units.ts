const MM_PER_INCH = 25.4;

/** Converts millimeters to device pixels at the given print DPI. */
export function pxFromMm(mm: number, dpi: number): number {
  return Math.round((mm / MM_PER_INCH) * dpi);
}

export function mmFromPx(px: number, dpi: number): number {
  return (px / dpi) * MM_PER_INCH;
}

export function inchesFromMm(mm: number): number {
  return mm / MM_PER_INCH;
}
