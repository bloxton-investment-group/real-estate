"use client";

import React, { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileUpload } from "@/components/file-upload";
import { DocumentAreaSelector, type ExtractionArea } from "./document-area-selector";
import { Loader2 } from "lucide-react";

interface SimpleEnhancedExtractorProps {
  propertyId: Id<"properties">;
  onSuccess?: () => void;
}

interface ExtractedData {
  fieldName: string;
  value: string;
  confidence: number;
  area: ExtractionArea;
}

export function SimpleEnhancedExtractor({
  propertyId,
  onSuccess,
}: SimpleEnhancedExtractorProps) {
  const { isLoaded } = useAuth();
  const createUtilityBill = useMutation(api.documents.createUtilityBill);
  const getFileUrl = useMutation(api.files.getFileUrl);
  const [loading, setLoading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [extractionAreas, setExtractionAreas] = useState<ExtractionArea[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedData[]>([]);
  const [currentStep, setCurrentStep] = useState<"upload" | "areas" | "review">("upload");
  const [storageId, setStorageId] = useState<string | null>(null);

  const handleFileUpload = async (storageId: string, _url: string) => {
    try {
      console.log("File uploaded with storage ID:", storageId);
      // Get the actual file URL from Convex storage
      const actualUrl = await getFileUrl({ storageId: storageId as any });
      console.log("Got file URL:", actualUrl);
      setFileUrl(actualUrl);
      setStorageId(storageId);
      setCurrentStep("areas");
      toast("File uploaded successfully", { 
        description: "Now draw rectangles around the data you want to extract",
      });
    } catch (error) {
      console.error("Failed to get file URL:", error);
      toast("Failed to load file", { 
        description: "Please try uploading again",
      });
    }
  };

  const handleExtractWithAreas = async () => {
    if (!fileUrl || extractionAreas.length === 0) {
      toast("Please define extraction areas first", { 
        description: "Draw rectangles around the areas you want to extract",
      });
      return;
    }

    setLoading(true);
    try {
      // Create placeholder extracted data based on defined areas
      const placeholderData = extractionAreas.map(area => ({
        fieldName: area.fieldName,
        value: "", // Empty value - user must fill
        confidence: 0,
        area: area,
      }));
      
      setExtractedData(placeholderData);
      setCurrentStep("review");
      toast("Areas defined successfully", { 
        description: "Please enter the values from each highlighted area",
      });
    } catch (error) {
      console.error("Error:", error);
      toast("Failed to proceed", { 
        description: "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBill = async () => {
    if (extractedData.length === 0) {
      toast("No data to save", { 
        description: "Please define areas and enter values first",
      });
      return;
    }

    // Check if any required values are missing
    const hasValues = extractedData.some(item => item.value.trim() !== "");
    if (!hasValues) {
      toast("Please enter values", { 
        description: "Fill in at least one field before saving",
      });
      return;
    }

    setLoading(true);
    try {
      await createUtilityBill({
        propertyId,
        billPdfUrl: storageId!,
        extractionAreas: extractionAreas,
        extractedValues: extractedData.map(item => ({
          fieldName: item.fieldName,
          value: item.value,
          confidence: item.confidence,
          areaId: item.area.id,
        })),
      });

      toast("Bill saved successfully", { 
        description: "The utility bill has been added to the property documents",
      });
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save bill:", error);
      toast("Failed to save", { 
        description: "Please try again later",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Bill Data Extraction</CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === "upload" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 1: Upload Document</h3>
              <FileUpload
                accept={{
                  "application/pdf": [".pdf"],
                  "image/*": [".png", ".jpg", ".jpeg"]
                }}
                maxSize={10 * 1024 * 1024}
                onUploadComplete={(files) => {
                  if (files.length > 0) {
                    handleFileUpload(files[0].storageId, "");
                  }
                }}
              />
            </div>
          )}

          {currentStep === "areas" && fileUrl && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Step 2: Define Extraction Areas</h3>
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("upload")}
                >
                  Back to Upload
                </Button>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-blue-800 mb-2">📍 How to define extraction areas:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>Click and drag</strong> to draw rectangles around data you want to extract</li>
                  <li>• <strong>Name each area</strong> (e.g., "Total Amount", "Usage", "Bill Date")</li>
                  <li>• <strong>Select field type</strong> (text, number, currency, date)</li>
                  <li>• <strong>Define multiple areas</strong> for different pieces of data</li>
                </ul>
              </div>

              <DocumentAreaSelector
                fileUrl={fileUrl}
                onAreasChange={setExtractionAreas}
                existingAreas={extractionAreas}
                mode="select"
              />

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  onClick={handleExtractWithAreas}
                  disabled={loading || extractionAreas.length === 0}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    "Define Areas & Continue"
                  )}
                </Button>
              </div>
            </div>
          )}

          {currentStep === "review" && fileUrl && extractedData.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Step 3: Review & Save</h3>
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("areas")}
                >
                  Back to Areas
                </Button>
              </div>

              <DocumentAreaSelector
                fileUrl={fileUrl}
                existingAreas={extractionAreas}
                mode="view"
              />

              <div className="space-y-4 mt-6">
                <h4 className="font-semibold">Extracted Data</h4>
                {extractedData.map((item, index) => (
                  <div key={index} className="grid grid-cols-3 gap-4 items-center p-3 bg-gray-50 rounded">
                    <Label className="font-medium">{item.fieldName}</Label>
                    <Input
                      value={item.value}
                      onChange={(e) => {
                        const updated = [...extractedData];
                        updated[index].value = e.target.value;
                        setExtractedData(updated);
                      }}
                    />
                    <span className="text-sm text-muted-foreground">
                      Confidence: {Math.round(item.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button onClick={handleSaveBill} disabled={loading}>
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