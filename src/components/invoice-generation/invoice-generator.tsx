"use client";

import React, { useState } from 'react';
import { PDFDownloadLink, PDFViewer, BlobProvider } from '@react-pdf/renderer';
import { TenantProRataInvoice, TenantInvoiceData, InvoiceCompanyInfo } from './invoice-templates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Eye, Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

// Default company info - this should come from settings/configuration
const DEFAULT_COMPANY_INFO: InvoiceCompanyInfo = {
  name: 'Bloxton Investment Group',
  address: '123 Real Estate Blvd, Suite 100, City, State 12345',
  phone: '(555) 123-4567',
  email: 'billing@bloxtoninvestments.com',
  website: 'www.bloxtoninvestments.com',
};

interface InvoiceGeneratorProps {
  invoiceData: TenantInvoiceData;
  onSave?: (pdfUrl: string) => void;
  onSend?: () => void;
}

export function InvoiceGenerator({ invoiceData, onSave, onSend }: InvoiceGeneratorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // Merge default company info with any provided data
  const fullInvoiceData: TenantInvoiceData = {
    ...invoiceData,
    company: {
      ...DEFAULT_COMPANY_INFO,
      ...invoiceData.company,
    },
  };

  const handleSavePdf = async (blob: Blob) => {
    if (!onSave) return;
    
    setSaving(true);
    try {
      // Convert blob to base64 or upload to storage
      // For now, we'll create a local URL
      const url = URL.createObjectURL(blob);
      await onSave(url);
    } finally {
      setSaving(false);
    }
  };

  const fileName = `invoice_${fullInvoiceData.invoiceNumber}_${format(new Date(), 'yyyyMMdd')}.pdf`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Invoice #{fullInvoiceData.invoiceNumber}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Invoice Summary */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Recipient:</span>
                <p className="font-medium">{fullInvoiceData.recipient.name}</p>
              </div>
              <div>
                <span className="text-gray-600">Amount Due:</span>
                <p className="font-medium text-lg">${fullInvoiceData.costs.total.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-600">Invoice Date:</span>
                <p className="font-medium">
                  {format(new Date(fullInvoiceData.invoiceDate), 'MMM dd, yyyy')}
                </p>
              </div>
              {fullInvoiceData.dueDate && (
                <div>
                  <span className="text-gray-600">Due Date:</span>
                  <p className="font-medium">
                    {format(new Date(fullInvoiceData.dueDate), 'MMM dd, yyyy')}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <BlobProvider document={<TenantProRataInvoice data={fullInvoiceData} />}>
                {({ blob, url, loading, error }) => {
                  if (loading) {
                    return (
                      <Button disabled variant="outline">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </Button>
                    );
                  }
                  
                  if (error) {
                    return (
                      <Button disabled variant="outline">
                        Error generating PDF
                      </Button>
                    );
                  }

                  return (
                    <>
                      <PDFDownloadLink
                        document={<TenantProRataInvoice data={fullInvoiceData} />}
                        fileName={fileName}
                      >
                        {({ loading }) => (
                          <Button variant="outline" disabled={loading}>
                            <Download className="h-4 w-4 mr-2" />
                            {loading ? 'Preparing...' : 'Download PDF'}
                          </Button>
                        )}
                      </PDFDownloadLink>
                      
                      {onSave && blob && (
                        <Button
                          onClick={() => handleSavePdf(blob)}
                          disabled={saving}
                        >
                          {saving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-2" />
                              Save to System
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  );
                }}
              </BlobProvider>

              {onSend && (
                <Button onClick={onSend} variant="default">
                  <Send className="h-4 w-4 mr-2" />
                  Send Invoice
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDF Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Invoice Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[800px] border rounded-lg overflow-hidden">
              <PDFViewer width="100%" height="100%" showToolbar={false}>
                <TenantProRataInvoice data={fullInvoiceData} />
              </PDFViewer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Export a function to generate invoice number
export function generateInvoiceNumber(propertyId: string, date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const propertyCode = propertyId.slice(-4).toUpperCase();
  
  return `INV-${year}${month}-${propertyCode}-${timestamp}`;
}