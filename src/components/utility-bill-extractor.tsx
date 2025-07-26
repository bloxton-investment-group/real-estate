"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/file-upload";
import { UtilityBillExtractor, UtilityBillData } from "@/lib/pdf-extraction";
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Zap,
  DollarSign,
  Calendar,
  Gauge
} from "lucide-react";
import { toast } from "sonner";

interface UtilityBillExtractorProps {
  onDataExtracted: (data: Partial<UtilityBillData>) => void;
  onFileUploaded: (file: { storageId: string; name: string }) => void;
}

interface ExtractionState {
  status: 'idle' | 'uploading' | 'extracting' | 'completed' | 'error';
  progress: string;
  extractedData?: Partial<UtilityBillData>;
  confidence?: number;
  missingFields?: string[];
  rawText?: string;
}

export function UtilityBillExtractorComponent({ onDataExtracted, onFileUploaded }: UtilityBillExtractorProps) {
  const [extractionState, setExtractionState] = useState<ExtractionState>({ status: 'idle', progress: '' });
  const [showRawText, setShowRawText] = useState(false);
  const [manualOverrides, setManualOverrides] = useState<Partial<UtilityBillData>>({});
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const handleFileUpload = useCallback(async (files: { storageId: string; name: string; size: number; type: string }[]) => {
    if (files.length === 0) return;

    const uploadedFile = files[0];
    onFileUploaded({ storageId: uploadedFile.storageId, name: uploadedFile.name });

    // We need the actual File object for extraction, not just the storage info
    // This is a limitation - we'll need to modify the FileUpload component or handle extraction before upload
    setExtractionState({ status: 'completed', progress: 'File uploaded successfully' });
    toast.success("File uploaded! Please upload again to extract data, or enter data manually.");
  }, [onFileUploaded]);

  const handleFileSelected = useCallback(async (file: File) => {
    setCurrentFile(file);
    setExtractionState({ status: 'extracting', progress: 'Analyzing document...' });

    try {
      // Step 1: Extract text
      setExtractionState(prev => ({ ...prev, progress: 'Extracting text from document...' }));
      
      let extractedData: Partial<UtilityBillData>;
      let rawText = '';

      // Use the enhanced extraction with progress tracking
      extractedData = await UtilityBillExtractor.extractUtilityBillData(file, (progress) => {
        setExtractionState(prev => ({ 
          ...prev, 
          progress: progress.message 
        }));
      });

      // The extractUtilityBillData method already returns the parsed data
      // so we don't need to call extractDataFromText separately
      rawText = 'Text extraction completed with enhanced OCR service';

      // Step 2: Validate extracted data
      const validation = UtilityBillExtractor.validateExtractedData(extractedData);
      
      setExtractionState({
        status: 'completed',
        progress: `Extraction completed with ${Math.round(validation.confidence * 100)}% confidence`,
        extractedData,
        confidence: validation.confidence,
        missingFields: validation.missingFields,
        rawText,
      });

      // Merge with manual overrides
      const finalData = { ...extractedData, ...manualOverrides };
      onDataExtracted(finalData);

      if (validation.confidence > 0.8) {
        toast.success("Data extracted successfully!");
      } else if (validation.confidence > 0.5) {
        toast.warning("Data partially extracted. Please review and fill missing fields.");
      } else {
        toast.error("Low confidence extraction. Please review all fields carefully.");
      }

    } catch (error) {
      console.error('Extraction failed:', error);
      setExtractionState({
        status: 'error',
        progress: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      toast.error("Failed to extract data. Please enter manually.");
    }
  }, [onDataExtracted, manualOverrides]);

  const handleManualOverride = (field: keyof UtilityBillData, value: string) => {
    const numValue = parseFloat(value);
    const newOverrides = {
      ...manualOverrides,
      [field]: isNaN(numValue) ? undefined : numValue,
    };
    setManualOverrides(newOverrides);
    
    // Update the final data
    const finalData = { ...extractionState.extractedData, ...newOverrides };
    onDataExtracted(finalData);
  };

  const retryExtraction = () => {
    if (currentFile) {
      handleFileSelected(currentFile);
    }
  };

  const getFieldValue = (field: keyof UtilityBillData): number | undefined => {
    const overrideValue = manualOverrides[field];
    const extractedValue = extractionState.extractedData?.[field];
    
    // Only return numeric values for the numeric fields we're handling
    if (typeof overrideValue === 'number') return overrideValue;
    if (typeof extractedValue === 'number') return extractedValue;
    return undefined;
  };

  const getFieldStatus = (field: keyof UtilityBillData): 'extracted' | 'manual' | 'missing' => {
    if (manualOverrides[field] !== undefined) return 'manual';
    if (extractionState.extractedData?.[field] !== undefined) return 'extracted';
    return 'missing';
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Utility Bill
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            accept={{ 
              "application/pdf": [".pdf"],
              "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"]
            }}
            maxFiles={1}
            maxSize={20 * 1024 * 1024} // 20MB
            onUploadComplete={handleFileUpload}
          />
          
          {/* Manual file selection for extraction */}
          <div className="mt-4">
            <Label htmlFor="file-input" className="block text-sm font-medium mb-2">
              Or select file for immediate data extraction:
            </Label>
            <input
              id="file-input"
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
        </CardContent>
      </Card>

      {/* Extraction Progress */}
      {extractionState.status !== 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {extractionState.status === 'extracting' && (
                <RefreshCw className="h-5 w-5 animate-spin" />
              )}
              {extractionState.status === 'completed' && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {extractionState.status === 'error' && (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              Data Extraction
              {extractionState.confidence && (
                <Badge variant={extractionState.confidence > 0.8 ? "default" : extractionState.confidence > 0.5 ? "secondary" : "destructive"}>
                  {Math.round(extractionState.confidence * 100)}% confidence
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">{extractionState.progress}</p>
            
            {extractionState.status === 'error' && (
              <Button onClick={retryExtraction} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Extraction
              </Button>
            )}

            {extractionState.rawText && (
              <div className="mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRawText(!showRawText)}
                >
                  {showRawText ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showRawText ? 'Hide' : 'Show'} Raw Text
                </Button>
                
                {showRawText && (
                  <div className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-700 max-h-32 overflow-y-auto">
                    {extractionState.rawText}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Extracted Data Review */}
      {extractionState.extractedData && (
        <Card>
          <CardHeader>
            <CardTitle>Review Extracted Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Usage */}
              <div>
                <Label className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  Total Usage (kWh) *
                  <Badge variant={getFieldStatus('totalUsageKwh') === 'extracted' ? 'default' : getFieldStatus('totalUsageKwh') === 'manual' ? 'secondary' : 'destructive'}>
                    {getFieldStatus('totalUsageKwh')}
                  </Badge>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={getFieldValue('totalUsageKwh') || ''}
                  onChange={(e) => handleManualOverride('totalUsageKwh', e.target.value)}
                  placeholder="Enter kWh usage"
                />
              </div>

              {/* Total Amount */}
              <div>
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Amount ($) *
                  <Badge variant={getFieldStatus('grossReceipt') === 'extracted' ? 'default' : getFieldStatus('grossReceipt') === 'manual' ? 'secondary' : 'destructive'}>
                    {getFieldStatus('grossReceipt')}
                  </Badge>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={getFieldValue('grossReceipt') || ''}
                  onChange={(e) => handleManualOverride('grossReceipt', e.target.value)}
                  placeholder="Enter total amount"
                />
              </div>

              {/* Sales Tax */}
              <div>
                <Label className="flex items-center gap-2">
                  Sales Tax ($)
                  <Badge variant={getFieldStatus('grossSalesTax') === 'extracted' ? 'default' : getFieldStatus('grossSalesTax') === 'manual' ? 'secondary' : 'outline'}>
                    {getFieldStatus('grossSalesTax')}
                  </Badge>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={getFieldValue('grossSalesTax') || ''}
                  onChange={(e) => handleManualOverride('grossSalesTax', e.target.value)}
                  placeholder="Enter sales tax"
                />
              </div>

              {/* Electric Rate */}
              <div>
                <Label className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Electric Rate ($/kWh)
                  <Badge variant={getFieldStatus('electricRate') === 'extracted' ? 'default' : getFieldStatus('electricRate') === 'manual' ? 'secondary' : 'outline'}>
                    {getFieldStatus('electricRate')}
                  </Badge>
                </Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={getFieldValue('electricRate') || ''}
                  onChange={(e) => handleManualOverride('electricRate', e.target.value)}
                  placeholder="Enter rate per kWh"
                />
              </div>

              {/* Delivery Charge */}
              <div>
                <Label className="flex items-center gap-2">
                  Delivery Charge ($)
                  <Badge variant={getFieldStatus('deliveryCharge') === 'extracted' ? 'default' : getFieldStatus('deliveryCharge') === 'manual' ? 'secondary' : 'outline'}>
                    {getFieldStatus('deliveryCharge')}
                  </Badge>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={getFieldValue('deliveryCharge') || ''}
                  onChange={(e) => handleManualOverride('deliveryCharge', e.target.value)}
                  placeholder="Enter delivery charge"
                />
              </div>

              {/* Adjustment */}
              <div>
                <Label className="flex items-center gap-2">
                  Adjustment ($)
                  <Badge variant={getFieldStatus('adjustment') === 'extracted' ? 'default' : getFieldStatus('adjustment') === 'manual' ? 'secondary' : 'outline'}>
                    {getFieldStatus('adjustment')}
                  </Badge>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={getFieldValue('adjustment') || ''}
                  onChange={(e) => handleManualOverride('adjustment', e.target.value)}
                  placeholder="Enter adjustment amount"
                />
              </div>
            </div>

            {extractionState.missingFields && extractionState.missingFields.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm font-medium text-yellow-800">Missing Required Fields:</p>
                <ul className="text-sm text-yellow-700 mt-1">
                  {extractionState.missingFields.map(field => (
                    <li key={field}>• {field}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}