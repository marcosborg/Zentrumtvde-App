import type { Photo } from '@capacitor/camera';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2200;

export async function optimizeUploadFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error('Cada ficheiro deve ter no maximo 10 MB.');
    }

    return file;
  }

  if (file.size <= MAX_UPLOAD_BYTES) {
    return file;
  }

  const image = await loadImage(file);
  let width = image.naturalWidth;
  let height = image.naturalHeight;
  const longestSide = Math.max(width, height);

  if (longestSide > MAX_IMAGE_DIMENSION) {
    const ratio = MAX_IMAGE_DIMENSION / longestSide;
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
  }

  let quality = 0.9;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const blob = await renderJpeg(image, width, height, quality);

    if (blob.size <= MAX_UPLOAD_BYTES) {
      return new File([blob], replaceExtension(file.name, 'jpg'), {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
    }

    if (quality > 0.45) {
      quality = Math.max(0.45, quality - 0.1);
      continue;
    }

    width = Math.max(960, Math.round(width * 0.85));
    height = Math.max(960, Math.round(height * 0.85));
  }

  throw new Error('Nao foi possivel reduzir a imagem para menos de 10 MB.');
}

export async function photoToOptimizedFile(photo: Photo, fileNamePrefix: string): Promise<File> {
  if (!photo.webPath) {
    throw new Error('Imagem indisponivel para upload.');
  }

  const response = await fetch(photo.webPath);
  const blob = await response.blob();
  const extension = normalizeExtension(photo.format || blob.type.split('/')[1] || 'jpg');
  const file = new File([blob], `${fileNamePrefix}-${Date.now()}.${extension}`, {
    type: blob.type || `image/${extension}`,
    lastModified: Date.now(),
  });

  return optimizeUploadFile(file);
}

function normalizeExtension(extension: string): string {
  const normalized = extension.toLowerCase();
  return normalized === 'jpeg' ? 'jpg' : normalized;
}

function replaceExtension(fileName: string, extension: string): string {
  return fileName.replace(/\.[^.]+$/, '') + `.${extension}`;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Nao foi possivel processar a imagem.'));
    };

    image.src = objectUrl;
  });
}

function renderJpeg(
  image: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');

    if (!context) {
      reject(new Error('Canvas indisponivel para compressao.'));
      return;
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Nao foi possivel gerar a imagem comprimida.'));
          return;
        }

        resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });
}
