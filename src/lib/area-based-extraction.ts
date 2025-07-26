import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { ExtractionArea } from "@/components/documents/document-area-selector";
import { ocrService } from "./ocr-service";
import { imageEnhancer } from "./image-enhancement";

// Set up PDF.js worker
if (typeof window !== "undefined") {
  GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@5.3.93/build/pdf.worker.min.mjs`;
}

export interface ExtractionRule {
  // Visual selection-based extraction
  selectedText?: string; // The specific text the user selected
  selectionStart?: number; // Start position in the raw text
  selectionEnd?: number; // End position in the raw text
  
  // Auto-detected patterns (learned from user selections)
  detectedPattern?: {
    type: "substring" | "after_delimiter" | "before_delimiter" | "between_delimiters";
    delimiter?: string;
    position?: "start" | "end";
    length?: number;
  };
}

export interface ExtractedData {
  fieldName: string;
  value: string;
  confidence: number;
  area: ExtractionArea;
  fieldType: ExtractionArea["fieldType"];
  // For multi-field extractions
  additionalFields?: { [fieldName: string]: string };
}

export async function extractFromPdfWithAreas(
  fileUrl: string,
  areas: ExtractionArea[],
  extractionRules?: { [areaId: string]: ExtractionRule },
  displayScale?: number
): Promise<ExtractedData[]> {
  try {
    // Load the PDF document
    const pdf = await getDocument(fileUrl).promise;
    const results: ExtractedData[] = [];

    // Group areas by page for efficiency
    const areasByPage = areas.reduce((acc, area) => {
      if (!acc[area.pageNumber]) {
        acc[area.pageNumber] = [];
      }
      acc[area.pageNumber].push(area);
      return acc;
    }, {} as Record<number, ExtractionArea[]>);

    // Process each page that has areas defined
    for (const [pageNum, pageAreas] of Object.entries(areasByPage)) {
      try {
        const page = await pdf.getPage(parseInt(pageNum));
        
        // Skip PDF text extraction - go straight to OCR for better accuracy
        console.log(`Using OCR for all ${pageAreas.length} areas for better accuracy`);
        
        for (let i = 0; i < pageAreas.length; i++) {
          const area = pageAreas[i];
          
          try {
            console.log(`OCR extracting area ${i + 1}: ${area.fieldName}`);
            const ocrResult = await extractWithOCR(page, area, fileUrl, displayScale);
            const extractedData = applyExtractionRule(
              ocrResult.text,
              area,
              ocrResult.confidence,
              extractionRules?.[area.id]
            );
            results.push(extractedData);
            console.log(`OCR result for ${area.fieldName}: "${ocrResult.text}"`);
          } catch (ocrError) {
            console.warn("OCR failed for area:", area.fieldName, ocrError);
            // Add empty result for failed OCR
            results.push({
              fieldName: area.fieldName,
              value: "",
              confidence: 0,
              area,
              fieldType: area.fieldType,
            });
          }
        }
      } catch (pageError) {
        console.error(`Failed to process page ${pageNum}:`, pageError);
        // Add empty results for all areas on this page
        pageAreas.forEach(area => {
          results.push({
            fieldName: area.fieldName,
            value: "",
            confidence: 0,
            area,
            fieldType: area.fieldType,
          });
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Area-based extraction failed:", error);
    // Return empty results instead of throwing
    return areas.map(area => ({
      fieldName: area.fieldName,
      value: "",
      confidence: 0,
      area,
      fieldType: area.fieldType,
    }));
  }
}

async function extractTextFromAreas(
  page: PDFPageProxy,
  areas: ExtractionArea[],
  displayScale: number = 1.0
): Promise<{ text: string; confidence: number }[]> {
  const textContent = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1.0 });
  
  console.log(`Extracting from ${areas.length} areas on page with viewport:`, {
    width: viewport.width,
    height: viewport.height,
    displayScale: displayScale
  });
  
  return areas.map((area, areaIndex) => {
    console.log(`\n--- Processing Area ${areaIndex + 1}: ${area.fieldName} ---`);
    console.log('Area coordinates:', {
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height
    });
    
    // Convert area coordinates to PDF coordinates
    // PDF coordinates have origin at bottom-left, but our selection areas use top-left
    // Account for display scale - area coordinates are in display pixels, need to convert to PDF units
    const scaleFactor = 1.0 / displayScale;
    const pdfX1 = area.x * scaleFactor;
    const pdfY1 = viewport.height - (area.y + area.height) * scaleFactor; // Flip Y coordinate
    const pdfX2 = (area.x + area.width) * scaleFactor;
    const pdfY2 = viewport.height - area.y * scaleFactor; // Flip Y coordinate
    
    console.log('Converted PDF coordinates:', {
      x1: pdfX1,
      y1: pdfY1,
      x2: pdfX2,
      y2: pdfY2
    });
    
    // Find text items within the area
    const itemsInArea = textContent.items.filter((item: any) => {
      const transform = item.transform;
      const x = transform[4];
      const y = transform[5];
      
      // Check if text item overlaps with the area (be more lenient)
      const overlaps = (
        x >= pdfX1 - 5 && // Allow 5 pixel tolerance
        x <= pdfX2 + 5 &&
        y >= pdfY1 - 5 &&
        y <= pdfY2 + 5
      );
      
      if (overlaps) {
        console.log(`Found text item: "${item.str}" at (${x}, ${y})`);
      }
      
      return overlaps;
    });
    
    console.log(`Found ${itemsInArea.length} text items in area`);
    
    if (itemsInArea.length === 0) {
      // If no exact matches, try a larger tolerance or different approach
      console.log('No items found, trying larger tolerance...');
      
      const itemsNearArea = textContent.items.filter((item: any) => {
        const transform = item.transform;
        const x = transform[4];
        const y = transform[5];
        
        // Much larger tolerance
        const overlaps = (
          x >= pdfX1 - 20 &&
          x <= pdfX2 + 20 &&
          y >= pdfY1 - 20 &&
          y <= pdfY2 + 20
        );
        
        if (overlaps) {
          console.log(`Nearby text item: "${item.str}" at (${x}, ${y})`);
        }
        
        return overlaps;
      });
      
      if (itemsNearArea.length > 0) {
        // Sort by distance to area center
        const areaCenterX = area.x + area.width / 2;
        const areaCenterY = viewport.height - (area.y + area.height / 2);
        
        itemsNearArea.sort((a: any, b: any) => {
          const distA = Math.sqrt(
            Math.pow(a.transform[4] - areaCenterX, 2) + 
            Math.pow(a.transform[5] - areaCenterY, 2)
          );
          const distB = Math.sqrt(
            Math.pow(b.transform[4] - areaCenterX, 2) + 
            Math.pow(b.transform[5] - areaCenterY, 2)
          );
          return distA - distB;
        });
        
        // Take the closest few items
        const closestItems = itemsNearArea.slice(0, 3);
        const text = closestItems
          .map((item: any) => item.str)
          .join(" ")
          .trim();
          
        console.log(`Using closest items: "${text}"`);
        return { text, confidence: 0.5 }; // Lower confidence
      }
      
      return { text: "", confidence: 0 };
    }
    
    // Sort items by x position to maintain reading order
    itemsInArea.sort((a: any, b: any) => {
      const aX = a.transform[4];
      const bX = b.transform[4];
      return aX - bX;
    });
    
    // Combine text from all items in the area
    const text = itemsInArea
      .map((item: any) => item.str)
      .join("")  // Don't add spaces, preserve original spacing
      .trim();
    
    console.log(`Final extracted text: "${text}"`);
    
    // Calculate confidence based on how much of the area contains text
    const confidence = Math.min(itemsInArea.length * 0.3, 1.0);
    
    return { text, confidence };
  });
}

async function extractWithOCR(
  page: PDFPageProxy,
  area: ExtractionArea,
  fileUrl: string,
  displayScale: number = 1.0
): Promise<{ text: string; confidence: number }> {
  try {
    console.log(`OCR: Processing area ${area.fieldName} with display scale ${displayScale}`);
    
    // Use very high resolution for OCR accuracy
    const ocrScale = 4.0; // Even higher resolution for better OCR
    const viewport = page.getViewport({ scale: ocrScale });
    
    console.log(`OCR: Viewport dimensions ${viewport.width} x ${viewport.height}`);
    
    // Convert area coordinates accounting for display scale
    const scaleFactor = ocrScale / displayScale;
    const areaX = area.x * scaleFactor;
    const areaY = area.y * scaleFactor;
    const areaWidth = area.width * scaleFactor;
    const areaHeight = area.height * scaleFactor;
    
    console.log(`OCR: Area coordinates - x:${areaX}, y:${areaY}, w:${areaWidth}, h:${areaHeight}`);
    
    // Create a canvas for the specific area with padding for better OCR
    const padding = 10;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    
    // Set canvas size with padding
    canvas.width = areaWidth + (padding * 2);
    canvas.height = areaHeight + (padding * 2);
    
    // Fill with white background for better OCR contrast
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Render the full page at high resolution
    const fullCanvas = document.createElement("canvas");
    const fullContext = fullCanvas.getContext("2d")!;
    fullCanvas.width = viewport.width;
    fullCanvas.height = viewport.height;
    
    console.log(`OCR: Rendering full page at ${ocrScale}x scale`);
    await page.render({
      canvasContext: fullContext,
      viewport: viewport,
    }).promise;
    
    // Copy only the specific area to our canvas with padding
    context.drawImage(
      fullCanvas,
      Math.max(0, areaX - padding),
      Math.max(0, areaY - padding),
      areaWidth + (padding * 2),
      areaHeight + (padding * 2),
      0,
      0,
      canvas.width,
      canvas.height
    );
    
    console.log(`OCR: Cropped area to ${canvas.width} x ${canvas.height} canvas`);
    
    // Convert canvas to blob for OCR
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), "image/png");
    });
    
    console.log(`OCR: Created ${blob.size} byte image for processing`);
    
    // Enhance image for better OCR accuracy
    console.log(`OCR: Enhancing image for ${area.fieldName}`);
    const enhancedBlob = await imageEnhancer.enhanceForOCR(blob, {
      contrast: 1.4,
      brightness: 1.2,
      sharpness: 1.3,
      removeNoise: true,
      binarize: false, // Keep false for numbers - grayscale often works better
      dpi: 300
    });
    
    console.log(`OCR: Enhanced image size: ${enhancedBlob.size} bytes (was ${blob.size})`);
    
    // Perform OCR on the enhanced image
    await ocrService.initialize();
    
    // Create file with enhanced image
    const imageFile = new File([enhancedBlob], `${area.fieldName}.png`, { type: "image/png" });
    
    console.log(`OCR: Starting text recognition for ${area.fieldName}`);
    
    // Try multiple OCR approaches for better accuracy
    let result;
    
    try {
      // First attempt: Utility bill optimized OCR
      console.log(`OCR: Attempting utility bill optimized recognition`);
      result = await ocrService.recognizeUtilityBill(imageFile, (progress) => {
        console.log(`OCR Progress for ${area.fieldName}:`, progress);
      });
    } catch (error) {
      console.log(`OCR: Utility bill OCR failed (${error}), trying basic recognition`);
      
      // Fallback: Basic OCR with lower standards
      try {
        result = await ocrService.recognizeText(imageFile, (progress) => {
          console.log(`OCR Fallback for ${area.fieldName}:`, progress);
        });
        
        // Accept any result from fallback, even low confidence
        console.log(`OCR: Fallback succeeded with ${result.confidence}% confidence`);
      } catch (fallbackError) {
        console.log(`OCR: Both attempts failed, trying with enhanced settings`);
        
        // Last resort: Try with different image enhancements
        const binarizedBlob = await imageEnhancer.enhanceForOCR(blob, {
          contrast: 2.0,
          brightness: 1.5,
          sharpness: 2.0,
          removeNoise: true,
          binarize: true, // Try black/white for difficult text
          dpi: 400
        });
        
        const binaryImageFile = new File([binarizedBlob], `${area.fieldName}_binary.png`, { type: "image/png" });
        
        try {
          result = await ocrService.recognizeText(binaryImageFile);
          console.log(`OCR: Binary enhancement worked with ${result.confidence}% confidence`);
        } catch (finalError) {
          console.warn(`OCR: All attempts failed for ${area.fieldName}`);
          // Return empty result instead of throwing
          result = { text: "", confidence: 0, words: [] };
        }
      }
    }
    
    console.log(`OCR: Raw result for ${area.fieldName}:`, {
      text: result.text,
      confidence: result.confidence
    });
    
    // Clean up the OCR result
    let cleanedText = result.text.trim();
    
    // Remove common OCR artifacts
    cleanedText = cleanedText
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/[|]/g, '')   // Remove vertical bars
      .replace(/[_]/g, '')   // Remove underscores
      .trim();
    
    console.log(`OCR: Cleaned result for ${area.fieldName}: "${cleanedText}"`);
    
    return {
      text: cleanedText,
      confidence: result.confidence,
    };
  } catch (error) {
    console.error("OCR extraction failed:", error);
    return { text: "", confidence: 0 };
  }
}

function applyExtractionRule(
  rawText: string,
  area: ExtractionArea,
  confidence: number,
  rule?: ExtractionRule
): ExtractedData {
  let processedText = rawText.trim();

  if (rule) {
    // Apply visual selection if specified
    if (rule.selectedText) {
      processedText = rule.selectedText;
    } else if (rule.selectionStart !== undefined && rule.selectionEnd !== undefined) {
      processedText = rawText.substring(rule.selectionStart, rule.selectionEnd);
    } else if (rule.detectedPattern) {
      // Apply auto-detected pattern
      processedText = applyDetectedPattern(rawText, rule.detectedPattern);
    }
  }

  // Apply field type formatting
  const formattedValue = formatValue(processedText, area.fieldType);

  return {
    fieldName: area.fieldName,
    value: formattedValue,
    confidence,
    area,
    fieldType: area.fieldType,
  };
}

function applyDetectedPattern(text: string, pattern: ExtractionRule["detectedPattern"]): string {
  if (!pattern) return text;

  switch (pattern.type) {
    case "substring":
      if (pattern.position === "start" && pattern.length) {
        return text.substring(0, pattern.length);
      } else if (pattern.position === "end" && pattern.length) {
        return text.substring(text.length - pattern.length);
      }
      return text;

    case "after_delimiter":
      if (pattern.delimiter) {
        const parts = text.split(pattern.delimiter);
        return parts.length > 1 ? parts[1].trim() : text;
      }
      return text;

    case "before_delimiter":
      if (pattern.delimiter) {
        const parts = text.split(pattern.delimiter);
        return parts[0].trim();
      }
      return text;

    case "between_delimiters":
      // For future enhancement
      return text;

    default:
      return text;
  }
}

// Auto-detect pattern from user selection
export function detectPatternFromSelection(
  fullText: string,
  selectedText: string,
  selectionStart: number,
  selectionEnd: number
): ExtractionRule["detectedPattern"] {
  const beforeSelection = fullText.substring(0, selectionStart);
  const afterSelection = fullText.substring(selectionEnd);

  // Check for delimiter-based patterns
  const commonDelimiters = ["@", "|", ",", ":", ";", "-", "=", "$"];
  
  for (const delimiter of commonDelimiters) {
    // Check if selection is after delimiter
    if (beforeSelection.includes(delimiter) && !selectedText.includes(delimiter)) {
      const lastDelimiterIndex = beforeSelection.lastIndexOf(delimiter);
      if (lastDelimiterIndex >= 0 && lastDelimiterIndex === selectionStart - 1) {
        return {
          type: "after_delimiter",
          delimiter: delimiter
        };
      }
    }

    // Check if selection is before delimiter
    if (afterSelection.includes(delimiter) && !selectedText.includes(delimiter)) {
      const firstDelimiterIndex = afterSelection.indexOf(delimiter);
      if (firstDelimiterIndex >= 0 && selectionEnd === fullText.length - afterSelection.length) {
        return {
          type: "before_delimiter",
          delimiter: delimiter
        };
      }
    }
  }

  // Default to substring pattern
  return {
    type: "substring",
    position: selectionStart === 0 ? "start" : "end",
    length: selectedText.length
  };
}


function formatValue(text: string, fieldType: ExtractionArea["fieldType"]): string {
  const cleaned = text.trim();
  
  switch (fieldType) {
    case "currency":
      // Extract numeric value and format as currency
      const numericValue = cleaned.replace(/[^0-9.-]/g, "");
      const parsed = parseFloat(numericValue);
      if (!isNaN(parsed)) {
        return `$${parsed.toFixed(2)}`;
      }
      return cleaned;
      
    case "number":
      // Extract only numeric values
      return cleaned.replace(/[^0-9.-]/g, "");
      
    case "date":
      // Try to parse and format date to ISO YYYY-MM-DD
      const dateMatch = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (dateMatch) {
        const [_, month, day, year] = dateMatch;
        const fullYear = year.length === 2 ? `20${year}` : year;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return cleaned;
      
    default:
      return cleaned;
  }
}

