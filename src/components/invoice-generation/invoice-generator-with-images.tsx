"use client";

import React from 'react';
import { InvoiceGenerator } from './invoice-generator';
import { TenantInvoiceData } from './invoice-templates';
import { Id } from "../../../convex/_generated/dataModel";

interface InvoiceGeneratorWithImagesProps {
  invoiceData: TenantInvoiceData & { supportingImageIds?: Id<"_storage">[] };
  imageUrls?: string[];
  onSave?: (pdfUrl: string) => void;
  onSend?: () => void;
}

export function InvoiceGeneratorWithImages({ 
  invoiceData, 
  imageUrls = [],
  onSave, 
  onSend 
}: InvoiceGeneratorWithImagesProps) {
  const { supportingImageIds, ...baseInvoiceData } = invoiceData;

  // Create the final invoice data with resolved image URLs
  const finalInvoiceData: TenantInvoiceData = {
    ...baseInvoiceData,
    supportingImages: imageUrls,
  };

  return (
    <InvoiceGenerator 
      invoiceData={finalInvoiceData}
      onSave={onSave}
      onSend={onSend}
    />
  );
}