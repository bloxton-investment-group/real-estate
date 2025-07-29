import { PDFDocument, rgb } from 'pdf-lib';

export interface RedactionArea {
  id: string;
  fieldName: string;
  fieldType: 'text' | 'number' | 'currency' | 'date';
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

export interface PageInfo {
  pageNumber: number;
  keep: boolean;
  redactionAreas: RedactionArea[];
}

export interface PdfProcessingOptions {
  originalPdfBytes: Uint8Array;
  pageInfo: PageInfo[];
  redactionColor?: { r: number; g: number; b: number };
}

export interface PdfProcessingResult {
  redactedPdfBytes: Uint8Array;
  processedPages: number[];
  redactionCount: number;
}

/**
 * Process a PDF by removing pages and applying redactions
 */
export async function processPdfWithRedactions(
  options: PdfProcessingOptions
): Promise<PdfProcessingResult> {
  const { originalPdfBytes, pageInfo, redactionColor = { r: 0, g: 0, b: 0 } } = options;

  try {
    // Load the original PDF
    const originalPdf = await PDFDocument.load(originalPdfBytes);
    const originalPages = originalPdf.getPages();

    // Create a new PDF document for the redacted version
    const redactedPdf = await PDFDocument.create();

    // Track processing statistics
    const processedPages: number[] = [];
    let redactionCount = 0;

    // Process each page based on pageInfo
    for (const pageConfig of pageInfo) {
      const pageIndex = pageConfig.pageNumber - 1; // Convert 1-based to 0-based
      
      // Skip pages that are marked as not to keep
      if (!pageConfig.keep) {
        continue;
      }

      // Ensure the page exists in the original PDF
      if (pageIndex < 0 || pageIndex >= originalPages.length) {
        console.warn(`Page ${pageConfig.pageNumber} does not exist in the PDF`);
        continue;
      }

      // Copy the page to the redacted PDF
      const [copiedPage] = await redactedPdf.copyPages(originalPdf, [pageIndex]);
      const addedPage = redactedPdf.addPage(copiedPage);

      // Apply redactions to this page
      if (pageConfig.redactionAreas && pageConfig.redactionAreas.length > 0) {
        const { width: pageWidth, height: pageHeight } = addedPage.getSize();

        for (const redactionArea of pageConfig.redactionAreas) {
          // Convert redaction coordinates (PDF coordinates start from bottom-left)
          const redactionX = redactionArea.x;
          const redactionY = pageHeight - redactionArea.y - redactionArea.height;
          const redactionWidth = redactionArea.width;
          const redactionHeight = redactionArea.height;

          // Draw a filled rectangle to redact the area
          addedPage.drawRectangle({
            x: redactionX,
            y: redactionY,
            width: redactionWidth,
            height: redactionHeight,
            color: rgb(redactionColor.r, redactionColor.g, redactionColor.b),
          });

          redactionCount++;
        }
      }

      processedPages.push(pageConfig.pageNumber);
    }

    // Generate the final PDF bytes
    const redactedPdfBytes = await redactedPdf.save();

    return {
      redactedPdfBytes,
      processedPages,
      redactionCount,
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate PDF processing options
 */
export function validatePdfProcessingOptions(options: PdfProcessingOptions): string[] {
  const errors: string[] = [];

  if (!options.originalPdfBytes || options.originalPdfBytes.length === 0) {
    errors.push('Original PDF bytes are required');
  }

  if (!options.pageInfo || options.pageInfo.length === 0) {
    errors.push('Page information is required');
  }

  // Check if at least one page is marked to keep
  const pagesToKeep = options.pageInfo?.filter(p => p.keep) || [];
  if (pagesToKeep.length === 0) {
    errors.push('At least one page must be marked to keep');
  }

  // Validate redaction areas
  for (const pageConfig of options.pageInfo || []) {
    if (pageConfig.redactionAreas) {
      for (const area of pageConfig.redactionAreas) {
        if (area.width <= 0 || area.height <= 0) {
          errors.push(`Invalid redaction area dimensions on page ${pageConfig.pageNumber}`);
        }
        
        if (area.x < 0 || area.y < 0) {
          errors.push(`Invalid redaction area position on page ${pageConfig.pageNumber}`);
        }
      }
    }
  }

  return errors;
}

/**
 * Get statistics about the PDF processing operation
 */
export function getPdfProcessingStats(
  originalPageCount: number,
  result: PdfProcessingResult
): {
  originalPages: number;
  finalPages: number;
  removedPages: number;
  redactionCount: number;
  compressionRatio: number;
} {
  return {
    originalPages: originalPageCount,
    finalPages: result.processedPages.length,
    removedPages: originalPageCount - result.processedPages.length,
    redactionCount: result.redactionCount,
    compressionRatio: result.processedPages.length / originalPageCount,
  };
}