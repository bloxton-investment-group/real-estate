"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileUpload } from "@/components/file-upload";
import { DocumentAreaSelector, type ExtractionArea } from "./document-area-selector";
import { Loader2, Trash2, Eye, EyeOff, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractFromPdfWithAreas, type ExtractionRule } from "@/lib/area-based-extraction";
import { VisualTextSelector } from "./visual-text-selector";
import { ExtractionDebugger } from "./extraction-debugger";
import { OCRDebugViewer } from "./ocr-debug-viewer";
import { OCRTips } from "./ocr-tips";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import { ocrService } from "@/lib/ocr-service";

interface SmartBillExtractorProps {
  propertyId: Id<"properties">;
}

// Pre-defined utility bill fields based on regional utility supplier standards
const UTILITY_FIELDS = {
  // Required fields (all required for proper tenant invoicing calculations)
  kilowatt_hours: { name: "Kilowatt Hours", type: "number" as const, required: true, parser: "integer" },
  state_sales_tax: { name: "State Sales Tax", type: "currency" as const, required: true, parser: "money" },
  gross_receipt_tax: { name: "Gross Receipt Tax", type: "currency" as const, required: true, parser: "money" },
  adjustment: { name: "Adjustment", type: "currency" as const, required: true, parser: "money" },
  cost_per_kilowatt_hour: { name: "Cost per Kilowatt Hour", type: "currency" as const, required: true, parser: "money" },
  delivery_charges: { name: "Delivery Charges", type: "currency" as const, required: true, parser: "money" },
  
  // Optional fields for reference
  killowatt_hours_cost: { name: "Kilowatt Hours Cost", type: "currency" as const, required: false, parser: "money" },
  account_number: { name: "Account Number", type: "number" as const, required: false, parser: "integer" },
  start_date: { name: "Start Date", type: "date" as const, required: false, parser: "date_no_year" },
  end_date: { name: "End Date", type: "date" as const, required: false, parser: "date_no_year" },
  meter_number: { name: "Meter Number", type: "number" as const, required: false, parser: "integer" },
  due_date: { name: "Due Date", type: "date" as const, required: false, parser: "date" },
  bill_date: { name: "Bill Date", type: "date" as const, required: false, parser: "date" },
} as const;

type FieldKey = keyof typeof UTILITY_FIELDS;

interface FieldAssignment {
  fieldKey: FieldKey;
  area: ExtractionArea;
  extractedText?: string;
  parsedValue?: string;
  extractionRule?: ExtractionRule;
}

interface PageInfo {
  pageNumber: number;
  keep: boolean;
  redactionAreas: ExtractionArea[];
}

export function SmartBillExtractor({
  propertyId,
}: SmartBillExtractorProps) {
  const { isLoaded } = useAuth();
  const router = useRouter();
  const createUtilityBill = useMutation(api.documents.createUtilityBill);
  const getFileUrl = useMutation(api.files.getFileUrl);
  const [loading, setLoading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<"upload" | "areas" | "pages" | "review">("upload");
  const [storageId, setStorageId] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [selectedField, setSelectedField] = useState<FieldKey | "custom" | null>(null);
  const [fieldAssignments, setFieldAssignments] = useState<FieldAssignment[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo[]>([]);
  const [isRedactionMode, setIsRedactionMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [manualValues, setManualValues] = useState<Record<FieldKey, string>>({} as any);
  const [currentViewPage, setCurrentViewPage] = useState(1);
  const [highlightedAreaId, setHighlightedAreaId] = useState<string | null>(null);
  const [criticalFieldAcknowledgments, setCriticalFieldAcknowledgments] = useState<Record<string, boolean>>({});
  const [extracting, setExtracting] = useState(false);
  const [showExtractedValues, setShowExtractedValues] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<FieldAssignment | null>(null);
  const [showTextSelector, setShowTextSelector] = useState(false);
  const [currentScale, setCurrentScale] = useState(1.0);
  const [invoiceNotes, setInvoiceNotes] = useState<string>("");

  const handleFileUpload = async (files: { storageId: string; name: string; size: number; type: string }[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    
    try {
      const url = await getFileUrl({ storageId: file.storageId as any });
      setFileUrl(url);
      setStorageId(file.storageId);
      setCurrentStep("areas");
      toast("File uploaded successfully", { 
        description: "Now assign fields to areas on the document",
      });
    } catch (error) {
      console.error("Failed to get file URL:", error);
      toast("Failed to load file", { 
        description: "Please try uploading again",
      });
    }
  };

  const [allAreas, setAllAreas] = useState<ExtractionArea[]>([]);

  const handleAreasChange = (areas: ExtractionArea[]) => {
    // Handle new areas being added
    const currentAssignedAreaIds = fieldAssignments.map(a => a.area.id);
    const newAreas = areas.filter(area => !currentAssignedAreaIds.includes(area.id));
    
    if (newAreas.length > 0 && selectedField) {
      const newArea = newAreas[0]; // Handle the first new area
      
      if (selectedField === "custom") {
        // For custom fields, just add to areas without assignment
        setAllAreas(areas);
        setSelectedField(null);
        
        toast("Custom area created", {
          description: "Please fill in the field name and type",
        });
        return;
      }
      
      // Check if field already assigned
      const existingAssignment = fieldAssignments.find(a => a.fieldKey === selectedField);
      if (existingAssignment) {
        toast("Field already assigned", {
          description: "This field is already assigned to another area",
        });
        return;
      }

      // Create area with pre-filled field info
      const fieldInfo = UTILITY_FIELDS[selectedField];
      const enhancedArea: ExtractionArea = {
        ...newArea,
        fieldName: fieldInfo.name,
        fieldType: fieldInfo.type,
      };

      const newAssignment: FieldAssignment = {
        fieldKey: selectedField,
        area: enhancedArea,
      };

      // Update areas with enhanced area info
      const updatedAreas = areas.map(a => a.id === newArea.id ? enhancedArea : a);
      setAllAreas(updatedAreas);
      setFieldAssignments([...fieldAssignments, newAssignment]);
      setSelectedField(null);
      
      toast("Field assigned successfully", {
        description: `${fieldInfo.name} assigned to selected area`,
      });
    } else if (newAreas.length > 0 && !selectedField) {
      // Just add the area without assignment
      setAllAreas(areas);
      toast("Please select a field first", {
        description: "Choose which data field this area represents",
      });
    } else {
      // No new areas, just update existing ones (preserve field names from assignments)
      const updatedAreas = areas.map(area => {
        const assignment = fieldAssignments.find(a => a.area.id === area.id);
        if (assignment) {
          return {
            ...area,
            fieldName: assignment.area.fieldName,
            fieldType: assignment.area.fieldType,
          };
        }
        return area;
      });
      setAllAreas(updatedAreas);
    }
    
    // Handle area deletions
    if (areas.length < allAreas.length) {
      // Find which assignment was removed
      const remainingAreaIds = areas.map(a => a.id);
      setFieldAssignments(assignments => 
        assignments.filter(a => remainingAreaIds.includes(a.area.id))
      );
    }
  };

  const extractFieldValues = async () => {
    if (!fileUrl || fieldAssignments.length === 0) return;
    
    setExtracting(true);
    try {
      const areasToExtract = fieldAssignments.map(fa => fa.area);
      
      // Build extraction rules from field assignments
      const extractionRules: { [areaId: string]: ExtractionRule } = {};
      fieldAssignments.forEach(assignment => {
        if (assignment.extractionRule) {
          extractionRules[assignment.area.id] = assignment.extractionRule;
        }
      });
      
      const extractedData = await extractFromPdfWithAreas(fileUrl, areasToExtract, extractionRules, currentScale);
      
      // Update field assignments with extracted values
      const updatedAssignments = fieldAssignments.map(assignment => {
        const extracted = extractedData.find(ed => ed.area.id === assignment.area.id);
        if (extracted) {
          const fieldInfo = UTILITY_FIELDS[assignment.fieldKey];
          const parsedValue = parseExtractedText(extracted.value, fieldInfo.parser);
          return {
            ...assignment,
            extractedText: extracted.value,
            parsedValue: parsedValue,
          };
        }
        return assignment;
      });
      
      setFieldAssignments(updatedAssignments);
      setShowExtractedValues(true);
      toast("Extraction complete", {
        description: "Field values have been extracted from the document",
      });
    } catch (error) {
      console.error("Extraction failed:", error);
      toast("Extraction failed", {
        description: "Failed to extract text from the selected areas",
      });
    } finally {
      setExtracting(false);
    }
  };

  const updateExtractionRule = (assignmentKey: FieldKey, rule: ExtractionRule | null) => {
    setFieldAssignments(assignments => 
      assignments.map(assignment => 
        assignment.fieldKey === assignmentKey 
          ? { ...assignment, extractionRule: rule || undefined }
          : assignment
      )
    );
  };

  const handleTextSelection = (assignment: FieldAssignment) => {
    setEditingAssignment(assignment);
    setShowTextSelector(true);
  };

  const handleRuleConfirm = (rule: ExtractionRule) => {
    if (editingAssignment) {
      updateExtractionRule(editingAssignment.fieldKey, rule);
      setShowTextSelector(false);
      setEditingAssignment(null);
      
      // Re-run extraction to show updated result
      extractFieldValues();
    }
  };

  const saveBill = async () => {
    if (!fileUrl || !storageId) {
      toast("Error: No file uploaded", {
        description: "Please upload a utility bill first",
      });
      return;
    }

    // Check if we have required field assignments or manual values
    const requiredFields = Object.entries(UTILITY_FIELDS).filter(([_, field]) => field.required);
    const missingRequired = requiredFields.filter(([key, _]) => {
      const hasExtracted = fieldAssignments.find(a => a.fieldKey === key && (a.parsedValue || a.extractedText));
      const hasManual = manualValues[key as FieldKey];
      return !hasExtracted && !hasManual;
    });

    if (missingRequired.length > 0) {
      toast("Missing required fields", {
        description: `Please extract values for: ${missingRequired.map(([_, field]) => field.name).join(", ")}`,
      });
      return;
    }

    setLoading(true);
    try {
      // Prepare extracted data for legacy format - include both extracted and manual values
      const extractedData: any = {};
      
      // Process extracted values using the correct field mapping
      fieldAssignments.forEach(assignment => {
        const value = assignment.parsedValue || assignment.extractedText;
        if (value) {
          switch (assignment.fieldKey) {
            case "kilowatt_hours":
              extractedData.kilowatt_hours = parseInt(value.replace(/[^0-9]/g, "")) || 0;
              break;
            case "state_sales_tax":
              extractedData.state_sales_tax = parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
              break;
            case "gross_receipt_tax":
              extractedData.gross_receipt_tax = parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
              break;
            case "adjustment":
              extractedData.adjustment = parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
              break;
            case "cost_per_kilowatt_hour":
              extractedData.cost_per_kilowatt_hour = parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
              break;
            case "delivery_charges":
              extractedData.delivery_charges = parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
              break;
            case "killowatt_hours_cost":
              extractedData.killowatt_hours_cost = parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
              break;
            case "account_number":
              extractedData.account_number = parseInt(value.replace(/[^0-9]/g, "")) || 0;
              break;
            case "meter_number":
              extractedData.meter_number = parseInt(value.replace(/[^0-9]/g, "")) || 0;
              break;
            case "start_date":
            case "end_date":
            case "due_date":
            case "bill_date":
              // Store dates as strings in MM/DD/YYYY format
              extractedData[assignment.fieldKey] = value;
              break;
          }
        }
      });
      
      // Process manual values (for fields not extracted)
      Object.entries(manualValues).forEach(([fieldKey, value]) => {
        if (value) {
          switch (fieldKey) {
            case "kilowatt_hours":
              extractedData.kilowatt_hours = parseInt(value.replace(/[^0-9]/g, "")) || 0;
              break;
            case "state_sales_tax":
              extractedData.state_sales_tax = parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
              break;
            case "gross_receipt_tax":
              extractedData.gross_receipt_tax = parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
              break;
            case "adjustment":
              extractedData.adjustment = parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
              break;
            case "cost_per_kilowatt_hour":
              extractedData.cost_per_kilowatt_hour = parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
              break;
            case "delivery_charges":
              extractedData.delivery_charges = parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
              break;
            case "killowatt_hours_cost":
              extractedData.killowatt_hours_cost = parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
              break;
            case "account_number":
              extractedData.account_number = parseInt(value.replace(/[^0-9]/g, "")) || 0;
              break;
            case "meter_number":
              extractedData.meter_number = parseInt(value.replace(/[^0-9]/g, "")) || 0;
              break;
            case "start_date":
            case "end_date":
            case "due_date":
            case "bill_date":
              // Store dates as strings in MM/DD/YYYY format
              extractedData[fieldKey] = value;
              break;
          }
        }
      });

      // Prepare extraction areas and values for new format
      const extractionAreas = fieldAssignments.map(assignment => ({
        id: assignment.area.id,
        fieldName: assignment.area.fieldName,
        fieldType: assignment.area.fieldType,
        x: assignment.area.x,
        y: assignment.area.y,
        width: assignment.area.width,
        height: assignment.area.height,
        pageNumber: assignment.area.pageNumber,
      }));

      const extractedValues = fieldAssignments.map(assignment => ({
        fieldName: assignment.area.fieldName,
        value: assignment.parsedValue || assignment.extractedText || "",
        confidence: 1.0, // We'll use 1.0 since these are final processed values
        areaId: assignment.area.id,
      }));

      console.log("Saving utility bill with data:", {
        propertyId,
        billPdfUrl: fileUrl,
        extractedData,
        extractionAreas,
        extractedValues,
        pageInfo
      });

      const billId = await createUtilityBill({
        propertyId,
        billPdfUrl: fileUrl,
        extractedData,
        extractionAreas,
        extractedValues,
        pageInfo,
        invoiceNotes,
      });

      toast("Utility bill saved successfully!", {
        description: "The bill has been processed and saved with extracted data",
      });

      // Reset the form
      setCurrentStep("upload");
      setFileUrl(null);
      setStorageId(null);
      setFieldAssignments([]);
      setPageInfo([]);
      setShowExtractedValues(false);
      
      // Navigate back to the property page after a short delay
      setTimeout(() => {
        router.push(`/properties/${propertyId}`);
      }, 1000);

    } catch (error) {
      console.error("Failed to save utility bill:", error);
      toast("Failed to save utility bill", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const debugOCRExtraction = async () => {
    if (!fileUrl || fieldAssignments.length === 0) return [];

    try {
      // Set up PDF.js worker
      if (typeof window !== "undefined") {
        GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@5.3.93/build/pdf.worker.min.mjs`;
      }

      const pdf = await getDocument(fileUrl).promise;
      const page = await pdf.getPage(fieldAssignments[0].area.pageNumber);
      
      const results = [];
      
      for (const assignment of fieldAssignments) {
        const area = assignment.area;
        
        // Generate high-res crop for OCR debug
        const ocrScale = 4.0;
        const viewport = page.getViewport({ scale: ocrScale });
        
        const scaleFactor = ocrScale / currentScale;
        const areaX = area.x * scaleFactor;
        const areaY = area.y * scaleFactor;
        const areaWidth = area.width * scaleFactor;
        const areaHeight = area.height * scaleFactor;
        
        // Create canvas for the specific area
        const padding = 10;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        
        canvas.width = areaWidth + (padding * 2);
        canvas.height = areaHeight + (padding * 2);
        
        // Fill with white background
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Render full page
        const fullCanvas = document.createElement("canvas");
        const fullContext = fullCanvas.getContext("2d")!;
        fullCanvas.width = viewport.width;
        fullCanvas.height = viewport.height;
        
        await page.render({
          canvasContext: fullContext,
          viewport: viewport,
        }).promise;
        
        // Copy area to crop canvas
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
        
        // Convert to blob
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), "image/png");
        });
        
        // Run OCR
        await ocrService.initialize();
        const imageFile = new File([blob], `${area.fieldName}.png`, { type: "image/png" });
        const ocrResult = await ocrService.recognizeUtilityBill(imageFile);
        
        results.push({
          fieldName: area.fieldName,
          imageBlob: blob,
          ocrText: ocrResult.text,
          confidence: ocrResult.confidence
        });
      }
      
      return results;
    } catch (error) {
      console.error("OCR debug failed:", error);
      return [];
    }
  };

  const parseExtractedText = (text: string, parser: string): string => {
    const cleanText = text.trim();
    
    switch (parser) {
      case "integer":
        // Extract kilowatt hours as integer - remove commas, decimals
        const intMatch = cleanText.match(/(\d+(?:,\d+)*)/);
        if (intMatch) {
          const intValue = intMatch[1].replace(/,/g, "");
          return parseInt(intValue).toString();
        }
        return cleanText.replace(/[^\d]/g, "") || "0";
        
      case "decimal":
        // Extract decimal numbers - preserve decimal points
        const decimalMatch = cleanText.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
        if (decimalMatch) {
          const decimalValue = decimalMatch[1].replace(/,/g, "");
          const parsed = parseFloat(decimalValue);
          return !isNaN(parsed) ? parsed.toString() : "0";
        }
        // Fallback: extract any number with decimal
        const fallbackMatch = cleanText.match(/(\d+(?:\.\d+)?)/);
        if (fallbackMatch) {
          return parseFloat(fallbackMatch[1]).toString();
        }
        return "0";
        
      case "money":
        // Extract money amounts - handle $, commas, decimals, negatives
        let moneyMatch = cleanText.match(/(-?\$?\d+(?:,\d{3})*(?:\.\d{2})?)/);
        if (moneyMatch) {
          const cleaned = moneyMatch[1].replace(/[\$,]/g, "");
          const parsed = parseFloat(cleaned);
          return !isNaN(parsed) ? parsed.toFixed(2) : "0.00";
        }
        
        // Fallback: extract any number and format as money
        const numMatch = cleanText.match(/(-?\d+(?:\.\d+)?)/);
        if (numMatch) {
          const parsed = parseFloat(numMatch[1]);
          return !isNaN(parsed) ? parsed.toFixed(2) : "0.00";
        }
        
        return "0.00";
        
      case "date":
        // Try various date formats and convert to ISO YYYY-MM-DD
        let dateMatch = cleanText.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (dateMatch) {
          const [_, first, second, year] = dateMatch;
          const fullYear = year.length === 2 ? `20${year}` : year;
          // Assume MM/DD/YYYY format for US utility bills
          const month = first.padStart(2, '0');
          const day = second.padStart(2, '0');
          return `${fullYear}-${month}-${day}`;
        }
        
        // Try ISO format: YYYY-MM-DD (already correct)
        dateMatch = cleanText.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (dateMatch) {
          const [_, year, month, day] = dateMatch;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        return cleanText;
        
      case "date_no_year":
        // Handle dates without year like "Jun 23" - assume current year and convert to ISO
        const currentYear = new Date().getFullYear();
        
        // Try month abbreviation format: "Jun 23", "Dec 01"
        let monthMatch = cleanText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})/i);
        if (monthMatch) {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthMatch[1].toLowerCase());
          if (monthIndex >= 0) {
            const month = (monthIndex + 1).toString().padStart(2, '0');
            const day = monthMatch[2].padStart(2, '0');
            return `${currentYear}-${month}-${day}`;
          }
        }
        
        // Try numeric format without year: "6/23", "12/1"
        let numericMatch = cleanText.match(/(\d{1,2})[\/\-](\d{1,2})(?![\/\-]\d)/);
        if (numericMatch) {
          const [_, month, day] = numericMatch;
          return `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        return cleanText;
        
      default:
        return cleanText;
    }
  };

  const initializePageInfo = (numPages: number) => {
    const pages: PageInfo[] = [];
    for (let i = 1; i <= numPages; i++) {
      pages.push({
        pageNumber: i,
        keep: true, // Keep all pages by default
        redactionAreas: [],
      });
    }
    setPageInfo(pages);
    setNumPages(numPages);
  };

  const handlePageToggle = (pageNumber: number) => {
    setPageInfo(pages => 
      pages.map(p => 
        p.pageNumber === pageNumber 
          ? { ...p, keep: !p.keep }
          : p
      )
    );
  };

  const getAssignedFields = () => fieldAssignments.map(a => a.fieldKey);
  
  const getUnassignedRequiredFields = () => {
    const assigned = getAssignedFields();
    return Object.entries(UTILITY_FIELDS)
      .filter(([key, field]) => field.required && !assigned.includes(key as FieldKey))
      .map(([key]) => key as FieldKey);
  };

  const getUnassignedCriticalFields = () => {
    const assigned = getAssignedFields();
    return Object.entries(UTILITY_FIELDS)
      .filter(([key, field]) => 'critical' in field && field.critical && !assigned.includes(key as FieldKey))
      .map(([key]) => key as FieldKey);
  };

  const canContinueToPageManagement = () => {
    const unassignedRequired = getUnassignedRequiredFields();
    const unassignedCritical = getUnassignedCriticalFields();
    
    // All required fields must be assigned
    if (unassignedRequired.length > 0) return false;
    
    // All critical fields must either be assigned or acknowledged
    for (const field of unassignedCritical) {
      if (!criticalFieldAcknowledgments[field]) return false;
    }
    
    return true;
  };

  const getAvailableFields = () => {
    const assigned = getAssignedFields();
    return Object.entries(UTILITY_FIELDS)
      .filter(([key]) => !assigned.includes(key as FieldKey))
      .map(([key, field]) => ({ key: key as FieldKey, ...field }));
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <Card className="border-2 border-purple-500">
        <CardHeader className="bg-purple-50">
          <CardTitle className="text-lg md:text-xl text-purple-800">🎯 SMART BILL EXTRACTOR</CardTitle>
          <p className="text-sm md:text-base text-purple-700">Assign pre-defined fields to document areas with smart parsing</p>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-4 md:pt-6">
          {currentStep === "upload" && (
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold">Step 1: Upload Document</h3>
              <FileUpload
                accept={{
                  "application/pdf": [".pdf"],
                  "image/*": [".png", ".jpg", ".jpeg"]
                }}
                maxSize={10 * 1024 * 1024}
                onUploadComplete={handleFileUpload}
              />
            </div>
          )}

          {currentStep === "areas" && fileUrl && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base sm:text-lg font-semibold">Step 2: Assign Fields to Areas</h3>
                <div className="flex flex-col items-end gap-2">
                  {!canContinueToPageManagement() && (
                    <div className="text-sm text-red-600">
                      {getUnassignedRequiredFields().length > 0 
                        ? `Missing required fields: ${getUnassignedRequiredFields().map(f => UTILITY_FIELDS[f].name).join(", ")}`
                        : "Acknowledge missing critical fields"}
                    </div>
                  )}
                  <Button
                    onClick={async () => {
                      console.log("Assigned fields:", getAssignedFields());
                      console.log("Unassigned required:", getUnassignedRequiredFields());
                      console.log("Unassigned critical:", getUnassignedCriticalFields());
                      console.log("Critical acknowledgments:", criticalFieldAcknowledgments);
                      console.log("Can continue:", canContinueToPageManagement());
                      
                      // Extract values if not already done
                      if (!showExtractedValues && fieldAssignments.length > 0) {
                        await extractFieldValues();
                      }
                      
                      setCurrentStep("pages");
                    }}
                    disabled={!canContinueToPageManagement()}
                  >
                    Continue to Page Management
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">📋 Field Assignment Process:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>Select a field</strong> from the dropdown below</li>
                  <li>• <strong>Draw an area</strong> around where that data appears</li>
                  <li>• <strong>Be generous</strong> with area size to capture all relevant text</li>
                  <li>• <strong>Smart parsing</strong> will extract the specific value you need</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="md:col-span-1 lg:col-span-3">
                  <DocumentAreaSelector
                    fileUrl={fileUrl}
                    onAreasChange={handleAreasChange}
                    existingAreas={allAreas}
                    mode="select"
                    onDocumentLoad={initializePageInfo}
                    currentPage={currentViewPage}
                    onPageChange={setCurrentViewPage}
                    onScaleChange={setCurrentScale}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3">📋 Select Field to Assign</h4>
                    <div className="mb-2">
                      <span className="text-sm text-gray-600">
                        {selectedField ? `Selected: ${selectedField === "custom" ? "Custom Field" : UTILITY_FIELDS[selectedField].name}` : "Click a field below to select it"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Required Fields</h4>
                    <div className="space-y-1">
                      {Object.entries(UTILITY_FIELDS)
                        .filter(([_, field]) => field.required)
                        .map(([fieldKey, field]) => {
                          const isAssigned = getAssignedFields().includes(fieldKey as FieldKey);
                          const isSelected = selectedField === fieldKey;
                          return (
                            <Badge
                              key={fieldKey}
                              variant={isAssigned ? "default" : isSelected ? "secondary" : "destructive"}
                              className={`mr-1 mb-1 cursor-pointer transition-all hover:scale-105 ${
                                isAssigned ? "bg-green-500 hover:bg-green-600" :
                                isSelected ? "bg-blue-500 hover:bg-blue-600" : 
                                "hover:bg-red-600"
                              }`}
                              onClick={() => {
                                if (!isAssigned) {
                                  setSelectedField(fieldKey as FieldKey);
                                } else {
                                  // Find the area for this field and navigate to it
                                  const assignment = fieldAssignments.find(a => a.fieldKey === fieldKey);
                                  if (assignment) {
                                    setHighlightedAreaId(assignment.area.id);
                                    if (assignment.area.pageNumber !== currentViewPage) {
                                      setCurrentViewPage(assignment.area.pageNumber);
                                    }
                                  }
                                }
                              }}
                            >
                              {isAssigned && "✓ "}{field.name}
                            </Badge>
                          );
                        })}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Critical Optional Fields</h4>
                    <p className="text-xs text-orange-600 mb-2">These fields require acknowledgment if not present</p>
                    <div className="space-y-1">
                      {Object.entries(UTILITY_FIELDS)
                        .filter(([_, field]) => !field.required && 'critical' in field && field.critical)
                        .map(([fieldKey, field]) => {
                          const isAssigned = getAssignedFields().includes(fieldKey as FieldKey);
                          const isSelected = selectedField === fieldKey;
                          const isAcknowledged = criticalFieldAcknowledgments[fieldKey];
                          return (
                            <div key={fieldKey} className="flex items-center gap-2">
                              <Badge
                                variant={isAssigned ? "default" : isSelected ? "secondary" : "outline"}
                                className={`cursor-pointer transition-all hover:scale-105 ${
                                  isAssigned ? "bg-green-500 hover:bg-green-600" :
                                  isSelected ? "bg-blue-500 hover:bg-blue-600" : 
                                  "hover:bg-orange-200"
                                }`}
                                onClick={() => {
                                  if (!isAssigned) {
                                    setSelectedField(fieldKey as FieldKey);
                                  } else {
                                    // Find the area for this field and navigate to it
                                    const assignment = fieldAssignments.find(a => a.fieldKey === fieldKey);
                                    if (assignment) {
                                      setHighlightedAreaId(assignment.area.id);
                                      if (assignment.area.pageNumber !== currentViewPage) {
                                        setCurrentViewPage(assignment.area.pageNumber);
                                      }
                                    }
                                  }
                                }}
                              >
                                {isAssigned && "✓ "}{field.name}
                              </Badge>
                              {!isAssigned && (
                                <Button
                                  size="sm"
                                  variant={isAcknowledged ? "default" : "outline"}
                                  className={`text-xs ${isAcknowledged ? "bg-orange-500" : ""}`}
                                  onClick={() => setCriticalFieldAcknowledgments(prev => ({
                                    ...prev,
                                    [fieldKey]: !prev[fieldKey]
                                  }))}
                                >
                                  {isAcknowledged ? "✓ Not Present" : "Mark as Not Present"}
                                </Button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Optional Fields</h4>
                    <div className="space-y-1">
                      {Object.entries(UTILITY_FIELDS)
                        .filter(([_, field]) => !field.required && !('critical' in field && field.critical))
                        .map(([fieldKey, field]) => {
                          const isAssigned = getAssignedFields().includes(fieldKey as FieldKey);
                          const isSelected = selectedField === fieldKey;
                          return (
                            <Badge
                              key={fieldKey}
                              variant={isAssigned ? "default" : isSelected ? "secondary" : "outline"}
                              className={`mr-1 mb-1 cursor-pointer transition-all hover:scale-105 ${
                                isAssigned ? "bg-green-500 hover:bg-green-600" :
                                isSelected ? "bg-blue-500 hover:bg-blue-600" : 
                                "hover:bg-gray-200"
                              }`}
                              onClick={() => {
                                if (!isAssigned) {
                                  setSelectedField(fieldKey as FieldKey);
                                } else {
                                  // Find the area for this field and navigate to it
                                  const assignment = fieldAssignments.find(a => a.fieldKey === fieldKey);
                                  if (assignment) {
                                    setHighlightedAreaId(assignment.area.id);
                                    if (assignment.area.pageNumber !== currentViewPage) {
                                      setCurrentViewPage(assignment.area.pageNumber);
                                    }
                                  }
                                }
                              }}
                            >
                              {isAssigned && "✓ "}{field.name}
                            </Badge>
                          );
                        })}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Custom Field</h4>
                    <Badge
                      variant={selectedField === "custom" ? "secondary" : "outline"}
                      className={`cursor-pointer transition-all hover:scale-105 ${
                        selectedField === "custom" ? "bg-purple-500 hover:bg-purple-600" : "hover:bg-gray-200"
                      }`}
                      onClick={() => setSelectedField("custom")}
                    >
                      + Custom Field
                    </Badge>
                  </div>

                  {selectedField && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h5 className="font-medium text-blue-800 mb-1">
                        Ready to assign: {selectedField === "custom" ? "Custom Field" : UTILITY_FIELDS[selectedField].name}
                      </h5>
                      <p className="text-sm text-blue-600">
                        Now draw a rectangle around this data in the document →
                      </p>
                    </div>
                  )}

                  {fieldAssignments.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <OCRTips />
                      
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Extract Values</h4>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={extractFieldValues}
                          disabled={extracting}
                        >
                          {extracting ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Extracting...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Extract Now
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {showExtractedValues && (
                        <div className="space-y-3">
                          <h5 className="text-sm font-medium text-gray-600">Extracted Values:</h5>
                          {fieldAssignments.map(assignment => {
                            const field = UTILITY_FIELDS[assignment.fieldKey];
                            const hasRawText = assignment.extractedText && assignment.extractedText.trim().length > 0;
                            const finalValue = assignment.parsedValue || 
                              (assignment.extractionRule?.selectedText) || 
                              assignment.extractedText;
                            
                            return (
                              <div key={assignment.fieldKey} className="p-3 border rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-sm">{field.name}</div>
                                  <div className="flex gap-1">
                                    {hasRawText && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleTextSelection(assignment)}
                                        className="text-xs px-2 py-1 h-6"
                                      >
                                        {assignment.extractionRule ? "Edit Selection" : "Select Text"}
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const userText = prompt(`Enter text for ${field.name}:`, assignment.extractedText || "");
                                        if (userText !== null) {
                                          const updatedAssignments = fieldAssignments.map(a => 
                                            a.fieldKey === assignment.fieldKey 
                                              ? { ...a, extractedText: userText, parsedValue: userText }
                                              : a
                                          );
                                          setFieldAssignments(updatedAssignments);
                                        }
                                      }}
                                      className="text-xs px-2 py-1 h-6"
                                      title="Manually enter text"
                                    >
                                      ✏️
                                    </Button>
                                  </div>
                                </div>
                                
                                <div className="space-y-1">
                                  {hasRawText && (
                                    <div className="text-xs text-gray-500">
                                      Raw text: <span className="font-mono bg-gray-100 px-1 rounded">{assignment.extractedText}</span>
                                    </div>
                                  )}
                                  
                                  <div className="text-sm">
                                    <span className="font-medium">Final value: </span>
                                    <span className="font-mono bg-green-50 px-2 py-1 rounded">
                                      {finalValue || <span className="text-gray-400">No value extracted</span>}
                                    </span>
                                  </div>
                                  
                                  {assignment.extractionRule?.detectedPattern && (
                                    <div className="text-xs text-blue-600">
                                      Pattern: {assignment.extractionRule.detectedPattern.type}
                                      {assignment.extractionRule.detectedPattern.delimiter && 
                                        ` (${assignment.extractionRule.detectedPattern.delimiter})`}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Debug section for troubleshooting extraction issues */}
                  {fieldAssignments.length > 0 && fileUrl && (
                    <div className="mt-4 space-y-3">
                      <ExtractionDebugger
                        fileUrl={fileUrl}
                        areas={fieldAssignments.map(fa => fa.area)}
                        onDebugComplete={(debugInfo) => {
                          console.log("Debug complete:", debugInfo);
                        }}
                      />
                      
                      <OCRDebugViewer
                        onDebugOCR={debugOCRExtraction}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {showTextSelector && editingAssignment && (
            <div className="mt-4">
              <VisualTextSelector
                rawText={editingAssignment.extractedText || ""}
                fieldName={UTILITY_FIELDS[editingAssignment.fieldKey].name}
                onRuleSelect={handleRuleConfirm}
                onCancel={() => {
                  setShowTextSelector(false);
                  setEditingAssignment(null);
                }}
                currentRule={editingAssignment.extractionRule}
              />
            </div>
          )}

          {currentStep === "pages" && fileUrl && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base sm:text-lg font-semibold">Step 3: Page Management & Redaction</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep("areas")}
                  >
                    Back to Areas
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!showExtractedValues && fieldAssignments.length > 0) {
                        await extractFieldValues();
                      }
                      setCurrentStep("review");
                    }}
                  >
                    Continue to Review
                  </Button>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-2">📄 Page Management:</h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• <strong>Toggle pages</strong> to include/exclude from final document</li>
                  <li>• <strong>Add redaction areas</strong> to hide sensitive information</li>
                  <li>• <strong>Page 1</strong> typically contains billing data</li>
                  <li>• <strong>Additional pages</strong> may contain terms or usage details</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="md:col-span-1 lg:col-span-3">
                  <DocumentAreaSelector
                    fileUrl={fileUrl}
                    existingAreas={isRedactionMode ? pageInfo[currentPage - 1]?.redactionAreas || [] : fieldAssignments.map(a => a.area)}
                    mode={isRedactionMode ? "select" : "view"}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    isRedactionMode={isRedactionMode}
                    onAreasChange={isRedactionMode ? (areas) => {
                      setPageInfo(pages => pages.map(p => 
                        p.pageNumber === currentPage 
                          ? { ...p, redactionAreas: areas }
                          : p
                      ));
                    } : undefined}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Page Controls</h4>
                    {pageInfo.map(page => (
                      <div key={page.pageNumber} className="flex items-center justify-between p-2 border rounded">
                        <span>Page {page.pageNumber}</span>
                        <Button
                          size="sm"
                          variant={page.keep ? "default" : "outline"}
                          onClick={() => handlePageToggle(page.pageNumber)}
                        >
                          {page.keep ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {page.keep ? "Keep" : "Remove"}
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <Button
                      variant={isRedactionMode ? "destructive" : "outline"}
                      onClick={() => setIsRedactionMode(!isRedactionMode)}
                      className="w-full"
                    >
                      {isRedactionMode ? "Exit Redaction Mode" : "Add Redaction Areas"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === "review" && (
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold">Step 4: Review & Complete</h3>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">📝 Final Review:</h4>
                <p className="text-sm text-yellow-700">
                  Smart parsing has been applied. Review the extracted values and fill in any missing required fields.
                </p>
              </div>

              {/* Show parsed values and manual entry fields */}
              <div className="space-y-4">
                {Object.entries(UTILITY_FIELDS).map(([fieldKey, field]) => {
                  const assignment = fieldAssignments.find(a => a.fieldKey === fieldKey);
                  const manualValue = manualValues[fieldKey as FieldKey] || "";
                  
                  return (
                    <div key={fieldKey} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center p-3 border rounded">
                      <div>
                        <Label className="font-medium">{field.name}</Label>
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </div>
                      
                      <Input
                        value={assignment?.parsedValue || manualValue}
                        onChange={(e) => {
                          if (assignment) {
                            // Update the parsed value in the assignment
                            setFieldAssignments(prev => prev.map(a => 
                              a.fieldKey === fieldKey 
                                ? { ...a, parsedValue: e.target.value }
                                : a
                            ));
                          } else {
                            // Update manual value
                            setManualValues(prev => ({
                              ...prev,
                              [fieldKey]: e.target.value
                            }));
                          }
                        }}
                        placeholder={assignment ? "Auto-extracted" : "Enter manually"}
                        className={assignment ? "bg-green-50" : field.required ? "bg-red-50" : ""}
                      />
                      
                      <div className="text-sm text-gray-500">
                        {assignment ? (
                          <Badge variant="default">From area</Badge>
                        ) : field.required ? (
                          <Badge variant="destructive">Required</Badge>
                        ) : (
                          <Badge variant="outline">Optional</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Save Summary */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Ready to Save</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>✅ Extracted data from {fieldAssignments.length} areas</div>
                  <div>✅ Configured {pageInfo.filter(p => p.keep).length} of {pageInfo.length} pages to keep</div>
                  <div>✅ Applied {pageInfo.reduce((sum, p) => sum + p.redactionAreas.length, 0)} redaction areas</div>
                  {pageInfo.reduce((sum, p) => sum + p.redactionAreas.length, 0) > 0 && (
                    <div className="text-xs">Redacted areas will hide sensitive information for tenant invoicing</div>
                  )}
                </div>
              </div>

              {/* Invoice Notes Section */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-3">📋 Invoice Calculation Notes</h4>
                <div className="space-y-2">
                  <Label htmlFor="invoice-notes" className="text-sm text-gray-600">
                    Document your calculation method, tenant adjustments, or any special billing considerations
                  </Label>
                  <textarea
                    id="invoice-notes"
                    className="w-full p-3 border rounded-md min-h-[120px] font-mono text-sm"
                    placeholder="Example:&#10;Tenant: Snyder&#10;Method: Advanced (proportional)&#10;Calculation: (Room: 2,456 kWh - Fan: 1,089 kWh) = 1,367 kWh net usage&#10;Contribution: 1,367 ÷ 15,234 = 8.97% of total bill&#10;Invoice: $156.78 (direct) + $23.45 (taxes/fees) = $180.23&#10;&#10;Redacted PDF attached for tenant reference."
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    These notes will be saved with the bill and can be referenced when creating tenant invoices.
                    The redacted PDF will be generated automatically based on your page selections and redaction areas.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("pages")}
                >
                  Back to Pages
                </Button>
                <Button onClick={saveBill} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Bill"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}