/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TextRenderResult {
  imgData: ImageData;
  dims: { w: number; h: number };
}

/**
 * Renders arbitrary text to an offscreen HTML canvas and produces ImageData
 * suitable for vector tracing with the Marching Squares algorithm.
 */
export function renderTextToImageData(
  text: string,
  fontFamily: string = 'Inter, system-ui, sans-serif',
  isBold: boolean = true,
  isItalic: boolean = false,
  fontSize: number = 72
): TextRenderResult {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const rawText = text.length > 0 ? text : 'Text';
  const lines = rawText.split('\n');

  const weight = isBold ? 'bold' : 'normal';
  const style = isItalic ? 'italic' : 'normal';
  const fontSpec = `${style} ${weight} ${fontSize}px ${fontFamily}`;

  if (!ctx) {
    return {
      imgData: new ImageData(100, 100),
      dims: { w: 100, h: 100 }
    };
  }

  ctx.font = fontSpec;

  // Measure widest line
  let maxLineWidth = 0;
  for (const line of lines) {
    const metrics = ctx.measureText(line || ' ');
    if (metrics.width > maxLineWidth) {
      maxLineWidth = metrics.width;
    }
  }

  const lineHeight = fontSize * 1.25;
  const totalTextHeight = lineHeight * lines.length;

  // Padding ensures Marching Squares has boundary margins for clean closed contour loops
  const padX = 36;
  const padY = 32;

  const w = Math.max(80, Math.ceil(maxLineWidth + padX * 2));
  const h = Math.max(60, Math.ceil(totalTextHeight + padY * 2));

  canvas.width = w;
  canvas.height = h;

  // 1. Fill solid white background (brightness = 255)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // 2. Render solid black text (brightness = 0)
  ctx.fillStyle = '#000000';
  ctx.font = fontSpec;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const startY = h / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, idx) => {
    ctx.fillText(line, w / 2, startY + idx * lineHeight);
  });

  const imgData = ctx.getImageData(0, 0, w, h);
  return {
    imgData,
    dims: { w, h }
  };
}
