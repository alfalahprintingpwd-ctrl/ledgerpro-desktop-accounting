/**
 * Image compression and optimization utilities to prevent LocalStorage Quota Exceeded errors.
 */

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/webp' | 'image/png';
}

/**
 * Compresses an image File or Data URL to a lightweight base64 string
 */
export async function compressImage(
  source: File | string,
  options: ImageCompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 400,
    maxHeight = 400,
    quality = 0.8,
    format = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    // If it's a small SVG or data string, return as is
    if (typeof source === 'string') {
      if (source.startsWith('data:image/svg+xml') || source.length < 15000) {
        return resolve(source);
      }
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Scale dimensions maintaining aspect ratio
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(typeof source === 'string' ? source : '');
      }

      // If PNG with transparency, use PNG format
      const outputFormat =
        format === 'image/png' || (typeof source !== 'string' && source.type === 'image/png')
          ? 'image/png'
          : format;

      if (outputFormat === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL(outputFormat, quality);
      resolve(dataUrl);
    };

    img.onerror = () => {
      // If canvas loading fails, return source if string or empty
      resolve(typeof source === 'string' ? source : '');
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(source);
    }
  });
}

/**
 * Strips heavy data:image payloads from object snapshots
 */
export function cleanBusinessSnapshot(profile?: any): any {
  if (!profile) return undefined;
  // Keep business info but strip redundant base64 image copies from historical snapshot
  const { logoUrl, ceoSignatureUrl, businessStampUrl, ...rest } = profile;
  return rest;
}
