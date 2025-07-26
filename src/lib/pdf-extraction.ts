import * as pdfjsLib from 'pdfjs-dist';
import { ocrService, OCRResult } from './ocr-service';

// Configure PDF.js worker
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@5.3.93/build/pdf.worker.min.mjs`;
}

export interface UtilityBillData {
  totalUsageKwh: number;
  grossSalesTax: number;
  grossReceipt: number;
  adjustment: number;
  electricRate: number;
  deliveryCharge: number;
  billDate?: Date;
  accountNumber?: string;
  serviceAddress?: string;
  billingPeriod?: {
    start: Date;
    end: Date;
  };
}

export class UtilityBillExtractor {
  private static readonly PATTERNS = {
    // kWh usage patterns
    totalUsageKwh: [
      /total\s*usage:?\s*([0-9,]+\.?\d*)\s*kwh/i,
      /kwh\s*used:?\s*([0-9,]+\.?\d*)/i,
      /usage\s*kwh:?\s*([0-9,]+\.?\d*)/i,
      /electricity\s*usage:?\s*([0-9,]+\.?\d*)\s*kwh/i,
    ],
    
    // Tax patterns
    grossSalesTax: [
      /sales\s*tax:?\s*\$?([0-9,]+\.?\d*)/i,
      /tax:?\s*\$?([0-9,]+\.?\d*)/i,
      /gross\s*sales\s*tax:?\s*\$?([0-9,]+\.?\d*)/i,
    ],
    
    // Total amount patterns
    grossReceipt: [
      /total\s*amount\s*due:?\s*\$?([0-9,]+\.?\d*)/i,
      /amount\s*due:?\s*\$?([0-9,]+\.?\d*)/i,
      /total\s*charges:?\s*\$?([0-9,]+\.?\d*)/i,
      /gross\s*receipt:?\s*\$?([0-9,]+\.?\d*)/i,
      /balance\s*due:?\s*\$?([0-9,]+\.?\d*)/i,
    ],
    
    // Rate patterns
    electricRate: [
      /rate:?\s*\$?([0-9]+\.?\d*)\s*per\s*kwh/i,
      /kwh\s*rate:?\s*\$?([0-9]+\.?\d*)/i,
      /electric\s*rate:?\s*\$?([0-9]+\.?\d*)/i,
    ],
    
    // Delivery charge patterns
    deliveryCharge: [
      /delivery\s*charge:?\s*\$?([0-9,]+\.?\d*)/i,
      /delivery:?\s*\$?([0-9,]+\.?\d*)/i,
      /distribution\s*charge:?\s*\$?([0-9,]+\.?\d*)/i,
    ],
    
    // Adjustment patterns
    adjustment: [
      /adjustment:?\s*-?\$?([0-9,]+\.?\d*)/i,
      /credit:?\s*-?\$?([0-9,]+\.?\d*)/i,
      /previous\s*balance:?\s*-?\$?([0-9,]+\.?\d*)/i,
    ],
    
    // Date patterns
    billDate: [
      /bill\s*date:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /date:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
    ],
    
    // Account number patterns
    accountNumber: [
      /account\s*(?:number|#):?\s*([0-9\-]+)/i,
      /acct\s*(?:number|#):?\s*([0-9\-]+)/i,
    ],
  };

  /**
   * Extract text from PDF file
   */
  static async extractTextFromPDF(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n';
      }
      
      return fullText;
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from image using optimized OCR service
   */
  static async extractTextFromImage(
    file: File,
    onProgress?: (progress: { status: string; progress: number; message: string }) => void
  ): Promise<string> {
    try {
      const result = await ocrService.recognizeUtilityBill(file, onProgress);
      return result.text;
    } catch (error) {
      console.error('OCR extraction failed:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  /**
   * Extract utility bill data from text
   */
  static extractDataFromText(text: string): Partial<UtilityBillData> {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const extractedData: Partial<UtilityBillData> = {};

    // Extract each field using patterns
    for (const [field, patterns] of Object.entries(this.PATTERNS)) {
      if (field === 'billDate') continue; // Handle dates separately
      
      for (const pattern of patterns) {
        const match = cleanText.match(pattern);
        if (match && match[1]) {
          const value = match[1].replace(/,/g, ''); // Remove commas
          const numValue = parseFloat(value);
          
          if (!isNaN(numValue)) {
            (extractedData as any)[field] = numValue;
            break;
          }
        }
      }
    }

    // Extract bill date
    for (const pattern of this.PATTERNS.billDate) {
      const match = cleanText.match(pattern);
      if (match && match[1]) {
        const dateStr = match[1];
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          extractedData.billDate = date;
          break;
        }
      }
    }

    // Extract account number
    for (const pattern of this.PATTERNS.accountNumber) {
      const match = cleanText.match(pattern);
      if (match && match[1]) {
        extractedData.accountNumber = match[1].trim();
        break;
      }
    }

    return extractedData;
  }

  /**
   * Main extraction method for utility bills with progress tracking
   */
  static async extractUtilityBillData(
    file: File,
    onProgress?: (progress: { status: string; progress: number; message: string }) => void
  ): Promise<Partial<UtilityBillData>> {
    let text = '';
    
    try {
      if (file.type === 'application/pdf') {
        onProgress?.({ status: 'extracting', progress: 20, message: 'Extracting text from PDF...' });
        text = await this.extractTextFromPDF(file);
      } else if (file.type.startsWith('image/')) {
        onProgress?.({ status: 'extracting', progress: 10, message: 'Starting OCR processing...' });
        text = await this.extractTextFromImage(file, onProgress);
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or image file.');
      }

      onProgress?.({ status: 'parsing', progress: 80, message: 'Parsing utility bill data...' });
      
      console.log('Extracted text:', text); // Debug log
      
      const extractedData = this.extractDataFromText(text);
      
      console.log('Extracted data:', extractedData); // Debug log
      
      onProgress?.({ status: 'completed', progress: 100, message: 'Data extraction completed' });
      
      return extractedData;
    } catch (error) {
      console.error('Data extraction failed:', error);
      onProgress?.({ status: 'error', progress: 0, message: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
      throw error;
    }
  }

  /**
   * Validate extracted data and provide confidence scores
   */
  static validateExtractedData(data: Partial<UtilityBillData>): {
    isValid: boolean;
    confidence: number;
    missingFields: string[];
    suggestions: string[];
  } {
    const requiredFields = ['totalUsageKwh', 'grossReceipt'];
    const optionalFields = ['grossSalesTax', 'electricRate', 'deliveryCharge'];
    
    const missingFields = requiredFields.filter(field => 
      !(field in data) || data[field as keyof UtilityBillData] === undefined
    );
    
    const presentOptionalFields = optionalFields.filter(field => 
      field in data && data[field as keyof UtilityBillData] !== undefined
    );
    
    // Calculate confidence based on found fields
    const totalPossibleFields = requiredFields.length + optionalFields.length;
    const foundFields = requiredFields.length - missingFields.length + presentOptionalFields.length;
    const confidence = foundFields / totalPossibleFields;
    
    const suggestions = [];
    if (missingFields.includes('totalUsageKwh')) {
      suggestions.push('Look for "kWh used", "Usage", or "Total Usage" in the bill');
    }
    if (missingFields.includes('grossReceipt')) {
      suggestions.push('Look for "Amount Due", "Total Charges", or "Balance Due" in the bill');
    }
    
    return {
      isValid: missingFields.length === 0,
      confidence,
      missingFields,
      suggestions,
    };
  }
}