"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  Zap, 
  Home, 
  Mail,
  Hash,
  Clock,
  AlertCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface ExtractedData {
  account_number?: string | number;
  service_period?: string;
  billing_period?: string;
  due_date?: string;
  start_date?: string;
  end_date?: string;
  total_charges?: number;
  current_charges?: number;
  meter_numbers?: string[];
  kilowatt_hours?: number;
  days_of_service?: number;
  delivery_address?: string;
  mailing_address?: string;
  cost_per_kilowatt_hour?: number;
  payments?: number;
  taxes?: number;
  state_sales_tax?: number;
  gross_receipt_tax?: number;
  adjustment?: number;
  adjustments?: number;
  balance_forward?: number;
  energy_charge?: number;
  delivery_charges?: number;
  [key: string]: any; // Allow for additional fields
}

interface UtilityBillExtractedDataProps {
  extractedData: ExtractedData | null | undefined;
  className?: string;
}

export function UtilityBillExtractedData({ extractedData, className }: UtilityBillExtractedDataProps) {
  if (!extractedData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Extracted Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-gray-500">
            <AlertCircle className="h-4 w-4" />
            <span>No extracted data available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "N/A";
    try {
      return format(parseISO(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return "N/A";
    return `$${amount.toFixed(2)}`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Extracted Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Account Information */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2 text-sm text-gray-700">
            <Hash className="h-4 w-4" />
            Account Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Account Number</Label>
              <p className="font-mono text-sm">{extractedData.account_number?.toString() || "N/A"}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Service Period</Label>
              <p className="text-sm">{extractedData.service_period || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Billing Period */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2 text-sm text-gray-700">
            <Calendar className="h-4 w-4" />
            Billing Period
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Start Date</Label>
              <p className="text-sm">{formatDate(extractedData.start_date)}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">End Date</Label>
              <p className="text-sm">{formatDate(extractedData.end_date)}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Due Date</Label>
              <p className="text-sm">{formatDate(extractedData.due_date)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Days of Service</Label>
              <p className="text-sm">{extractedData.days_of_service || "N/A"}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Billing Period</Label>
              <p className="text-sm">{extractedData.billing_period || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Usage Information */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2 text-sm text-gray-700">
            <Zap className="h-4 w-4" />
            Usage Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Total kWh</Label>
              <p className="text-sm font-semibold">
                {extractedData.kilowatt_hours ? 
                  <Badge variant="outline">{extractedData.kilowatt_hours.toLocaleString()} kWh</Badge> : 
                  "N/A"
                }
              </p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Cost per kWh</Label>
              <p className="text-sm">
                {extractedData.cost_per_kilowatt_hour ? 
                  `$${extractedData.cost_per_kilowatt_hour.toFixed(4)}` : 
                  "N/A"
                }
              </p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Energy Charge</Label>
              <p className="text-sm">{formatCurrency(extractedData.energy_charge)}</p>
            </div>
          </div>
          {extractedData.meter_numbers && extractedData.meter_numbers.length > 0 && (
            <div>
              <Label className="text-xs text-gray-500">Meter Numbers</Label>
              <div className="flex gap-2 flex-wrap mt-1">
                {extractedData.meter_numbers.map((meter, index) => (
                  <Badge key={index} variant="secondary" className="font-mono text-xs">
                    {meter}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Charges & Payments */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2 text-sm text-gray-700">
            <DollarSign className="h-4 w-4" />
            Charges & Payments
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Total Charges</Label>
              <p className="text-sm font-semibold">{formatCurrency(extractedData.total_charges)}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Current Charges</Label>
              <p className="text-sm">{formatCurrency(extractedData.current_charges)}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Balance Forward</Label>
              <p className="text-sm">{formatCurrency(extractedData.balance_forward)}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Payments</Label>
              <p className="text-sm">{formatCurrency(extractedData.payments)}</p>
            </div>
          </div>
        </div>

        {/* Taxes & Adjustments */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2 text-sm text-gray-700">
            <DollarSign className="h-4 w-4" />
            Taxes & Adjustments
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">State Sales Tax</Label>
              <p className="text-sm">{formatCurrency(extractedData.state_sales_tax)}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Gross Receipt Tax</Label>
              <p className="text-sm">{formatCurrency(extractedData.gross_receipt_tax)}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Delivery Charges</Label>
              <p className="text-sm">{formatCurrency(extractedData.delivery_charges)}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Adjustments</Label>
              <p className="text-sm">
                {formatCurrency(extractedData.adjustment || extractedData.adjustments)}
              </p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Total Taxes</Label>
              <p className="text-sm">{formatCurrency(extractedData.taxes)}</p>
            </div>
          </div>
        </div>

        {/* Addresses */}
        {(extractedData.delivery_address || extractedData.mailing_address) && (
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2 text-sm text-gray-700">
              <Home className="h-4 w-4" />
              Addresses
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {extractedData.delivery_address && (
                <div>
                  <Label className="text-xs text-gray-500">Delivery Address</Label>
                  <p className="text-sm whitespace-pre-wrap">{extractedData.delivery_address}</p>
                </div>
              )}
              {extractedData.mailing_address && (
                <div>
                  <Label className="text-xs text-gray-500">Mailing Address</Label>
                  <p className="text-sm whitespace-pre-wrap">{extractedData.mailing_address}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}