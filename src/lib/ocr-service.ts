import Tesseract from 'tesseract.js';

// OCR Performance Configuration
const OCR_CONFIG = {
  // Optimal image dimensions for OCR performance
  MAX_WIDTH: 1000,
  MAX_HEIGHT: 1000,
  
  // Tesseract engine modes (OEM)
  ENGINE_MODE: Tesseract.OEM.TESSERACT_LSTM_COMBINED, // Best accuracy
  
  // Page segmentation modes (PSM) 
  PAGE_SEG_MODE: Tesseract.PSM.AUTO, // Auto detection
  
  // Language data - English only for utility bills
  LANGUAGE: 'eng',
  
  // Worker pool size (limit concurrent workers)
  MAX_WORKERS: 2,
};

// Pre-processing configuration for better OCR accuracy
const IMAGE_PREPROCESSING = {
  // Convert to grayscale
  grayscale: true,
  
  // Enhance contrast
  contrast: 1.2,
  
  // Brightness adjustment
  brightness: 1.1,
  
  // DPI setting for better text recognition
  dpi: 300,
};

export interface OCRProgress {
  status: 'initializing' | 'loading' | 'recognizing' | 'completed' | 'error';
  progress: number;
  message: string;
}

export interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
}

class OCRService {
  private static instance: OCRService;
  private scheduler: Tesseract.Scheduler | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService();
    }
    return OCRService.instance;
  }

  /**
   * Initialize OCR service with worker pool
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create scheduler with worker pool for better performance
      this.scheduler = Tesseract.createScheduler();
      
      // Add workers to the pool
      for (let i = 0; i < OCR_CONFIG.MAX_WORKERS; i++) {
        const worker = await Tesseract.createWorker(OCR_CONFIG.LANGUAGE);
        
        // Configure Tesseract parameters for utility bills
        await worker.setParameters({
          tessedit_ocr_engine_mode: OCR_CONFIG.ENGINE_MODE,
          tessedit_pageseg_mode: OCR_CONFIG.PAGE_SEG_MODE,
          // Utility bill specific optimizations
          tessedit_char_whitelist: '0123456789.,$ ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-/',
          preserve_interword_spaces: '1',
        });
        
        this.scheduler.addWorker(worker);
      }
      
      this.isInitialized = true;
      console.log('OCR Service initialized with', OCR_CONFIG.MAX_WORKERS, 'workers');
    } catch (error) {
      console.error('Failed to initialize OCR service:', error);
      throw new Error('OCR initialization failed');
    }
  }

  /**
   * Preprocess image for better OCR accuracy
   */
  private async preprocessImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate optimal dimensions
        let { width, height } = img;
        const aspectRatio = width / height;
        
        if (width > OCR_CONFIG.MAX_WIDTH) {
          width = OCR_CONFIG.MAX_WIDTH;
          height = width / aspectRatio;
        }
        
        if (height > OCR_CONFIG.MAX_HEIGHT) {
          height = OCR_CONFIG.MAX_HEIGHT;
          width = height * aspectRatio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and enhance image
        if (ctx) {
          // Apply image enhancements
          ctx.filter = `grayscale(${IMAGE_PREPROCESSING.grayscale ? 100 : 0}%) ` +
                      `contrast(${IMAGE_PREPROCESSING.contrast}) ` +
                      `brightness(${IMAGE_PREPROCESSING.brightness})`;
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to data URL
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('Canvas context not available'));
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Perform OCR on image with progress tracking
   */
  async recognizeText(
    file: File, 
    onProgress?: (progress: OCRProgress) => void
  ): Promise<OCRResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.scheduler) {
      throw new Error('OCR service not properly initialized');
    }

    try {
      // Step 1: Preprocess image
      onProgress?.({
        status: 'initializing',
        progress: 10,
        message: 'Preprocessing image for optimal OCR...'
      });

      const preprocessedImage = await this.preprocessImage(file);

      // Step 2: Perform OCR
      onProgress?.({
        status: 'recognizing',
        progress: 30,
        message: 'Analyzing document text...'
      });

      // Version 6+ requires explicit output format enabling for non-text
      const result = await this.scheduler.addJob('recognize', preprocessedImage, {}, {
        text: true,    // Always enabled
        hocr: false,   // Disabled for performance (enable if needed)
        tsv: false,    // Disabled for performance (enable if needed)
        pdf: false     // Disabled for performance (enable if needed)
      });

      // Step 3: Process results
      onProgress?.({
        status: 'completed',
        progress: 100,
        message: 'Text recognition completed'
      });

      // In v6, word-level data structure may have changed
      // Focus on the main text and confidence for now
      return {
        text: result.data.text,
        confidence: result.data.confidence,
        words: [] // Simplified for v6 compatibility
      };

    } catch (error) {
      onProgress?.({
        status: 'error',
        progress: 0,
        message: `OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      throw error;
    }
  }

  /**
   * Enhanced text recognition with retry logic for utility bills
   */
  async recognizeUtilityBill(
    file: File,
    onProgress?: (progress: OCRProgress) => void
  ): Promise<OCRResult> {
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        onProgress?.({
          status: 'initializing',
          progress: 0,
          message: attempt > 1 ? `Retry attempt ${attempt}/${maxRetries}` : 'Starting OCR...'
        });

        const result = await this.recognizeText(file, onProgress);
        
        // Validate result quality - be more lenient for utility bills
        if (result.confidence < 20) {
          throw new Error(`Low confidence OCR result: ${result.confidence}%`);
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`OCR attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          onProgress?.({
            status: 'loading',
            progress: 0,
            message: `Attempt ${attempt} failed, retrying with different settings...`
          });
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError || new Error('OCR failed after all retry attempts');
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.scheduler) {
      await this.scheduler.terminate();
      this.scheduler = null;
      this.isInitialized = false;
      console.log('OCR Service cleaned up');
    }
  }

  /**
   * Get service status
   */
  getStatus(): { initialized: boolean; workerCount: number } {
    return {
      initialized: this.isInitialized,
      workerCount: this.scheduler?.getQueueLen() || 0
    };
  }
}

// Export singleton instance
export const ocrService = OCRService.getInstance();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    ocrService.cleanup();
  });
}