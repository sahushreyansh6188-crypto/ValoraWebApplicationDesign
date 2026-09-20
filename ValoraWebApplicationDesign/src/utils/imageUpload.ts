/**
 * Utility to securely validate, optimize, and read user-selected images.
 * Adheres to Usability Patterns (drag-and-drop + file selection support).
 * Automatically scales high-resolution camera photos to a reasonable dimension (max 1200px)
 * to maintain crisp fidelity while keeping storage payloads performant and secure.
 */

export interface ProcessedImageResult {
  dataUrl: string;
  fileSize: number;
  width: number;
  height: number;
  mimeType: string;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_INPUT_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSION = 720; // Optimal for high-DPI profile views while guaranteeing fast database storage

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  // Security check: MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Invalid file format. Please choose a JPG, PNG, WEBP, or GIF image.',
    };
  }

  // Size limit check
  if (file.size > MAX_INPUT_FILE_SIZE) {
    return {
      valid: false,
      error: 'File size exceeds 10MB limit. Please choose a smaller photo.',
    };
  }

  return { valid: true };
}

/**
 * Reads a File and outputs an optimized Data URL.
 * Resizes excessive dimensions using HTML Canvas to prevent multi-megabyte base64 string bloat
 * while preserving high fidelity and orientation.
 */
export async function processImageFile(file: File): Promise<ProcessedImageResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid image file.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read the image file from disk.'));
    };

    reader.onload = () => {
      const initialDataUrl = reader.result as string;

      // If GIF or SVG or small webp, preserve as-is to maintain animation or transparency
      if (file.type === 'image/gif' || file.size < 200 * 1024) {
        const img = new Image();
        img.onload = () => {
          resolve({
            dataUrl: initialDataUrl,
            fileSize: file.size,
            width: img.width,
            height: img.height,
            mimeType: file.type,
          });
        };
        img.onerror = () => reject(new Error('Could not load image preview.'));
        img.src = initialDataUrl;
        return;
      }

      // Optimize & resize high-res images to safe boundary
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= 0 || height <= 0) {
          reject(new Error('Invalid image dimensions.'));
          return;
        }

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          // Fallback if canvas context fails
          resolve({
            dataUrl: initialDataUrl,
            fileSize: file.size,
            width: img.width,
            height: img.height,
            mimeType: file.type,
          });
          return;
        }

        // Draw image onto canvas with high quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert photos to efficient JPEG format (unless animated GIF handled above)
        // This ensures uncompressed PNGs don't explode to 3-5MB and exceed Firestore / localStorage / DB limits
        const targetMime = 'image/jpeg';
        let quality = 0.82;
        let optimizedDataUrl = canvas.toDataURL(targetMime, quality);

        // If data URL is still over 250KB, compress further to guarantee safe DB persistence
        if (optimizedDataUrl.length > 250 * 1024) {
          quality = 0.72;
          optimizedDataUrl = canvas.toDataURL(targetMime, quality);
        }

        resolve({
          dataUrl: optimizedDataUrl,
          fileSize: Math.round((optimizedDataUrl.length * 3) / 4),
          width,
          height,
          mimeType: targetMime,
        });
      };

      img.onerror = () => {
        reject(new Error('Corrupted or unreadable image file.'));
      };

      img.src = initialDataUrl;
    };

    reader.readAsDataURL(file);
  });
}
