import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Define the types that match our PDF processing
const RedactionAreaSchema = v.object({
  id: v.string(),
  fieldName: v.string(),
  fieldType: v.union(v.literal("text"), v.literal("number"), v.literal("currency"), v.literal("date")),
  x: v.number(),
  y: v.number(),
  width: v.number(),
  height: v.number(),
  pageNumber: v.number(),
  color: v.optional(v.string()),
});

const PageInfoSchema = v.object({
  pageNumber: v.number(),
  keep: v.boolean(),
  redactionAreas: v.array(RedactionAreaSchema),
});

/**
 * Process a PDF with redactions and page removal
 * This is a Convex action that runs on the server with access to external APIs
 */
export const processPdfWithRedactions = action({
  args: {
    originalPdfUrl: v.string(),
    pageInfo: v.array(PageInfoSchema),
    billId: v.id("utilityBills"),
  },
  handler: async (ctx, args) => {
    try {
      // Fetch the original PDF from the URL
      const response = await fetch(args.originalPdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }

      const originalPdfBytes = new Uint8Array(await response.arrayBuffer());

      // Dynamic import of pdf-lib (only available on server)
      const { PDFDocument, rgb } = await import('pdf-lib');

      // Load the original PDF
      const originalPdf = await PDFDocument.load(originalPdfBytes);
      const originalPages = originalPdf.getPages();

      // Create a new PDF document for the redacted version
      const redactedPdf = await PDFDocument.create();

      // Track processing statistics
      const processedPages: number[] = [];
      let redactionCount = 0;

      // Process each page based on pageInfo
      for (const pageConfig of args.pageInfo) {
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

            // Parse color from hex string (default to black if not provided)
            const hexColor = redactionArea.color || "#000000";
            const red = parseInt(hexColor.slice(1, 3), 16) / 255;
            const green = parseInt(hexColor.slice(3, 5), 16) / 255;
            const blue = parseInt(hexColor.slice(5, 7), 16) / 255;

            // Draw a filled rectangle with the specified color to redact the area
            addedPage.drawRectangle({
              x: redactionX,
              y: redactionY,
              width: redactionWidth,
              height: redactionHeight,
              color: rgb(red, green, blue),
            });

            redactionCount++;
          }
        }

        processedPages.push(pageConfig.pageNumber);
      }

      // Generate the final PDF bytes
      const redactedPdfBytes = await redactedPdf.save();

      // Upload the redacted PDF to Convex file storage
      const redactedBlob = new Blob([redactedPdfBytes], { type: 'application/pdf' });
      const redactedFile = new File([redactedBlob], `redacted_bill_${args.billId}.pdf`, {
        type: 'application/pdf',
      });

      // Store the redacted PDF in Convex
      const storageId = await ctx.storage.store(redactedFile);
      
      // Get the public URL for the stored file
      const redactedPdfUrl = await ctx.storage.getUrl(storageId);

      // Update the utility bill with the redacted PDF URL
      await ctx.runMutation(api.documents.updateUtilityBillRedactedUrl, {
        billId: args.billId,
        summaryPageUrl: redactedPdfUrl || undefined,
        processingStats: {
          originalPages: originalPages.length,
          finalPages: processedPages.length,
          removedPages: originalPages.length - processedPages.length,
          redactionCount,
        },
      });

      return {
        success: true,
        redactedPdfUrl,
        storageId,
        stats: {
          originalPages: originalPages.length,
          finalPages: processedPages.length,
          removedPages: originalPages.length - processedPages.length,
          redactionCount,
          processedPages,
        },
      };
    } catch (error) {
      console.error('PDF processing error:', error);
      
      // Update the bill with error status
      await ctx.runMutation(api.documents.updateUtilityBillRedactedUrl, {
        billId: args.billId,
        summaryPageUrl: undefined,
        processingError: error instanceof Error ? error.message : 'PDF processing failed',
      });

      throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});