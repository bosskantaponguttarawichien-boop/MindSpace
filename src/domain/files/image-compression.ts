const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 0.82;

export const MAX_SOURCE_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_STORED_IMAGE_BYTES = 10 * 1024 * 1024;

export function isSupportedImageType(type: string) {
  return ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(type);
}

export function compressedDimensions(width: number, height: number) {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("This image could not be read."));
    };
    image.src = objectUrl;
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY));
}

/** Keeps animated GIFs intact; converting one would silently discard its animation. */
export async function compressImageForUpload(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  const image = await loadImage(file);
  const dimensions = compressedDimensions(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
  const blob = await canvasBlob(canvas);
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "image"}.webp`, { type: "image/webp", lastModified: file.lastModified });
}
