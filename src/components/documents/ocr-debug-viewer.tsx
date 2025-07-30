"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Download, RefreshCw } from "lucide-react";

interface OCRDebugViewerProps {
  onDebugOCR: () => Promise<Array<{ fieldName: string; imageBlob: Blob; ocrText: string; confidence: number }>>;
}

export function OCRDebugViewer({ onDebugOCR }: OCRDebugViewerProps) {
  const [debugging, setDebugging] = useState(false);
  const [debugResults, setDebugResults] = useState<Array<{
    fieldName: string;
    imageBlob: Blob;
    ocrText: string;
    confidence: number;
    imageUrl?: string;
  }>>([]);

  const runOCRDebug = async () => {
    setDebugging(true);
    try {
      const results = await onDebugOCR();
      
      // Create object URLs for the images
      const resultsWithUrls = results.map(result => ({
        ...result,
        imageUrl: URL.createObjectURL(result.imageBlob)
      }));
      
      setDebugResults(resultsWithUrls);
    } catch (error) {
      console.error("OCR debug failed:", error);
    } finally {
      setDebugging(false);
    }
  };

  const downloadImage = (result: typeof debugResults[0]) => {
    if (!result.imageUrl) return;
    
    const a = document.createElement('a');
    a.href = result.imageUrl;
    a.download = `${result.fieldName}_ocr_crop.png`;
    a.click();
  };

  const downloadAllImages = () => {
    debugResults.forEach(result => downloadImage(result));
  };

  // Cleanup object URLs when component unmounts
  React.useEffect(() => {
    return () => {
      debugResults.forEach(result => {
        if (result.imageUrl) {
          URL.revokeObjectURL(result.imageUrl);
        }
      });
    };
  }, [debugResults]);

  return (
    <Card className="p-4 border-purple-200 bg-purple-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-purple-600" />
          <h4 className="font-medium text-purple-800">OCR Debug Viewer</h4>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={runOCRDebug}
            disabled={debugging}
          >
            {debugging ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Debug OCR
              </>
            )}
          </Button>
          {debugResults.length > 0 && (
            <Button size="sm" variant="outline" onClick={downloadAllImages}>
              <Download className="h-3 w-3 mr-1" />
              Download All
            </Button>
          )}
        </div>
      </div>

      {debugging && (
        <div className="text-sm text-purple-600 mb-3">
          Creating high-resolution crop images and running OCR... Check console for detailed logs.
        </div>
      )}

      {debugResults.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm font-medium text-purple-800">
            OCR Results ({debugResults.length} areas)
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {debugResults.map((result, index) => (
              <div key={index} className="bg-white border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm">{result.fieldName}</div>
                  <div className="flex gap-1">
                    <Badge variant={result.confidence > 70 ? "default" : "secondary"}>
                      {result.confidence.toFixed(0)}% conf
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadImage(result)}
                      className="h-6 w-6 p-0"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {result.imageUrl && (
                  <div className="mb-2">
                    <Image
                      src={result.imageUrl}
                      alt={`OCR crop for ${result.fieldName}`}
                      className="w-full border rounded bg-white"
                      width={400}
                      height={120}
                      style={{ 
                        imageRendering: 'pixelated',
                        maxHeight: '120px',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                )}
                
                <div className="text-xs">
                  <div className="font-medium mb-1">OCR Text:</div>
                  <div className="font-mono bg-gray-100 p-2 rounded text-xs break-all">
                    {result.ocrText || <span className="text-gray-400">No text detected</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
            💡 Tips: Look for blurry/pixelated images, missing characters, or incorrect crops. 
            OCR works best with clear, high-contrast text on clean backgrounds.
          </div>
        </div>
      )}
    </Card>
  );
}