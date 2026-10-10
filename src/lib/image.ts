import exifr from "exifr";
import imageCompression from "browser-image-compression";

export type PreparedPhoto = { file: File; takenAt: Date };

function isHeic(file: File) {
  return /hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type);
}

/**
 * Reads the capture date from EXIF (before compression strips it), converts
 * HEIC to JPEG, then shrinks the image so phone uploads stay small.
 */
export async function preparePhoto(original: File): Promise<PreparedPhoto> {
  let takenAt = new Date(original.lastModified);
  try {
    const exif = await exifr.parse(original, ["DateTimeOriginal"]);
    if (exif?.DateTimeOriginal instanceof Date) takenAt = exif.DateTimeOriginal;
  } catch {
    // No EXIF: fall back to the file's modified time.
  }

  let file = original;
  if (isHeic(original)) {
    const heic2any = (await import("heic2any")).default;
    const out = await heic2any({ blob: original, toType: "image/jpeg", quality: 0.9 });
    const blob = Array.isArray(out) ? out[0] : out;
    file = new File([blob], original.name.replace(/\.hei[cf]$/i, ".jpg"), {
      type: "image/jpeg",
    });
  }

  file = await imageCompression(file, {
    maxSizeMB: 0.6,
    maxWidthOrHeight: 2000,
    useWebWorker: true,
    fileType: "image/jpeg",
  });

  return { file, takenAt };
}
