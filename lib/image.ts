import sharp from "sharp";

export interface ProcessedImage {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
}

// Overlay color definitions
const OVERLAYS = {
  purple: { r: 124, g: 58, b: 237, alpha: 0.7 },
  green: { r: 5, g: 150, b: 105, alpha: 0.7 },
  dark: { r: 17, g: 24, b: 39, alpha: 0.8 },
};

export type OverlayColor = keyof typeof OVERLAYS;

export async function processHeroImage(
  inputBuffer: Buffer,
  overlayColor: OverlayColor,
  title: string
): Promise<ProcessedImage> {
  const color = OVERLAYS[overlayColor];

  // Resize to blog hero dimensions
  const resized = await sharp(inputBuffer)
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .toBuffer();

  // Create a color overlay SVG
  const svgOverlay = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="rgba(${color.r},${color.g},${color.b},${color.alpha})"/>
  <text
    x="60"
    y="315"
    font-family="Arial, sans-serif"
    font-size="52"
    font-weight="bold"
    fill="white"
    text-anchor="start"
    dominant-baseline="middle"
    width="1080"
  >${escapeXml(truncateTitle(title, 60))}</text>
</svg>`;

  const processed = await sharp(resized)
    .composite([
      {
        input: Buffer.from(svgOverlay),
        blend: "over",
      },
    ])
    .jpeg({ quality: 85 })
    .toBuffer();

  return {
    buffer: processed,
    mimeType: "image/jpeg",
    width: 1200,
    height: 630,
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncateTitle(title: string, maxChars: number): string {
  if (title.length <= maxChars) return title;
  return title.slice(0, maxChars - 3) + "...";
}

export async function getImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  const meta = await sharp(buffer).metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0 };
}
