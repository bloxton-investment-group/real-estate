"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Upload, Calendar, Zap, FileImage, Download, Edit3 } from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";

interface DocumentsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function DocumentsPage({ params }: DocumentsPageProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const resolvedParams = use(params);
  const propertyId = resolvedParams.id as Id<"properties">;
  
  const property = useQuery(
    api.properties.getProperty, 
    isLoaded && isSignedIn ? { id: propertyId } : "skip"
  );
  const documents = useQuery(
    api.documents.getPropertyDocuments, 
    isLoaded && isSignedIn ? { propertyId } : "skip"
  );

  if (!isLoaded) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p>Please sign in to view this page.</p>
        </div>
      </div>
    );
  }

  if (property === undefined || documents === undefined) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (property === null) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Property Not Found</h1>
          <p className="text-gray-600 mt-2">The property you're looking for doesn't exist.</p>
          <Link href="/properties">
            <Button className="mt-4">Back to Properties</Button>
          </Link>
        </div>
      </div>
    );
  }

  const utilityBills = documents.filter(doc => doc.type === "utility_bill");
  const meterReadings = documents.filter(doc => doc.type === "meter_reading");

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href={`/properties/${propertyId}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Property
          </Button>
        </Link>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Documents</h1>
            <p className="text-gray-600 mt-1">{property.name} - {property.address}</p>
          </div>
          
          <div className="flex gap-2">
            <Link 
              href={`/properties/${propertyId}/documents/enhanced-upload`}
              prefetch={true}
            >
              <Button size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload Utility Bill
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold">{documents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Utility Bills</p>
                <p className="text-2xl font-bold">{utilityBills.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileImage className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Meter Readings</p>
                <p className="text-2xl font-bold">{meterReadings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold">
                  {documents.filter(doc => {
                    const docDate = doc.date ? new Date(doc.date) : new Date();
                    const now = new Date();
                    return docDate.getMonth() === now.getMonth() && 
                           docDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No documents yet</h3>
            <p className="text-gray-600 mb-6">Start by uploading utility bills or adding meter readings</p>
            <div className="flex gap-3 justify-center">
              <Link href={`/properties/${propertyId}/documents/upload-bill`}>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Utility Bill
                </Button>
              </Link>
              <Button variant="outline" disabled>
                <Upload className="h-4 w-4 mr-2" />
                Add Meter Reading
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Utility Bills */}
          {utilityBills.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-yellow-600" />
                <h2 className="text-xl font-semibold">Utility Bills</h2>
                <Badge variant="secondary">{utilityBills.length}</Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {utilityBills.map((bill) => (
                  <Card key={bill._id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">Utility Bill</CardTitle>
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          Bill
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {bill.date ? new Date(bill.date).toLocaleDateString() : 'N/A'}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Usage (kWh):</span>
                          <span className="font-medium">{bill.extractedData?.kilowatt_hours || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Gross Receipt Tax:</span>
                          <span className="font-medium">${bill.extractedData?.gross_receipt_tax?.toFixed(2) || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Uploaded:</span>
                          <span className="text-gray-500">
                            {formatDistanceToNow(new Date(bill.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        {/* View Redacted PDF (preferred) or Original PDF */}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => {
                            const pdfUrl = bill.summaryPageUrl || bill.billPdfUrl;
                            if (pdfUrl) {
                              window.open(pdfUrl, '_blank');
                            }
                          }}
                          disabled={!bill.billPdfUrl && !bill.summaryPageUrl}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {bill.summaryPageUrl ? 'View Redacted' : 'View Original'}
                        </Button>
                        
                        {/* Re-edit PDF button */}
                        <Link href={`/properties/${propertyId}/documents/edit-pdf/${bill._id}`}>
                          <Button 
                            size="sm" 
                            variant="outline"
                            title="Re-edit pages and redactions"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </Link>
                        
                        {/* Show original PDF button if redacted version exists */}
                        {bill.summaryPageUrl && bill.billPdfUrl && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => {
                              window.open(bill.billPdfUrl, '_blank');
                            }}
                            title="View original unredacted PDF"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Meter Readings */}
          {meterReadings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileImage className="h-5 w-5 text-green-600" />
                <h2 className="text-xl font-semibold">Meter Readings</h2>
                <Badge variant="secondary">{meterReadings.length}</Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {meterReadings.map((reading) => (
                  <Card key={reading._id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">Meter Reading</CardTitle>
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Reading
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {new Date(reading.date).toLocaleDateString()}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Raw Value:</span>
                          <span className="font-medium">{reading.extractedValue}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Adjusted:</span>
                          <span className="font-medium">{reading.adjustedValue}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Recorded:</span>
                          <span className="text-gray-500">
                            {formatDistanceToNow(new Date(reading.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" className="flex-1" disabled>
                          <Download className="h-4 w-4 mr-2" />
                          View Image
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}