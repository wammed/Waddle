import { KittyControlKeys } from './types';
import { TauriApi } from '../tauriApi';

export interface DecodedImage {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  byteSize: number;
}

export class KittyDecoder {
  private maxDimension: number;
  private maxPayloadBytes: number;
  private allowedDir: string;

  constructor(
    maxDimension: number = 4096,
    maxPayloadMb: number = 16,
    allowedDir: string = '$HOME/Pictures'
  ) {
    this.maxDimension = maxDimension;
    this.maxPayloadBytes = maxPayloadMb * 1024 * 1024;
    this.allowedDir = allowedDir;
  }

  public updateConfig(maxDimension: number, maxPayloadMb: number, allowedDir: string) {
    this.maxDimension = Math.max(1024, Math.min(8192, maxDimension));
    this.maxPayloadBytes = Math.max(4, Math.min(64, maxPayloadMb)) * 1024 * 1024;
    this.allowedDir = allowedDir;
  }

  /**
   * Decodes a Kitty command payload into an ImageBitmap.
   * Enforces decompression bomb defenses (max dimension) and memory safety.
   */
  public async decode(keys: KittyControlKeys, payload: string): Promise<DecodedImage> {
    const medium = keys.t || 'd';

    // 1. Local file path reference (t=f) or temporary file (t=t)
    if (medium === 'f' || medium === 't') {
      return await this.decodeFile(payload, medium === 't');
    }

    // 2. Direct Base64 transfer (t=d)
    const format = keys.f || 32;

    if (format === 100) {
      // PNG
      return await this.decodePng(payload);
    } else if (format === 32) {
      // RGBA
      return await this.decodeRgba(payload, keys.s, keys.v);
    } else if (format === 24) {
      // RGB
      return await this.decodeRgb(payload, keys.s, keys.v);
    } else {
      throw new Error(`Unsupported Kitty image format f=${format}`);
    }
  }

  private async decodeFile(base64Path: string, isTemp: boolean = false): Promise<DecodedImage> {
    // Decode file path string from Base64
    let filePath: string;
    try {
      filePath = atob(base64Path.trim());
    } catch {
      filePath = base64Path.trim();
    }

    // Call secure Tauri backend command which enforces sandbox & canonicalization (auto-unlinks if isTemp)
    const fileResult = await TauriApi.kittyReadFile(
      filePath,
      this.allowedDir,
      this.maxPayloadBytes,
      this.maxDimension,
      isTemp
    );

    const binary = this.base64ToBytes(fileResult.data);
    const blob = new Blob([binary], { type: fileResult.mime || 'image/png' });
    const bitmap = await createImageBitmap(blob);

    if (bitmap.width > this.maxDimension || bitmap.height > this.maxDimension) {
      bitmap.close();
      throw new Error(
        `EBADMSG: Image dimensions (${bitmap.width}x${bitmap.height}) exceed maximum allowed dimension (${this.maxDimension})`
      );
    }

    return {
      bitmap,
      width: bitmap.width,
      height: bitmap.height,
      byteSize: bitmap.width * bitmap.height * 4,
    };
  }

  private async decodePng(payload: string): Promise<DecodedImage> {
    const bytes = this.base64ToBytes(payload);

    // Fast header check for PNG IHDR dimensions to prevent decompression bombs
    if (
      bytes.length >= 24 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const width = view.getUint32(16, false);
      const height = view.getUint32(20, false);

      if (width > this.maxDimension || height > this.maxDimension) {
        throw new Error(
          `EBADMSG: PNG dimensions (${width}x${height}) exceed limit (${this.maxDimension}px)`
        );
      }
    }

    const blob = new Blob([bytes], { type: 'image/png' });
    const bitmap = await createImageBitmap(blob);

    if (bitmap.width > this.maxDimension || bitmap.height > this.maxDimension) {
      bitmap.close();
      throw new Error(
        `EBADMSG: Decoded PNG dimensions (${bitmap.width}x${bitmap.height}) exceed limit (${this.maxDimension}px)`
      );
    }

    return {
      bitmap,
      width: bitmap.width,
      height: bitmap.height,
      byteSize: bitmap.width * bitmap.height * 4,
    };
  }

  private async decodeRgba(
    payload: string,
    width?: number,
    height?: number
  ): Promise<DecodedImage> {
    if (!width || !height) {
      throw new Error('EBADMSG: Raw RGBA format (f=32) requires s (width) and v (height)');
    }

    if (width > this.maxDimension || height > this.maxDimension) {
      throw new Error(
        `EBADMSG: RGBA dimensions (${width}x${height}) exceed limit (${this.maxDimension}px)`
      );
    }

    const bytes = this.base64ToBytes(payload);
    const expectedLength = width * height * 4;

    if (bytes.length < expectedLength) {
      throw new Error(
        `EBADMSG: RGBA payload length (${bytes.length}) less than expected (${expectedLength})`
      );
    }

    const clamped = new Uint8ClampedArray(bytes.buffer, bytes.byteOffset, expectedLength);
    const imageData = new ImageData(clamped, width, height);
    const bitmap = await createImageBitmap(imageData);

    return {
      bitmap,
      width,
      height,
      byteSize: expectedLength,
    };
  }

  private async decodeRgb(
    payload: string,
    width?: number,
    height?: number
  ): Promise<DecodedImage> {
    if (!width || !height) {
      throw new Error('EBADMSG: Raw RGB format (f=24) requires s (width) and v (height)');
    }

    if (width > this.maxDimension || height > this.maxDimension) {
      throw new Error(
        `EBADMSG: RGB dimensions (${width}x${height}) exceed limit (${this.maxDimension}px)`
      );
    }

    const bytes = this.base64ToBytes(payload);
    const expectedRgbLength = width * height * 3;

    if (bytes.length < expectedRgbLength) {
      throw new Error(
        `EBADMSG: RGB payload length (${bytes.length}) less than expected (${expectedRgbLength})`
      );
    }

    // Expand 3-byte RGB to 4-byte RGBA
    const totalPixels = width * height;
    const rgba = new Uint8ClampedArray(totalPixels * 4);

    let srcIdx = 0;
    let dstIdx = 0;

    for (let p = 0; p < totalPixels; p++) {
      rgba[dstIdx] = bytes[srcIdx];
      rgba[dstIdx + 1] = bytes[srcIdx + 1];
      rgba[dstIdx + 2] = bytes[srcIdx + 2];
      rgba[dstIdx + 3] = 255;
      srcIdx += 3;
      dstIdx += 4;
    }

    const imageData = new ImageData(rgba, width, height);
    const bitmap = await createImageBitmap(imageData);

    return {
      bitmap,
      width,
      height,
      byteSize: totalPixels * 4,
    };
  }

  private base64ToBytes(base64: string): Uint8Array {
    const clean = base64.replace(/\s/g, '');
    const binary = atob(clean);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
