"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface PDFViewerProps {
  fileUrl: string;
  pageNumber: number;
  scale: number;
  onLoadSuccess: (info: { numPages: number }) => void;
  onLoadError: (error: any) => void;
}

export function PDFViewer({ 
  fileUrl, 
  pageNumber, 
  scale, 
  onLoadSuccess, 
  onLoadError 
}: PDFViewerProps) {
  const [Document, setDocument] = useState<any>(null);
  const [Page, setPage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPDFComponents = async () => {
      try {
        const reactPdf = await import("react-pdf");
        
        // Set up PDF.js worker - use unpkg for v5+ compatibility
        reactPdf.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${reactPdf.pdfjs.version}/build/pdf.worker.min.mjs`;
        
        // Polyfill DOMMatrix if not available
        if (typeof window !== "undefined" && !window.DOMMatrix) {
          (window as any).DOMMatrix = class {
            a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
            constructor() {}
          };
        }
        
        setDocument(() => reactPdf.Document);
        setPage(() => reactPdf.Page);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load PDF components:", error);
        onLoadError(error);
        setIsLoading(false);
      }
    };

    loadPDFComponents();
  }, [onLoadError]);

  if (isLoading || !Document || !Page) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading PDF viewer...</span>
      </div>
    );
  }

  return (
    <Document
      file={fileUrl}
      onLoadSuccess={onLoadSuccess}
      onLoadError={onLoadError}
      loading=""
    >
      <Page
        pageNumber={pageNumber}
        scale={scale}
        renderAnnotationLayer={false}
        renderTextLayer={false}
      />
    </Document>
  );
}