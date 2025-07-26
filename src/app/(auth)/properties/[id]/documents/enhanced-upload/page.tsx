"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { SmartBillExtractor } from "@/components/documents/smart-bill-extractor";

interface EnhancedUploadPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EnhancedUploadPage({ params }: EnhancedUploadPageProps) {
  const [propertyId, setPropertyId] = useState<string | null>(null);

  useEffect(() => {
    params.then((resolvedParams) => {
      setPropertyId(resolvedParams.id);
    });
  }, [params]);

  if (!propertyId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Link href={`/properties/${propertyId}/documents`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Button>
        </Link>
        
        <h1 className="text-3xl font-bold">Upload Utility Bill with Enhanced Extraction</h1>
        <p className="text-gray-600 mt-2">
          Upload a utility bill and define specific areas to extract data for improved accuracy
        </p>
      </div>

      <SmartBillExtractor 
        propertyId={propertyId as Id<"properties">}
      />
    </div>
  );
}