"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ZoomIn, ZoomOut, Save, Trash2, Tag, Tags, Pipette } from "lucide-react";
import { PDFViewer } from "./pdf-viewer";

export interface ExtractionArea {
  id: string;
  fieldName: string;
  fieldType: "text" | "number" | "currency" | "date";
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  color?: string; // Hex color for redaction
}

interface DocumentAreaSelectorProps {
  fileUrl: string;
  onAreasChange?: (areas: ExtractionArea[]) => void;
  existingAreas?: ExtractionArea[];
  mode?: "select" | "view";
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onDocumentLoad?: (numPages: number) => void;
  isRedactionMode?: boolean;
  onScaleChange?: (scale: number) => void;
}

export function DocumentAreaSelector({
  fileUrl,
  onAreasChange,
  existingAreas = [],
  mode = "select",
  currentPage,
  onPageChange,
  onDocumentLoad,
  isRedactionMode = false,
  onScaleChange,
}: DocumentAreaSelectorProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(currentPage || 1);
  const [scale, setScale] = useState(1.0);

  // Notify parent of scale changes
  useEffect(() => {
    onScaleChange?.(scale);
  }, [scale, onScaleChange]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<ExtractionArea | null>(null);
  const [areas, setAreas] = useState<ExtractionArea[]>(existingAreas);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [redactionColor, setRedactionColor] = useState('#000000');
  const [isColorPickingMode, setIsColorPickingMode] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setAreas(existingAreas);
  }, [existingAreas]);

  useEffect(() => {
    if (currentPage && currentPage !== pageNumber) {
      setPageNumber(currentPage);
    }
  }, [currentPage, pageNumber]);

  useEffect(() => {
    // Report initial scale when component mounts
    onScaleChange?.(scale);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log("PDF loaded successfully with", numPages, "pages");
    setNumPages(numPages);
    setLoading(false);
    onDocumentLoad?.(numPages);
    // Also report scale after document loads
    onScaleChange?.(scale);
  };

  const sampleColorFromPDF = (e: React.MouseEvent<HTMLDivElement>): string | null => {
    if (!containerRef.current) return null;
    
    try {
      // Find the PDF canvas element
      const pdfCanvas = containerRef.current.querySelector('canvas');
      if (!pdfCanvas) return null;
      
      const canvasRect = pdfCanvas.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      // Calculate relative position on the canvas
      const canvasX = e.clientX - canvasRect.left;
      const canvasY = e.clientY - canvasRect.top;
      
      // Get canvas context and sample pixel
      const ctx = pdfCanvas.getContext('2d');
      if (!ctx) return null;
      
      const imageData = ctx.getImageData(canvasX, canvasY, 1, 1);
      const data = imageData.data;
      const r = data[0];
      const g = data[1];
      const b = data[2];
      
      // Convert to hex
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch (error) {
      console.error('Failed to sample color:', error);
      return null;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode === "view" || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    // Account for scroll offset in the container
    const scrollLeft = containerRef.current.scrollLeft;
    const scrollTop = containerRef.current.scrollTop;
    const x = (e.clientX - rect.left + scrollLeft) / scale;
    const y = (e.clientY - rect.top + scrollTop) / scale;
    
    // Handle color picking mode
    if (isColorPickingMode) {
      const color = sampleColorFromPDF(e);
      if (color) {
        setRedactionColor(color);
        setIsColorPickingMode(false);
      }
      return;
    }
    
    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentRect({
      id: `area-${Date.now()}`,
      fieldName: "",
      fieldType: "text",
      x,
      y,
      width: 0,
      height: 0,
      pageNumber,
      color: isRedactionMode ? redactionColor : undefined,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    // Account for scroll offset in the container
    const scrollLeft = containerRef.current.scrollLeft;
    const scrollTop = containerRef.current.scrollTop;
    const x = (e.clientX - rect.left + scrollLeft) / scale;
    const y = (e.clientY - rect.top + scrollTop) / scale;
    
    setCurrentRect({
      id: `area-${Date.now()}`,
      fieldName: "",
      fieldType: "text",
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y),
      pageNumber,
      color: isRedactionMode ? redactionColor : undefined,
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect) return;
    
    if (currentRect.width > 10 && currentRect.height > 10) {
      console.log('=== CREATING NEW AREA ===');
      console.log('Current rect:', currentRect);
      console.log('Selected redaction color:', redactionColor);
      console.log('Is redaction mode:', isRedactionMode);
      console.log('Area color will be:', currentRect.color);
      
      const newAreas = [...areas, currentRect];
      setAreas(newAreas);
      setSelectedArea(currentRect.id);
      
      console.log('Calling onAreasChange with:', newAreas);
      console.log('New areas count:', newAreas.length);
      newAreas.forEach((area, index) => {
        console.log(`Area ${index}: id=${area.id}, color=${area.color}, page=${area.pageNumber}`);
      });
      
      onAreasChange?.(newAreas);
    }
    
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
  };

  const updateArea = (id: string, updates: Partial<ExtractionArea>) => {
    const updatedAreas = areas.map((area) =>
      area.id === id ? { ...area, ...updates } : area
    );
    setAreas(updatedAreas);
    onAreasChange?.(updatedAreas);
  };

  const deleteArea = (id: string) => {
    const updatedAreas = areas.filter((area) => area.id !== id);
    setAreas(updatedAreas);
    onAreasChange?.(updatedAreas);
    setSelectedArea(null);
  };

  const renderAreas = () => {
    const visibleAreas = areas.filter((area) => area.pageNumber === pageNumber);
    const allAreasForDrawing = currentRect && currentRect.pageNumber === pageNumber
      ? [...visibleAreas, currentRect]
      : visibleAreas;

    return allAreasForDrawing.map((area) => (
      <div
        key={area.id}
        className={cn(
          "absolute border-2 transition-all cursor-pointer group",
          isRedactionMode
            ? "border-solid"
            : "bg-opacity-30",
          !isRedactionMode && area.id === selectedArea
            ? "border-blue-600 bg-blue-600 border-solid bg-opacity-30"
            : !isRedactionMode && "border-red-600 bg-red-600 bg-opacity-30",
          area === currentRect && !isRedactionMode && "border-dashed border-green-600 bg-green-600 bg-opacity-30",
          area === currentRect && isRedactionMode && "border-dashed bg-opacity-50",
          // Add highlight for selected redaction areas
          isRedactionMode && area.id === selectedArea && "ring-2 ring-blue-500 ring-offset-1"
        )}
        style={{
          left: `${area.x * scale}px`,
          top: `${area.y * scale}px`,
          width: `${area.width * scale}px`,
          height: `${area.height * scale}px`,
          ...(isRedactionMode ? {
            backgroundColor: area.color || redactionColor, // Use area's saved color, fallback to current picker color
            borderColor: area.color || redactionColor,
            opacity: area === currentRect ? 0.5 : 1
          } : {})
        }}
        onClick={() => mode === "select" && setSelectedArea(area.id)}
      >
        {area.fieldName && !isRedactionMode && (
          <div className={cn(
            "absolute -top-6 left-0 bg-white px-1 py-0.5 text-xs font-medium rounded shadow transition-opacity",
            showLabels ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>
            {area.fieldName}
          </div>
        )}
      </div>
    ));
  };

  const selectedAreaData = areas.find((area) => area.id === selectedArea);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const newScale = Math.max(0.5, scale - 0.1);
              setScale(newScale);
              onScaleChange?.(newScale);
            }}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const newScale = Math.min(2, scale + 0.1);
              setScale(newScale);
              onScaleChange?.(newScale);
            }}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          {!isRedactionMode && areas.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowLabels(!showLabels)}
              title={showLabels ? "Hide all labels" : "Show all labels"}
            >
              {showLabels ? <Tags className="h-4 w-4" /> : <Tag className="h-4 w-4" />}
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const newPage = Math.max(1, pageNumber - 1);
              setPageNumber(newPage);
              onPageChange?.(newPage);
            }}
            disabled={pageNumber <= 1}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {pageNumber} of {numPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const newPage = Math.min(numPages, pageNumber + 1);
              setPageNumber(newPage);
              onPageChange?.(newPage);
            }}
            disabled={pageNumber >= numPages}
          >
            Next
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 min-h-0">
        <Card className="flex-1 p-4 min-w-0">
          <div
            ref={containerRef}
            className={cn(
              "relative overflow-auto h-[400px] sm:h-[500px] md:h-[600px] lg:h-[700px] xl:h-[800px] bg-gray-100",
              "min-w-0 flex-shrink-0", // Prevent container from shrinking and maintain proper dimensions
              isColorPickingMode ? "cursor-eyedropper" : "cursor-default"
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className="relative inline-block">
              <PDFViewer
                fileUrl={fileUrl}
                pageNumber={pageNumber}
                scale={scale}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(error) => {
                  console.error("PDF load error:", error);
                  setLoading(false);
                }}
              />
            </div>
            
            {renderAreas()}
          </div>
        </Card>

        {mode === "select" && (
          <Card className="w-full md:w-80 lg:w-96 p-4">
            <h3 className="font-semibold mb-4">{isRedactionMode ? "Redaction Areas" : "Extraction Areas"}</h3>
            
            {selectedAreaData ? (
              <div className="space-y-4">
                {!isRedactionMode && (
                  <>
                    <div>
                      <Label>Field Name</Label>
                      <Input
                        value={selectedAreaData.fieldName}
                        onChange={(e) =>
                          updateArea(selectedAreaData.id, { fieldName: e.target.value })
                        }
                        placeholder="e.g., Total Amount"
                      />
                    </div>
                    
                    <div>
                      <Label>Field Type</Label>
                      <Select
                        value={selectedAreaData.fieldType}
                        onValueChange={(value: ExtractionArea["fieldType"]) =>
                          updateArea(selectedAreaData.id, { fieldType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="currency">Currency</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                {isRedactionMode && (
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-100 rounded">
                      <p className="text-sm font-medium">Redaction Area Selected</p>
                      <p className="text-xs text-gray-600 mt-1">
                        This area will be covered with the selected color
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Redaction Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={selectedAreaData.color || redactionColor}
                          onChange={(e) => {
                            console.log('Color picker changed to:', e.target.value);
                            setRedactionColor(e.target.value);
                            // Update the selected area's color
                            updateArea(selectedAreaData.id, { color: e.target.value });
                          }}
                          className="w-12 h-8 p-1 rounded cursor-pointer"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsColorPickingMode(!isColorPickingMode)}
                          className={cn(
                            "flex-1",
                            isColorPickingMode && "bg-blue-100 border-blue-300"
                          )}
                        >
                          <Pipette className="h-3 w-3 mr-1" />
                          {isColorPickingMode ? "Click PDF to sample" : "Pick from PDF"}
                        </Button>
                      </div>
                      <div className="flex gap-1">
                        {["#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"].map(color => (
                          <button
                            key={color}
                            className="w-6 h-6 rounded border border-gray-300 cursor-pointer hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              console.log('Color button clicked:', color);
                              setRedactionColor(color);
                              // Update the selected area's color
                              updateArea(selectedAreaData.id, { color: color });
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteArea(selectedAreaData.id)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {isRedactionMode ? "Redaction" : "Area"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {isRedactionMode 
                    ? "Draw a rectangle on the document to redact sensitive information"
                    : "Draw a rectangle on the document to define an extraction area"
                  }
                </p>
                
                {isRedactionMode && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Redaction Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={redactionColor}
                        onChange={(e) => {
                          console.log('Color picker changed to:', e.target.value);
                          setRedactionColor(e.target.value);
                        }}
                        className="w-12 h-8 p-1 rounded cursor-pointer"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsColorPickingMode(!isColorPickingMode)}
                        className={cn(
                          "flex-1",
                          isColorPickingMode && "bg-blue-100 border-blue-300"
                        )}
                      >
                        <Pipette className="h-3 w-3 mr-1" />
                        {isColorPickingMode ? "Click PDF to sample" : "Pick from PDF"}
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      {["#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"].map(color => (
                        <button
                          key={color}
                          className="w-6 h-6 rounded border border-gray-300 cursor-pointer hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            console.log('Color button clicked:', color);
                            setRedactionColor(color);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-6 space-y-2">
              <h4 className="font-medium">All Areas</h4>
              {areas.length === 0 ? (
                <p className="text-sm text-muted-foreground">No areas defined</p>
              ) : (
                <div className="space-y-1">
                  {areas.map((area) => (
                    <div
                      key={area.id}
                      className={cn(
                        "p-2 rounded cursor-pointer text-sm",
                        area.id === selectedArea
                          ? "bg-blue-100"
                          : "bg-gray-50 hover:bg-gray-100"
                      )}
                      onClick={() => {
                        setSelectedArea(area.id);
                        // Navigate to the page containing this area
                        if (area.pageNumber !== pageNumber) {
                          setPageNumber(area.pageNumber);
                          onPageChange?.(area.pageNumber);
                        }
                      }}
                    >
                      {area.fieldName || "Unnamed field"} (Page {area.pageNumber})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}