"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileText, Calculator, DollarSign } from "lucide-react";

interface Tenant {
  _id: Id<"tenants">;
  name: string;
  billingInstructions?: string;
}

interface TenantBillingPeriod {
  _id: Id<"tenantBillingPeriods">;
  tenantId: Id<"tenants">;
  startDate: string;
  endDate: string;
  kilowattHours: number;
  calculationNotes?: string;
}

interface UtilityBill {
  _id: Id<"utilityBills">;
  extractedData?: {
    start_date?: string;
    end_date?: string;
    kilowatt_hours?: number;
    cost_per_kilowatt_hour?: number;
    state_sales_tax?: number;
    gross_receipt_tax?: number;
    adjustment?: number;
    delivery_charges?: number;
  };
  createdAt: number;
}

interface TenantInvoiceGeneratorProps {
  propertyId: Id<"properties">;
  tenants: Tenant[];
  billingPeriods: TenantBillingPeriod[];
  utilityBills: UtilityBill[];
}

export function TenantInvoiceGenerator({ 
  propertyId, 
  tenants, 
  billingPeriods, 
  utilityBills 
}: TenantInvoiceGeneratorProps) {
  const [selectedTenantId, setSelectedTenantId] = useState<Id<"tenants"> | null>(null);
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<Set<Id<"tenantBillingPeriods">>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedTenant = tenants.find(t => t._id === selectedTenantId);
  const tenantPeriods = billingPeriods.filter(p => p.tenantId === selectedTenantId);

  // Get pro-rata calculation for selected periods
  const selectedPeriods = Array.from(selectedPeriodIds).map(id => 
    billingPeriods.find(p => p._id === id)
  ).filter(Boolean);

  // Calculate pro-rata allocation for the first selected period (as example)
  const firstPeriodId = Array.from(selectedPeriodIds)[0];
  const proRataCalculation = useQuery(
    api.tenantBilling.calculateProRataAllocation,
    firstPeriodId ? { tenantBillingPeriodId: firstPeriodId } : "skip"
  );

  const handlePeriodToggle = (periodId: Id<"tenantBillingPeriods">, checked: boolean) => {
    setSelectedPeriodIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(periodId);
      } else {
        newSet.delete(periodId);
      }
      return newSet;
    });
  };

  const handleGenerateInvoice = async () => {
    if (selectedPeriodIds.size === 0) {
      return;
    }

    setIsGenerating(true);
    try {
      // Here we would call the invoice generation mutation
      // For now, just simulate the process
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Generating invoice for periods:", Array.from(selectedPeriodIds));
    } finally {
      setIsGenerating(false);
    }
  };

  // Parse billing instructions to render with links
  const renderBillingInstructions = (instructions: string) => {
    if (!instructions) return null;

    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(instructions)) !== null) {
      if (match.index > lastIndex) {
        parts.push(instructions.substring(lastIndex, match.index));
      }
      
      parts.push(
        <a
          key={match.index}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline font-medium"
        >
          {match[1]}
        </a>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < instructions.length) {
      parts.push(instructions.substring(lastIndex));
    }

    return parts;
  };

  return (
    <div className="space-y-6">
      {/* Tenant Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Tenant Invoice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Tenant</label>
              <Select value={selectedTenantId || ""} onValueChange={(value) => {
                setSelectedTenantId(value as Id<"tenants">);
                setSelectedPeriodIds(new Set());
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tenant to generate invoice for" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant._id} value={tenant._id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Instructions */}
      {selectedTenant?.billingInstructions && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-amber-800 mb-2">
                  Billing Instructions for {selectedTenant.name}
                </h4>
                <div className="text-amber-700 leading-relaxed">
                  {renderBillingInstructions(selectedTenant.billingInstructions)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period Selection */}
      {selectedTenantId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Billing Periods</CardTitle>
          </CardHeader>
          <CardContent>
            {tenantPeriods.length === 0 ? (
              <p className="text-gray-500 py-4">
                No billing periods found for this tenant.
              </p>
            ) : (
              <div className="space-y-3">
                {tenantPeriods.map((period) => (
                  <div key={period._id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={period._id}
                      checked={selectedPeriodIds.has(period._id)}
                      onCheckedChange={(checked) => handlePeriodToggle(period._id, !!checked)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">
                        {period.startDate} to {period.endDate}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calculator className="h-3 w-3" />
                          {period.kilowattHours.toLocaleString()} kWh
                        </span>
                        {period.calculationNotes && (
                          <span className="text-blue-600">
                            Notes: {period.calculationNotes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pro-rata Calculation Preview */}
      {proRataCalculation && selectedPeriodIds.size > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <DollarSign className="h-5 w-5" />
              Invoice Preview (Pro-rata Calculation)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-green-700">Tenant Usage:</span>
                  <span className="ml-2 font-mono">
                    {proRataCalculation.period.kilowattHours.toLocaleString()} kWh
                  </span>
                </div>
                <div>
                  <span className="text-green-700">Property Total:</span>
                  <span className="ml-2 font-mono">
                    {proRataCalculation.totalPropertyKwh.toLocaleString()} kWh
                  </span>
                </div>
              </div>

              <div className="flex justify-between py-2 border-t border-green-200">
                <span className="text-green-700">Contribution Ratio:</span>
                <span className="font-mono">
                  {(proRataCalculation.tenantRatio * 100).toFixed(2)}%
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-green-700">Direct Usage Cost:</span>
                  <span className="font-mono">${proRataCalculation.directCost?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">State Sales Tax:</span>
                  <span className="font-mono">${proRataCalculation.allocatedCosts?.stateSalesTax?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Gross Receipt Tax:</span>
                  <span className="font-mono">${proRataCalculation.allocatedCosts?.grossReceiptTax?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Adjustment:</span>
                  <span className="font-mono">${proRataCalculation.allocatedCosts?.adjustment?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Delivery Charges:</span>
                  <span className="font-mono">${proRataCalculation.allocatedCosts?.deliveryCharges?.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between py-2 border-t border-green-300 font-bold text-green-800">
                <span>TOTAL INVOICE:</span>
                <span className="font-mono text-lg">${proRataCalculation.totalCost?.toFixed(2)}</span>
              </div>

              <div className="mt-4 text-xs text-green-600">
                <Badge variant="outline" className="mb-2">Overlapping Bills: {proRataCalculation.billAllocations?.length || 0}</Badge>
                <div>
                  This calculation uses pro-rata allocation based on overlapping utility bill periods.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Button */}
      {selectedPeriodIds.size > 0 && (
        <Button
          onClick={handleGenerateInvoice}
          disabled={isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? "Generating Invoice..." : `Generate Invoice for ${selectedPeriodIds.size} Period(s)`}
        </Button>
      )}
    </div>
  );
}