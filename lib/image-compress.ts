// Client-side image compression with zero dependencies. Uses the native
// createImageBitmap + canvas pipeline that ships with every modern mobile
// browser (2017+ Android, iOS 10.3+).
//
// A typical 4 MB phone photo comes out the other side at ~200–300 KB at
// quality 0.7, 1280-px longest edge — small enough to upload on 3G in a
// few seconds without sacrificing landmark readability.

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.7;

export type CompressedImage = {
  blob: Blob;
  width: number;
  height: number;
};

export async function compressImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Not an image file.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = fit(bitmap.width, bitmap.height, MAX_EDGE);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable.");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
    });
    if (!blob) throw new Error("Couldn't encode image.");

    return { blob, width, height };
  } finally {
    bitmap.close?.();
  }
}

function fit(w: number, h: number, maxEdge: number) {
  if (w <= maxEdge && h <= maxEdge) return { width: w, height: h };
  if (w >= h) {
    const ratio = maxEdge / w;
    return { width: maxEdge, height: Math.round(h * ratio) };
  }
  const ratio = maxEdge / h;
  return { width: Math.round(w * ratio), height: maxEdge };
}
