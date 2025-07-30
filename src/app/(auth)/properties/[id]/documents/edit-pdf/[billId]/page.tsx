"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, FileText, Eye, EyeOff, Database, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "@/components/ui/use-toast";
import { DocumentAreaSelector } from "@/components/documents/document-area-selector";
import { UtilityBillExtractedData } from "@/components/documents/utility-bill-extracted-data";
import { PageHeader } from "@/components/navigation/page-header";

interface EditPdfPageProps {
  params: Promise<{
    id: string;
    billId: string;
  }>;
}

interface PageInfo {
  pageNumber: number;
  keep: boolean;
  redactionAreas: Array<{
    id: string;
    fieldName: string;
    fieldType: 'text' | 'number' | 'currency' | 'date';
    x: number;
    y: number;
    width: number;
    height: number;
    pageNumber: number;
    color?: string; // Hex color for redaction
  }>;
}

export default function EditPdfPage({ params }: EditPdfPageProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const resolvedParams = use(params);
  const propertyId = resolvedParams.id as Id<"properties">;
  const billId = resolvedParams.billId as Id<"utilityBills">;
  
  const [pageInfo, setPageInfo] = useState<PageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<"pages" | "redact" | "data">("pages");

  // Fetch the utility bill
  const bill = useQuery(
    api.documents.getUtilityBill,
    isLoaded && isSignedIn ? { billId } : "skip"
  );

  // Fetch property for navigation
  const property = useQuery(
    api.properties.getProperty,
    isLoaded && isSignedIn ? { id: propertyId } : "skip"
  );

  const initializePagesFromPdf = useCallback(async () => {
    if (!bill?.billPdfUrl) return;

    try {
      // Dynamically import PDF.js
      const { getDocument } = await import("@/lib/pdf-loader");
      const loadingTask = await getDocument(bill.billPdfUrl);
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      // Initialize all pages as kept with no redaction areas
      const initialPageInfo: PageInfo[] = [];
      for (let i = 1; i <= numPages; i++) {
        initialPageInfo.push({
          pageNumber: i,
          keep: true, // Default to keeping all pages
          redactionAreas: [],
        });
      }

      setPageInfo(initialPageInfo);
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast({
        title: "Error",
        description: "Failed to load PDF for editing",
        variant: "destructive",
      });
    }
  }, [bill?.billPdfUrl]);

  // Initialize pageInfo from existing bill data
  useEffect(() => {
    if (bill?.pageInfo && bill.pageInfo.length > 0) {
      // Use existing page info if available
      setPageInfo(bill.pageInfo);
    } else if (bill?.billPdfUrl) {
      // Initialize with all pages set to keep=true if no pageInfo exists
      initializePagesFromPdf();
    }
  }, [bill, initializePagesFromPdf]);

  const handlePageToggle = (pageNumber: number, keep: boolean) => {
    setPageInfo(prev => 
      prev.map(page => 
        page.pageNumber === pageNumber 
          ? { ...page, keep }
          : page
      )
    );
  };

  const handleRedactionAreasChange = (areas: any[]) => {
    console.log('=== REDACTION AREAS CHANGE ===');
    console.log('New areas received:', areas);
    console.log('Areas count:', areas.length);
    
    // Update pageInfo with new redaction areas
    setPageInfo(prev => {
      const newPageInfo = [...prev];
      
      // Clear all existing redaction areas
      newPageInfo.forEach(page => {
        page.redactionAreas = [];
      });
      
      // Add all areas to their respective pages
      areas.forEach(area => {
        const pageIndex = newPageInfo.findIndex(p => p.pageNumber === area.pageNumber);
        if (pageIndex !== -1) {
          const redactionArea = {
            id: area.id,
            fieldName: area.fieldName || `redacted_area_${area.id}`,
            fieldType: area.fieldType || 'text',
            x: area.x,
            y: area.y,
            width: area.width,
            height: area.height,
            pageNumber: area.pageNumber,
            color: area.color, // Include the redaction color
          };
          console.log(`Adding redaction to page ${area.pageNumber}:`, redactionArea);
          newPageInfo[pageIndex].redactionAreas.push(redactionArea);
        }
      });
      
      console.log('Updated pageInfo:', newPageInfo);
      return newPageInfo;
    });
  };

  const handleSave = async () => {
    console.log('=== SAVE BUTTON CLICKED ===');
    console.log('Current pageInfo:', pageInfo);
    console.log('PageInfo length:', pageInfo.length);
    
    if (!bill || pageInfo.length === 0) {
      console.log('ERROR: No bill or pageInfo');
      toast({
        title: "Error",
        description: "No changes to save",
        variant: "destructive",
      });
      return;
    }

    // Check if at least one page is kept
    const pagesToKeep = pageInfo.filter(p => p.keep);
    console.log('Pages to keep:', pagesToKeep.length);
    
    if (pagesToKeep.length === 0) {
      console.log('ERROR: No pages to keep');
      toast({
        title: "Error",
        description: "At least one page must be selected to keep",
        variant: "destructive",
      });
      return;
    }

    // Check redaction areas
    const totalRedactions = pageInfo.reduce((sum, page) => sum + page.redactionAreas.length, 0);
    console.log('Total redaction areas:', totalRedactions);
    pageInfo.forEach(page => {
      console.log(`Page ${page.pageNumber}: ${page.redactionAreas.length} redactions, keep: ${page.keep}`);
      page.redactionAreas.forEach(area => {
        console.log(`  - Redaction ${area.id}: color=${area.color}, pos=(${area.x},${area.y}), size=${area.width}x${area.height}`);
      });
    });

    setLoading(true);
    try {
      // Update the bill's pageInfo in the database
      await fetch('/api/update-bill-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId,
          pageInfo,
        }),
      });

      // Check if processing is needed
      const hasRedactions = pageInfo.some(p => p.redactionAreas && p.redactionAreas.length > 0);
      const needsProcessing = pagesToKeep.length < pageInfo.length || hasRedactions;

      if (needsProcessing) {
        toast({
          title: "Processing PDF...",
          description: "Creating updated redacted version",
        });

        // Trigger PDF reprocessing
        const response = await fetch('/api/process-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalPdfUrl: bill.billPdfUrl,
            pageInfo,
            billId,
          }),
        });

        if (!response.ok) {
          throw new Error('PDF processing failed');
        }

        toast({
          title: "Success!",
          description: "PDF has been re-processed with your changes",
        });
      } else {
        toast({
          title: "Success!",
          description: "Changes saved successfully",
        });
      }

      // Navigate back to documents page
      setTimeout(() => {
        router.push(`/properties/${propertyId}/documents`);
      }, 1500);

    } catch (error) {
      console.error("Error saving changes:", error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Bill not found</h3>
            <p className="text-gray-600 mb-4">The utility bill you&apos;re trying to edit doesn&apos;t exist.</p>
            <Link href={`/properties/${propertyId}/documents`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Documents
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pagesToKeep = pageInfo.filter(p => p.keep);
  const totalRedactions = pageInfo.reduce((sum, page) => sum + (page.redactionAreas?.length || 0), 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Re-edit PDF"
        backHref={`/properties/${propertyId}/documents`}
        backLabel="Back to Documents"
        breadcrumbs={[
          { label: "Properties", href: "/properties" },
          { label: property?.name || "Property", href: `/properties/${propertyId}` },
          { label: "Documents", href: `/properties/${propertyId}/documents` },
          { label: "Edit PDF" }
        ]}
        showBreadcrumbs={true}
      >
        <div className="text-sm text-gray-600">
          {pagesToKeep.length} of {pageInfo.length} pages • {totalRedactions} redactions
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </PageHeader>
      
      {/* Property Info */}
      <div className="mb-6">
        <p className="text-gray-600">{property?.name} - Utility Bill</p>
      </div>

      {/* Steps */}
      <div className="flex gap-4 mb-6">
        <Button
          variant={currentStep === "pages" ? "default" : "outline"}
          onClick={() => setCurrentStep("pages")}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Select Pages
        </Button>
        <Button
          variant={currentStep === "redact" ? "default" : "outline"}
          onClick={() => setCurrentStep("redact")}
          className="flex items-center gap-2"
        >
          <EyeOff className="h-4 w-4" />
          Add Redactions
        </Button>
        <Button
          variant={currentStep === "data" ? "default" : "outline"}
          onClick={() => setCurrentStep("data")}
          className="flex items-center gap-2"
        >
          <Database className="h-4 w-4" />
          Extracted Data
        </Button>
      </div>

      {/* Step Content */}
      {currentStep === "pages" && (
        <Card>
          <CardHeader>
            <CardTitle>Select Pages to Keep</CardTitle>
            <p className="text-sm text-gray-600">
              Toggle pages on/off. Only selected pages will appear in the final PDF.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {pageInfo.map((page) => (
                <div key={page.pageNumber} className="text-center">
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      page.keep
                        ? "border-green-500 bg-green-50"
                        : "border-gray-300 bg-gray-50"
                    }`}
                    onClick={() => handlePageToggle(page.pageNumber, !page.keep)}
                  >
                    <div className="flex items-center justify-center mb-2">
                      {page.keep ? (
                        <Eye className="h-6 w-6 text-green-600" />
                      ) : (
                        <EyeOff className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="text-sm font-medium">Page {page.pageNumber}</div>
                    <div className="text-xs text-gray-500">
                      {page.keep ? "Included" : "Excluded"}
                    </div>
                    {page.redactionAreas && page.redactionAreas.length > 0 && (
                      <div className="text-xs text-blue-600 mt-1">
                        {page.redactionAreas.length} redaction{page.redactionAreas.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === "redact" && bill.billPdfUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Add Redaction Areas</CardTitle>
            <p className="text-sm text-gray-600">
              Draw rectangles over sensitive information to redact it.
            </p>
          </CardHeader>
          <CardContent>
            <DocumentAreaSelector
              fileUrl={bill.billPdfUrl}
              onAreasChange={handleRedactionAreasChange}
              existingAreas={pageInfo.flatMap(page => 
                page.redactionAreas?.map(area => ({
                  ...area,
                  pageNumber: page.pageNumber,
                })) || []
              )}
              mode="select"
              isRedactionMode={true}
            />
          </CardContent>
        </Card>
      )}

      {currentStep === "data" && (
        <UtilityBillExtractedData 
          extractedData={bill.extractedData}
        />
      )}
    </div>
  );
}