export type PrintMargins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type PrintOrientation = "vertical" | "horizontal";

export type PrintSettings = {
  orientation: PrintOrientation;
  bannerWidthCm: number;
  bannerHeightCm: number;
  margins: PrintMargins;
  bleedCm: number;
  bleedEnabled: boolean;
  dpi: number;
};

export type PrintValidation = {
  valid: boolean;
  errors: string[];
  outputWidthPx: number;
  outputHeightPx: number;
  artWidthCm: number;
  artHeightCm: number;
  totalWidthCm: number;
  totalHeightCm: number;
};

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  orientation: "vertical",
  bannerWidthCm: 90,
  bannerHeightCm: 140,
  margins: { top: 5, right: 5, bottom: 5, left: 5 },
  bleedCm: 2,
  bleedEnabled: true,
  dpi: 150,
};

export const DPI_PRESETS = [150, 200, 300] as const;

export const DPI_TOOLTIP_TEXT =
  "Resolution is selected automatically from the image dimensions and print area. A higher DPI can produce sharper prints, but it cannot create missing detail from a low-resolution original.";

export type DpiRecommendation = {
  recommendedDpi: (typeof DPI_PRESETS)[number];
  maxNativeDpi: number;
  sourceWidthPx: number;
  sourceHeightPx: number;
  upscalesAtCurrentDpi: boolean;
  summary: string;
};

export function getImagePixelSize(image: CanvasImageSource): { width: number; height: number } {
  if ("naturalWidth" in image) {
    const el = image as HTMLImageElement;
    return { width: el.naturalWidth, height: el.naturalHeight };
  }
  const bitmap = image as ImageBitmap;
  return { width: bitmap.width, height: bitmap.height };
}

/** Highest DPI where the source image still fills the artwork area without being upscaled. */
export function computeMaxNativeDpiForArt(
  sourceWidthPx: number,
  sourceHeightPx: number,
  artWidthCm: number,
  artHeightCm: number,
): number {
  if (artWidthCm <= 0 || artHeightCm <= 0 || sourceWidthPx <= 0 || sourceHeightPx <= 0) {
    return 0;
  }
  const dpiFromWidth = (sourceWidthPx * 2.54) / artWidthCm;
  const dpiFromHeight = (sourceHeightPx * 2.54) / artHeightCm;
  return Math.floor(Math.min(dpiFromWidth, dpiFromHeight));
}

export function pickRecommendedDpiPreset(
  maxNativeDpi: number,
  settings: PrintSettings,
): (typeof DPI_PRESETS)[number] {
  const ordered = [...DPI_PRESETS].sort((a, b) => b - a);
  for (const dpi of ordered) {
    if (dpi > maxNativeDpi) continue;
    if (validatePrintSettings({ ...settings, dpi }).valid) return dpi;
  }
  for (const dpi of [...DPI_PRESETS].sort((a, b) => a - b)) {
    if (validatePrintSettings({ ...settings, dpi }).valid) return dpi;
  }
  return DPI_PRESETS[0];
}

export function getDefaultPrintSettingsForImage(
  sourceWidthPx: number,
  sourceHeightPx: number,
): PrintSettings {
  const orientation: PrintOrientation = sourceWidthPx >= sourceHeightPx ? "horizontal" : "vertical";
  const settings: PrintSettings = {
    ...DEFAULT_PRINT_SETTINGS,
    orientation,
    bannerWidthCm: orientation === "horizontal" ? 140 : 90,
    bannerHeightCm: orientation === "horizontal" ? 90 : 140,
  };
  const validation = validatePrintSettings(settings);

  return {
    ...settings,
    dpi: pickRecommendedDpiPreset(
      computeMaxNativeDpiForArt(sourceWidthPx, sourceHeightPx, validation.artWidthCm, validation.artHeightCm),
      settings,
    ),
  };
}

export function getDpiRecommendation(
  sourceWidthPx: number,
  sourceHeightPx: number,
  settings: PrintSettings,
  validation: PrintValidation,
): DpiRecommendation | null {
  if (!validation.valid) return null;

  const maxNativeDpi = computeMaxNativeDpiForArt(
    sourceWidthPx,
    sourceHeightPx,
    validation.artWidthCm,
    validation.artHeightCm,
  );
  const recommendedDpi = pickRecommendedDpiPreset(maxNativeDpi, settings);
  const upscalesAtCurrentDpi = maxNativeDpi > 0 && settings.dpi > maxNativeDpi;

  let summary: string;
  if (maxNativeDpi < 150) {
    summary = `This image (${sourceWidthPx.toLocaleString()} × ${sourceHeightPx.toLocaleString()} px) is limited for the ${validation.artWidthCm.toFixed(1)} × ${validation.artHeightCm.toFixed(1)} cm artwork area. Higher DPI will upscale pixels without adding detail. ${recommendedDpi} DPI is the best available preset.`;
  } else if (maxNativeDpi >= 300) {
    summary = `This image has enough resolution for the artwork area at 300 DPI or above. Use 300 DPI for the sharpest print file.`;
  } else if (settings.dpi === recommendedDpi && !upscalesAtCurrentDpi) {
    summary = `${recommendedDpi} DPI matches your image well (detail up to about ${maxNativeDpi} DPI for this layout).`;
  } else if (upscalesAtCurrentDpi) {
    summary = `${settings.dpi} DPI will upscale the image. Use ${recommendedDpi} DPI to stay within source detail (~${maxNativeDpi} DPI for this artwork size).`;
  } else {
    summary = `Best preset for this image and layout: ${recommendedDpi} DPI (source supports up to ~${maxNativeDpi} DPI without upscaling).`;
  }

  return {
    recommendedDpi,
    maxNativeDpi,
    sourceWidthPx,
    sourceHeightPx,
    upscalesAtCurrentDpi,
    summary,
  };
}

/** Maximum single canvas dimension (conservative browser limit). */
export const MAX_CANVAS_DIMENSION_PX = 16384;

/** Maximum total pixel count for generated output. */
export const MAX_CANVAS_PIXELS = 100_000_000;

export function cmToPx(cm: number, dpi: number): number {
  return Math.round((cm / 2.54) * dpi);
}

export function formatBleedDisplayCm(cm: number): string {
  const rounded = Math.round(cm * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export type BleedSideLabels = {
  top: string;
  bottom: string;
  left: string;
  right: string;
};

/** Labels used on the print file and preview for configured bleed (per side). */
export function getBleedSideLabels(bleedCm: number): BleedSideLabels {
  const value = formatBleedDisplayCm(bleedCm);
  const label = (side: string) => `Bleed ${side}: ${value} cm`;
  return {
    top: label("Top"),
    bottom: label("Bottom"),
    left: label("Left"),
    right: label("Right"),
  };
}

export type MarginSideLabels = BleedSideLabels;

/** Labels used on the print file and preview for configured safe margins (per side). */
export function getMarginSideLabels(margins: PrintMargins): MarginSideLabels {
  const label = (side: string, cm: number) => `Margin ${side}: ${formatBleedDisplayCm(cm)} cm`;
  return {
    top: label("Top", margins.top),
    bottom: label("Bottom", margins.bottom),
    left: label("Left", margins.left),
    right: label("Right", margins.right),
  };
}

export function hasAnyMargin(margins: PrintMargins): boolean {
  return margins.top > 0 || margins.right > 0 || margins.bottom > 0 || margins.left > 0;
}

export function pxToCm(px: number, dpi: number): number {
  return (px / dpi) * 2.54;
}

export function validatePrintSettings(settings: PrintSettings): PrintValidation {
  const errors: string[] = [];
  const { bannerWidthCm, bannerHeightCm, margins, bleedCm, bleedEnabled, dpi } = settings;

  if (!Number.isFinite(bannerWidthCm) || bannerWidthCm <= 0) {
    errors.push("Banner width must be greater than 0 cm.");
  }
  if (!Number.isFinite(bannerHeightCm) || bannerHeightCm <= 0) {
    errors.push("Banner height must be greater than 0 cm.");
  }

  for (const [side, value] of Object.entries(margins)) {
    if (!Number.isFinite(value) || value < 0) {
      errors.push(`Margin (${side}) cannot be negative.`);
    }
  }

  if (bleedEnabled && (!Number.isFinite(bleedCm) || bleedCm < 0)) {
    errors.push("Bleed cannot be negative.");
  }

  if (!Number.isFinite(dpi) || dpi <= 0) {
    errors.push("DPI must be greater than 0.");
  }

  const bleed = bleedEnabled ? bleedCm : 0;
  const totalWidthCm = bannerWidthCm + bleed * 2;
  const totalHeightCm = bannerHeightCm + bleed * 2;
  const artWidthCm = bannerWidthCm - margins.left - margins.right;
  const artHeightCm = bannerHeightCm - margins.top - margins.bottom;

  if (artWidthCm <= 0) {
    errors.push("Left and right margins must be less than the banner width.");
  }
  if (artHeightCm <= 0) {
    errors.push("Top and bottom margins must be less than the banner height.");
  }

  const outputWidthPx = cmToPx(totalWidthCm, dpi);
  const outputHeightPx = cmToPx(totalHeightCm, dpi);
  const totalPixels = outputWidthPx * outputHeightPx;

  if (outputWidthPx > MAX_CANVAS_DIMENSION_PX || outputHeightPx > MAX_CANVAS_DIMENSION_PX) {
    errors.push(
      `Output size (${outputWidthPx.toLocaleString()} × ${outputHeightPx.toLocaleString()} px) exceeds the maximum dimension of ${MAX_CANVAS_DIMENSION_PX.toLocaleString()} px. Try a lower DPI or smaller banner.`,
    );
  }

  if (totalPixels > MAX_CANVAS_PIXELS) {
    errors.push(
      `Output size is too large (${totalPixels.toLocaleString()} pixels). Try a lower DPI or smaller banner.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    outputWidthPx,
    outputHeightPx,
    artWidthCm,
    artHeightCm,
    totalWidthCm,
    totalHeightCm,
  };
}

export function slugifyFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Font size for bleed/margin labels on the exported PNG (scales with print DPI). */
function getPrintAnnotationFontSizePx(dpi: number): number {
  return Math.max(72, Math.round(dpi * 0.48));
}

/** Keep labels as large as possible without overflowing a narrow bleed/margin band. */
function fitAnnotationFontSizeToBand(baseFontSize: number, bandPx: number): number {
  if (bandPx <= 0) return baseFontSize;
  const maxForBand = Math.floor(bandPx * 0.78);
  if (maxForBand < 24) return Math.max(20, maxForBand);
  return Math.min(baseFontSize, maxForBand);
}

function getPrintAnnotationLineWidth(dpi: number): number {
  return Math.max(2, Math.round(dpi / 80));
}

function drawReadableAnnotationText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fillColor: string,
  fontSize: number,
) {
  const outline = Math.max(6, Math.round(fontSize * 0.18));
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = outline;
  ctx.strokeText(text, x, y);
  ctx.lineWidth = Math.max(2, Math.round(outline * 0.45));
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fillColor;
  ctx.fillText(text, x, y);
}

function drawBleedAnnotations(
  ctx: CanvasRenderingContext2D,
  bleedPx: number,
  bleedCm: number,
  canvasWidth: number,
  canvasHeight: number,
  dpi: number,
) {
  const labels = getBleedSideLabels(bleedCm);
  const trimLeft = bleedPx;
  const trimTop = bleedPx;
  const trimWidth = canvasWidth - bleedPx * 2;
  const trimHeight = canvasHeight - bleedPx * 2;

  const baseFontSize = getPrintAnnotationFontSizePx(dpi);
  const bleedBandFontSize = fitAnnotationFontSizeToBand(baseFontSize, bleedPx);
  const lineWidth = getPrintAnnotationLineWidth(dpi);
  const guideColor = "#737373";
  const textColor = "#262626";

  ctx.save();
  ctx.strokeStyle = guideColor;
  ctx.lineWidth = lineWidth;
  ctx.font = `700 ${bleedBandFontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.setLineDash([]);
  ctx.strokeRect(trimLeft + lineWidth / 2, trimTop + lineWidth / 2, trimWidth - lineWidth, trimHeight - lineWidth);

  const drawExtensionLine = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  const midX = canvasWidth / 2;
  const midY = canvasHeight / 2;
  const tick = Math.max(8, Math.round(bleedBandFontSize * 0.35));

  drawExtensionLine(trimLeft, 0, trimLeft, bleedPx);
  drawExtensionLine(trimLeft + trimWidth, 0, trimLeft + trimWidth, bleedPx);
  drawExtensionLine(midX - tick, 0, midX + tick, 0);
  drawExtensionLine(midX - tick, bleedPx, midX + tick, bleedPx);
  drawReadableAnnotationText(ctx, labels.top, midX, bleedPx / 2, textColor, bleedBandFontSize);

  const bottomOuter = canvasHeight;
  drawExtensionLine(trimLeft, bottomOuter - bleedPx, trimLeft, bottomOuter);
  drawExtensionLine(trimLeft + trimWidth, bottomOuter - bleedPx, trimLeft + trimWidth, bottomOuter);
  drawExtensionLine(midX - tick, bottomOuter - bleedPx, midX + tick, bottomOuter - bleedPx);
  drawExtensionLine(midX - tick, bottomOuter, midX + tick, bottomOuter);
  drawReadableAnnotationText(ctx, labels.bottom, midX, bottomOuter - bleedPx / 2, textColor, bleedBandFontSize);

  drawExtensionLine(0, trimTop, bleedPx, trimTop);
  drawExtensionLine(0, trimTop + trimHeight, bleedPx, trimTop + trimHeight);
  ctx.save();
  ctx.translate(bleedPx / 2, midY);
  ctx.rotate(-Math.PI / 2);
  drawReadableAnnotationText(ctx, labels.left, 0, 0, textColor, bleedBandFontSize);
  ctx.restore();

  const rightOuter = canvasWidth;
  drawExtensionLine(rightOuter - bleedPx, trimTop, rightOuter, trimTop);
  drawExtensionLine(rightOuter - bleedPx, trimTop + trimHeight, rightOuter, trimTop + trimHeight);
  ctx.save();
  ctx.translate(rightOuter - bleedPx / 2, midY);
  ctx.rotate(Math.PI / 2);
  drawReadableAnnotationText(ctx, labels.right, 0, 0, textColor, bleedBandFontSize);
  ctx.restore();

  ctx.restore();
}

function drawMarginAnnotations(
  ctx: CanvasRenderingContext2D,
  bleedPx: number,
  marginTopPx: number,
  marginRightPx: number,
  marginBottomPx: number,
  marginLeftPx: number,
  margins: PrintMargins,
  canvasWidth: number,
  canvasHeight: number,
  dpi: number,
) {
  const labels = getMarginSideLabels(margins);
  const trimLeft = bleedPx;
  const trimTop = bleedPx;
  const trimRight = canvasWidth - bleedPx;
  const trimBottom = canvasHeight - bleedPx;
  const trimWidth = trimRight - trimLeft;
  const trimHeight = trimBottom - trimTop;

  const artLeft = trimLeft + marginLeftPx;
  const artTop = trimTop + marginTopPx;
  const artRight = trimRight - marginRightPx;
  const artBottom = trimBottom - marginBottomPx;

  const baseFontSize = getPrintAnnotationFontSizePx(dpi);
  const lineWidth = getPrintAnnotationLineWidth(dpi);
  const guideColor = "#2563eb";
  const textColor = "#1e3a8a";
  const trimColor = "#737373";

  const setLabelFont = (bandPx: number) => {
    const size = fitAnnotationFontSizeToBand(baseFontSize, bandPx);
    ctx.font = `700 ${size}px system-ui, -apple-system, sans-serif`;
    return size;
  };

  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (bleedPx === 0) {
    ctx.strokeStyle = trimColor;
    ctx.setLineDash([]);
    ctx.strokeRect(lineWidth / 2, lineWidth / 2, canvasWidth - lineWidth, canvasHeight - lineWidth);
  }

  ctx.strokeStyle = guideColor;
  const dash = Math.max(6, Math.round(baseFontSize * 0.2));
  ctx.setLineDash([dash, dash]);
  ctx.strokeRect(artLeft, artTop, artRight - artLeft, artBottom - artTop);
  ctx.setLineDash([]);

  const drawExtensionLine = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  const midBannerX = trimLeft + trimWidth / 2;
  const midBannerY = trimTop + trimHeight / 2;
  const tickFor = (labelFontSize: number) => Math.max(8, Math.round(labelFontSize * 0.35));

  if (marginTopPx > 0) {
    const topFontSize = setLabelFont(marginTopPx);
    const tick = tickFor(topFontSize);
    const labelY = trimTop + marginTopPx / 2;
    drawExtensionLine(trimLeft, trimTop, trimLeft, artTop);
    drawExtensionLine(trimRight, trimTop, trimRight, artTop);
    drawExtensionLine(midBannerX - tick, trimTop, midBannerX + tick, trimTop);
    drawExtensionLine(midBannerX - tick, artTop, midBannerX + tick, artTop);
    drawReadableAnnotationText(ctx, labels.top, midBannerX, labelY, textColor, topFontSize);
  }

  if (marginBottomPx > 0) {
    const bottomFontSize = setLabelFont(marginBottomPx);
    const tick = tickFor(bottomFontSize);
    const labelY = artBottom + marginBottomPx / 2;
    drawExtensionLine(trimLeft, artBottom, trimLeft, trimBottom);
    drawExtensionLine(trimRight, artBottom, trimRight, trimBottom);
    drawExtensionLine(midBannerX - tick, artBottom, midBannerX + tick, artBottom);
    drawExtensionLine(midBannerX - tick, trimBottom, midBannerX + tick, trimBottom);
    drawReadableAnnotationText(ctx, labels.bottom, midBannerX, labelY, textColor, bottomFontSize);
  }

  if (marginLeftPx > 0) {
    const leftFontSize = setLabelFont(marginLeftPx);
    const tick = tickFor(leftFontSize);
    const labelX = trimLeft + marginLeftPx / 2;
    drawExtensionLine(trimLeft, trimTop, artLeft, trimTop);
    drawExtensionLine(trimLeft, trimBottom, artLeft, trimBottom);
    drawExtensionLine(trimLeft, midBannerY - tick, trimLeft, midBannerY + tick);
    drawExtensionLine(artLeft, midBannerY - tick, artLeft, midBannerY + tick);
    ctx.save();
    ctx.translate(labelX, midBannerY);
    ctx.rotate(-Math.PI / 2);
    drawReadableAnnotationText(ctx, labels.left, 0, 0, textColor, leftFontSize);
    ctx.restore();
  }

  if (marginRightPx > 0) {
    const rightFontSize = setLabelFont(marginRightPx);
    const tick = tickFor(rightFontSize);
    const labelX = artRight + marginRightPx / 2;
    drawExtensionLine(artRight, trimTop, trimRight, trimTop);
    drawExtensionLine(artRight, trimBottom, trimRight, trimBottom);
    drawExtensionLine(artRight, midBannerY - tick, artRight, midBannerY + tick);
    drawExtensionLine(trimRight, midBannerY - tick, trimRight, midBannerY + tick);
    ctx.save();
    ctx.translate(labelX, midBannerY);
    ctx.rotate(Math.PI / 2);
    drawReadableAnnotationText(ctx, labels.right, 0, 0, textColor, rightFontSize);
    ctx.restore();
  }

  ctx.restore();
}

function drawCoveredImage(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const imgWidth =
    "naturalWidth" in image ? (image as HTMLImageElement).naturalWidth : (image as ImageBitmap).width;
  const imgHeight =
    "naturalHeight" in image
      ? (image as HTMLImageElement).naturalHeight
      : (image as ImageBitmap).height;

  const scale = Math.max(width / imgWidth, height / imgHeight);
  const drawWidth = imgWidth * scale;
  const drawHeight = imgHeight * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function drawPrintZoneBackgrounds(
  ctx: CanvasRenderingContext2D,
  bleedPx: number,
  marginTopPx: number,
  marginRightPx: number,
  marginBottomPx: number,
  marginLeftPx: number,
  canvasWidth: number,
  canvasHeight: number,
) {
  const trimLeft = bleedPx;
  const trimTop = bleedPx;
  const trimRight = canvasWidth - bleedPx;
  const trimBottom = canvasHeight - bleedPx;

  ctx.fillStyle = "#dbeafe";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(trimLeft, trimTop, trimRight - trimLeft, trimBottom - trimTop);

  ctx.fillStyle = "#fef3c7";
  ctx.fillRect(trimLeft, trimTop, trimRight - trimLeft, marginTopPx);
  ctx.fillRect(trimLeft, trimBottom - marginBottomPx, trimRight - trimLeft, marginBottomPx);
  ctx.fillRect(trimLeft, trimTop, marginLeftPx, trimBottom - trimTop);
  ctx.fillRect(trimRight - marginRightPx, trimTop, marginRightPx, trimBottom - trimTop);
}

/** Longest canvas edge when generating the on-screen preview (same layout as export). */
export const PREVIEW_MAX_EDGE_PX = 1024;

export function getPreviewPrintRenderPlan(settings: PrintSettings): {
  settings: PrintSettings;
  validation: PrintValidation;
} {
  const fullValidation = validatePrintSettings(settings);
  if (!fullValidation.valid) {
    return { settings, validation: fullValidation };
  }

  let previewSettings = settings;
  let validation = fullValidation;
  let maxDim = Math.max(validation.outputWidthPx, validation.outputHeightPx);

  for (let step = 0; step < 32 && maxDim > PREVIEW_MAX_EDGE_PX && previewSettings.dpi > 48; step++) {
    const ratio = PREVIEW_MAX_EDGE_PX / maxDim;
    const nextDpi = Math.max(48, Math.floor(previewSettings.dpi * ratio));
    previewSettings = {
      ...previewSettings,
      dpi: nextDpi >= previewSettings.dpi ? previewSettings.dpi - 1 : nextDpi,
    };
    validation = validatePrintSettings(previewSettings);
    if (!validation.valid) break;
    maxDim = Math.max(validation.outputWidthPx, validation.outputHeightPx);
  }

  return { settings: previewSettings, validation };
}

export function renderPrintCanvas(
  image: CanvasImageSource,
  settings: PrintSettings,
  validation: PrintValidation,
): HTMLCanvasElement {
  const { margins, bleedCm, bleedEnabled, dpi } = settings;
  const bleed = bleedEnabled ? bleedCm : 0;

  const canvas = document.createElement("canvas");
  canvas.width = validation.outputWidthPx;
  canvas.height = validation.outputHeightPx;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context.");

  const bleedPx = cmToPx(bleed, dpi);
  const marginTopPx = cmToPx(margins.top, dpi);
  const marginRightPx = cmToPx(margins.right, dpi);
  const marginBottomPx = cmToPx(margins.bottom, dpi);
  const marginLeftPx = cmToPx(margins.left, dpi);

  const artX = bleedPx + marginLeftPx;
  const artY = bleedPx + marginTopPx;
  const artWidthPx = canvas.width - bleedPx * 2 - marginLeftPx - marginRightPx;
  const artHeightPx = canvas.height - bleedPx * 2 - marginTopPx - marginBottomPx;

  drawPrintZoneBackgrounds(
    ctx,
    bleedPx,
    marginTopPx,
    marginRightPx,
    marginBottomPx,
    marginLeftPx,
    canvas.width,
    canvas.height,
  );
  drawCoveredImage(ctx, image, artX, artY, artWidthPx, artHeightPx);

  if (bleedEnabled && bleed > 0 && bleedPx > 0) {
    drawBleedAnnotations(ctx, bleedPx, bleedCm, canvas.width, canvas.height, dpi);
  }

  if (hasAnyMargin(margins)) {
    drawMarginAnnotations(
      ctx,
      bleedPx,
      marginTopPx,
      marginRightPx,
      marginBottomPx,
      marginLeftPx,
      margins,
      canvas.width,
      canvas.height,
      dpi,
    );
  }

  return canvas;
}

export async function generatePrintImage(
  image: CanvasImageSource,
  settings: PrintSettings,
  validation: PrintValidation,
): Promise<Blob> {
  const canvas = renderPrintCanvas(image, settings, validation);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Failed to generate image blob."));
      },
      "image/png",
      1,
    );
  });

  return embedPngDpi(blob, settings.dpi);
}

/** Inject pHYs chunk into PNG to embed DPI metadata (pixels per meter). */
function embedPngDpi(blob: Blob, dpi: number): Promise<Blob> {
  return blob.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 8 || bytes[0] !== 0x89) return blob;

    const ppm = Math.round(dpi / 0.0254);
    const physData = new Uint8Array(9);
    const view = new DataView(physData.buffer);
    view.setUint32(0, ppm, false);
    view.setUint32(4, ppm, false);
    view.setUint8(8, 1);

    const physChunk = createPngChunk("pHYs", physData);

    const signatureEnd = 8;
    let ihdrEnd = signatureEnd;
    const ihdrLength = readUint32(bytes, signatureEnd);
    ihdrEnd = signatureEnd + 4 + ihdrLength + 4 + 4;

    const before = bytes.slice(0, ihdrEnd);
    const after = bytes.slice(ihdrEnd);
    const combined = new Uint8Array(before.length + physChunk.length + after.length);
    combined.set(before, 0);
    combined.set(physChunk, before.length);
    combined.set(after, before.length + physChunk.length);

    return new Blob([combined], { type: "image/png" });
  });
}

function readUint32(data: Uint8Array, offset: number): number {
  return (
    ((data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]) >>> 0
  );
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const chunk = new Uint8Array(4 + 4 + data.length + 4);
  const view = new DataView(chunk.buffer);

  view.setUint32(0, data.length, false);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);

  const crcInput = new Uint8Array(4 + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, 4);
  view.setUint32(8 + data.length, crc32(crcInput), false);

  return chunk;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildPrintFilenames(slug: string, settings: PrintSettings) {
  const base = `${slugifyFilename(slug)}-${settings.bannerWidthCm}x${settings.bannerHeightCm}cm-${settings.dpi}dpi-print`;
  return {
    image: `${base}.png`,
  };
}
