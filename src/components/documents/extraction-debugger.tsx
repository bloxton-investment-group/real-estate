"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug, Download } from "lucide-react";
import { ExtractionArea } from "./document-area-selector";

interface ExtractionDebuggerProps {
  fileUrl: string;
  areas: ExtractionArea[];
  onDebugComplete: (debugInfo: any) => void;
}

export function ExtractionDebugger({
  fileUrl,
  areas,
  onDebugComplete
}: ExtractionDebuggerProps) {
  const [debugging, setDebugging] = useState(false);
  const [debugResults, setDebugResults] = useState<any>(null);

  const runDebugExtraction = async () => {
    setDebugging(true);
    
    try {
      // Import PDF.js directly for detailed debugging
      const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
      
      // Set up worker
      if (typeof window !== "undefined") {
        GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@5.3.93/build/pdf.worker.min.mjs`;
      }

      console.log("🐛 DEBUG: Starting debug extraction...");
      
      const pdf = await getDocument(fileUrl).promise;
      const debugInfo: any = {
        numPages: pdf.numPages,
        areas: areas.length,
        pageDetails: []
      };

      // Process first page only for debugging
      const page = await pdf.getPage(areas[0]?.pageNumber || 1);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();

      console.log("🐛 DEBUG: Page info", {
        viewport: { width: viewport.width, height: viewport.height },
        textItems: textContent.items.length
      });

      const pageDebug = {
        pageNumber: areas[0]?.pageNumber || 1,
        viewport: { width: viewport.width, height: viewport.height },
        textItems: textContent.items.length,
        allTextItems: textContent.items.map((item: any) => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: item.height
        })),
        areaAnalysis: [] as any[]
      };

      // Analyze each area
      for (const area of areas) {
        console.log(`🐛 DEBUG: Analyzing area "${area.fieldName}"`);
        
        const areaDebug = {
          fieldName: area.fieldName,
          coordinates: {
            original: { x: area.x, y: area.y, width: area.width, height: area.height },
            converted: {
              x1: area.x,
              y1: viewport.height - area.y - area.height,
              x2: area.x + area.width,
              y2: viewport.height - area.y
            }
          },
          textItemsInArea: [] as any[],
          textItemsNearby: [] as any[]
        };

        // Find items in area
        const itemsInArea = textContent.items.filter((item: any) => {
          const x = item.transform[4];
          const y = item.transform[5];
          const pdfX1 = area.x;
          const pdfY1 = viewport.height - area.y - area.height;
          const pdfX2 = area.x + area.width;
          const pdfY2 = viewport.height - area.y;
          
          return (
            x >= pdfX1 - 5 && x <= pdfX2 + 5 &&
            y >= pdfY1 - 5 && y <= pdfY2 + 5
          );
        });

        areaDebug.textItemsInArea = itemsInArea.map((item: any) => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: item.height
        }));

        // Find nearby items (within 50px)
        const itemsNearby = textContent.items.filter((item: any) => {
          const x = item.transform[4];
          const y = item.transform[5];
          const pdfX1 = area.x;
          const pdfY1 = viewport.height - area.y - area.height;
          const pdfX2 = area.x + area.width;
          const pdfY2 = viewport.height - area.y;
          
          return (
            x >= pdfX1 - 50 && x <= pdfX2 + 50 &&
            y >= pdfY1 - 50 && y <= pdfY2 + 50
          );
        });

        areaDebug.textItemsNearby = itemsNearby.map((item: any) => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: item.height,
          distance: Math.sqrt(
            Math.pow(item.transform[4] - (area.x + area.width/2), 2) +
            Math.pow(item.transform[5] - (viewport.height - area.y - area.height/2), 2)
          )
        })).sort((a, b) => a.distance - b.distance);

        pageDebug.areaAnalysis.push(areaDebug);
      }

      debugInfo.pageDetails.push(pageDebug);
      setDebugResults(debugInfo);
      onDebugComplete(debugInfo);

      console.log("🐛 DEBUG: Complete debug info", debugInfo);
      
    } catch (error) {
      console.error("🐛 DEBUG: Failed", error);
    } finally {
      setDebugging(false);
    }
  };

  const downloadDebugInfo = () => {
    if (!debugResults) return;
    
    const blob = new Blob([JSON.stringify(debugResults, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extraction-debug.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-4 border-orange-200 bg-orange-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-orange-600" />
          <h4 className="font-medium text-orange-800">Extraction Debugger</h4>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={runDebugExtraction}
            disabled={debugging || areas.length === 0}
          >
            {debugging ? "Debugging..." : "Debug Extraction"}
          </Button>
          {debugResults && (
            <Button size="sm" variant="outline" onClick={downloadDebugInfo}>
              <Download className="h-3 w-3 mr-1" />
              Download Debug
            </Button>
          )}
        </div>
      </div>

      {debugging && (
        <div className="text-sm text-orange-600">
          Running detailed extraction analysis... Check console for logs.
        </div>
      )}

      {debugResults && (
        <div className="space-y-3 text-sm">
          <div className="flex gap-2">
            <Badge variant="secondary">
              {debugResults.numPages} pages
            </Badge>
            <Badge variant="secondary">
              {debugResults.areas} areas
            </Badge>
          </div>

          {debugResults.pageDetails.map((page: any, pageIndex: number) => (
            <div key={pageIndex} className="space-y-2">
              <h5 className="font-medium">Page {page.pageNumber}</h5>
              <div className="text-xs space-y-1">
                <div>Viewport: {page.viewport.width} × {page.viewport.height}</div>
                <div>Total text items: {page.textItems}</div>
              </div>

              {page.areaAnalysis.map((area: any, areaIndex: number) => (
                <div key={areaIndex} className="bg-white p-2 rounded border">
                  <div className="font-medium text-xs">{area.fieldName}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Area: ({area.coordinates.original.x}, {area.coordinates.original.y}) 
                    {area.coordinates.original.width}×{area.coordinates.original.height}
                  </div>
                  <div className="text-xs mt-1">
                    <span className="font-medium">In area:</span> {area.textItemsInArea.length} items
                    {area.textItemsInArea.length > 0 && (
                      <div className="font-mono bg-gray-100 p-1 rounded mt-1">
                        &quot;{area.textItemsInArea.map((item: any) => item.text).join('')}&quot;
                      </div>
                    )}
                  </div>
                  <div className="text-xs mt-1">
                    <span className="font-medium">Nearby:</span> {area.textItemsNearby.slice(0, 3).length} closest
                    {area.textItemsNearby.slice(0, 3).map((item: any, i: number) => (
                      <div key={i} className="font-mono text-xs bg-blue-50 p-1 rounded mt-1">
                        &quot;{item.text}&quot; at ({Math.round(item.x)}, {Math.round(item.y)}) 
                        dist: {Math.round(item.distance)}px
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}