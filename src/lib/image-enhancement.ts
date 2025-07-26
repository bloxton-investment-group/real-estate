/**
 * Image enhancement utilities for better OCR accuracy
 */

export interface EnhancementOptions {
  contrast?: number;
  brightness?: number;
  sharpness?: number;
  removeNoise?: boolean;
  binarize?: boolean;
  dpi?: number;
}

export class ImageEnhancer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Enhance image for better OCR accuracy
   */
  async enhanceForOCR(
    imageBlob: Blob, 
    options: EnhancementOptions = {}
  ): Promise<Blob> {
    const {
      contrast = 1.3,
      brightness = 1.1,
      sharpness = 1.2,
      removeNoise = true,
      binarize = false,
      dpi = 300
    } = options;

    // Load image
    const img = await this.loadImage(imageBlob);
    
    // Set up canvas with optimal size for OCR
    const scale = Math.max(1, dpi / 96); // Scale based on DPI
    this.canvas.width = img.width * scale;
    this.canvas.height = img.height * scale;

    // Draw image with enhancements
    this.ctx.imageSmoothingEnabled = false; // Preserve sharp edges
    
    // Apply basic filters
    this.ctx.filter = `contrast(${contrast}) brightness(${brightness})`;
    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);

    // Apply additional processing
    let imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    if (removeNoise) {
      imageData = this.removeNoise(imageData);
    }
    
    if (sharpness > 1) {
      imageData = this.sharpenImage(imageData, sharpness);
    }
    
    if (binarize) {
      imageData = this.binarizeImage(imageData);
    }

    // Put enhanced image data back
    this.ctx.putImageData(imageData, 0, 0);

    // Convert to blob
    return new Promise<Blob>((resolve) => {
      this.canvas.toBlob((blob) => resolve(blob!), 'image/png');
    });
  }

  private async loadImage(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  private removeNoise(imageData: ImageData): ImageData {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const newData = new Uint8ClampedArray(data);

    // Simple median filter for noise reduction
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // Get surrounding pixels
        const neighbors = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            neighbors.push(data[nIdx]); // Red channel (grayscale)
          }
        }
        
        // Apply median
        neighbors.sort((a, b) => a - b);
        const median = neighbors[4]; // Middle value
        
        newData[idx] = median;     // R
        newData[idx + 1] = median; // G
        newData[idx + 2] = median; // B
        // Alpha stays the same
      }
    }

    return new ImageData(newData, width, height);
  }

  private sharpenImage(imageData: ImageData, intensity: number): ImageData {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const newData = new Uint8ClampedArray(data);

    // Sharpening kernel
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const nIdx = ((y + ky) * width + (x + kx)) * 4;
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            sum += data[nIdx] * kernel[kernelIdx];
          }
        }
        
        // Apply sharpening with intensity control
        const original = data[idx];
        const sharpened = Math.max(0, Math.min(255, sum));
        const result = original + (sharpened - original) * (intensity - 1);
        
        newData[idx] = result;     // R
        newData[idx + 1] = result; // G
        newData[idx + 2] = result; // B
      }
    }

    return new ImageData(newData, width, height);
  }

  private binarizeImage(imageData: ImageData): ImageData {
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data);

    // Calculate threshold using Otsu's method (simplified)
    const histogram = new Array(256).fill(0);
    
    // Build histogram
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      histogram[gray]++;
    }

    // Find optimal threshold
    const total = data.length / 4;
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let mB = 0;
    let mF = 0;
    let max = 0;
    let between = 0;
    let threshold1 = 0;
    let threshold2 = 0;

    for (let i = 0; i < 256; i++) {
      wB += histogram[i];
      if (wB === 0) continue;
      
      wF = total - wB;
      if (wF === 0) break;
      
      sumB += i * histogram[i];
      mB = sumB / wB;
      mF = (sum - sumB) / wF;
      
      between = wB * wF * Math.pow(mB - mF, 2);
      
      if (between >= max) {
        threshold1 = i;
        if (between > max) {
          threshold2 = i;
        }
        max = between;
      }
    }

    const threshold = (threshold1 + threshold2) / 2;

    // Apply threshold
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      const binary = gray > threshold ? 255 : 0;
      
      newData[i] = binary;     // R
      newData[i + 1] = binary; // G
      newData[i + 2] = binary; // B
      // Alpha stays the same
    }

    return new ImageData(newData, imageData.width, imageData.height);
  }
}

// Singleton instance
export const imageEnhancer = new ImageEnhancer();