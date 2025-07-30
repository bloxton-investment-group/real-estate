"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar, DollarSign, Zap, Info } from "lucide-react";
import { format, parseISO } from "date-fns";

interface BillAllocation {
  billId: string;
  billPeriod: string;
  overlap: {
    overlapStart: string;
    overlapEnd: string;
    overlapDays: number;
    billTotalDays: number;
    overlapPercentage: number;
  };
  dailyRates: {
    stateSalesTax: number;
    grossReceiptTax: number;
    adjustment: number;
    deliveryCharges: number;
  };
  allocatedCosts: {
    stateSalesTax: number;
    grossReceiptTax: number;
    adjustment: number;
    deliveryCharges: number;
  };
  electricRate: number;
}

interface ProRataCalculation {
  period: {
    kilowattHours: number;
    startDate: string;
    endDate: string;
  };
  totalPropertyKwh: number;
  tenantRatio: number;
  avgElectricRate: number;
  directCost: number;
  allocatedCosts: {
    stateSalesTax: number;
    grossReceiptTax: number;
    adjustment: number;
    deliveryCharges: number;
  };
  totalCost: number;
  billAllocations: BillAllocation[];
}

interface ProRataDetailsDialogProps {
  calculation: ProRataCalculation;
  children?: React.ReactNode;
}

export function ProRataDetailsDialog({ calculation, children }: ProRataDetailsDialogProps) {
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Info className="h-4 w-4 mr-2" />
            View Details
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pro-rata Calculation Details</DialogTitle>
          <DialogDescription>
            Detailed breakdown of how costs are allocated based on overlapping utility bills
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Period Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Billing Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Period</p>
                  <p className="font-medium">
                    {formatDate(calculation.period.startDate)} - {formatDate(calculation.period.endDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tenant Usage</p>
                  <p className="font-medium">{calculation.period.kilowattHours.toLocaleString()} kWh</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Contribution</p>
                  <p className="font-medium">{(calculation.tenantRatio * 100).toFixed(2)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bill Allocations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Overlapping Utility Bills
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {calculation.billAllocations.map((allocation, index) => (
                <div key={allocation.billId} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Bill #{index + 1}</h4>
                    <Badge variant="outline">
                      {allocation.overlap.overlapPercentage.toFixed(1)}% overlap
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Bill Period</p>
                      <p>{allocation.billPeriod}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Overlap Period</p>
                      <p>
                        {formatDate(allocation.overlap.overlapStart)} - {formatDate(allocation.overlap.overlapEnd)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Days</p>
                      <p>{allocation.overlap.overlapDays} of {allocation.overlap.billTotalDays} days</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Electric Rate</p>
                      <p>${allocation.electricRate.toFixed(4)}/kWh</p>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-2">Daily Rates (for this bill)</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Sales Tax:</span>
                        <span className="ml-1">${allocation.dailyRates.stateSalesTax.toFixed(2)}/day</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Gross Receipt:</span>
                        <span className="ml-1">${allocation.dailyRates.grossReceiptTax.toFixed(2)}/day</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Adjustment:</span>
                        <span className="ml-1">${allocation.dailyRates.adjustment.toFixed(2)}/day</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Delivery:</span>
                        <span className="ml-1">${allocation.dailyRates.deliveryCharges.toFixed(2)}/day</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Cost Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Cost Calculation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Usage Calculation</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                    <p>Total Property Usage: {calculation.totalPropertyKwh.toLocaleString()} kWh</p>
                    <p>Tenant Usage: {calculation.period.kilowattHours.toLocaleString()} kWh</p>
                    <p>Weighted Avg Rate: ${calculation.avgElectricRate.toFixed(4)}/kWh</p>
                    <p className="font-medium">
                      Direct Cost: {calculation.period.kilowattHours.toLocaleString()} × ${calculation.avgElectricRate.toFixed(4)} = 
                      <span className="text-green-600 ml-1">${calculation.directCost.toFixed(2)}</span>
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Pro-rata Fees & Taxes</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                    <p>State Sales Tax: ${calculation.allocatedCosts.stateSalesTax.toFixed(2)}</p>
                    <p>Gross Receipt Tax: ${calculation.allocatedCosts.grossReceiptTax.toFixed(2)}</p>
                    <p>Adjustments: ${calculation.allocatedCosts.adjustment.toFixed(2)}</p>
                    <p>Delivery Charges: ${calculation.allocatedCosts.deliveryCharges.toFixed(2)}</p>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Invoice Amount</span>
                    <span className="text-green-600">${calculation.totalCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}