"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, FileText, Calendar } from "lucide-react";
import { format, parseISO, isWithinInterval, differenceInDays } from "date-fns";

interface UtilityBill {
  _id: string;
  extractedData?: {
    start_date?: string;
    end_date?: string;
    kilowatt_hours?: number;
    cost_per_kilowatt_hour?: number;
  };
  createdAt: number;
}

interface UtilityBillCoverageProps {
  startDate: string;
  endDate: string;
  utilityBills: UtilityBill[];
  isLoading?: boolean;
}

export function UtilityBillCoverage({ startDate, endDate, utilityBills, isLoading = false }: UtilityBillCoverageProps) {
  // Parse the billing period dates
  const periodStart = parseISO(startDate);
  const periodEnd = parseISO(endDate);
  const periodDays = differenceInDays(periodEnd, periodStart) + 1;

  // Find bills that overlap with the billing period
  const relevantBills = utilityBills.filter(bill => {
    if (!bill.extractedData?.start_date || !bill.extractedData?.end_date) {
      return false;
    }
    
    const billStart = parseISO(bill.extractedData.start_date);
    const billEnd = parseISO(bill.extractedData.end_date);
    
    // Check if there's any overlap
    return (
      isWithinInterval(billStart, { start: periodStart, end: periodEnd }) ||
      isWithinInterval(billEnd, { start: periodStart, end: periodEnd }) ||
      isWithinInterval(periodStart, { start: billStart, end: billEnd }) ||
      isWithinInterval(periodEnd, { start: billStart, end: billEnd })
    );
  });

  // Calculate coverage
  const coverageDays = new Set<string>();
  relevantBills.forEach(bill => {
    if (!bill.extractedData?.start_date || !bill.extractedData?.end_date) return;
    
    const billStart = parseISO(bill.extractedData.start_date);
    const billEnd = parseISO(bill.extractedData.end_date);
    
    // Add each day that's covered
    let currentDate = billStart > periodStart ? billStart : periodStart;
    const endDate = billEnd < periodEnd ? billEnd : periodEnd;
    
    while (currentDate <= endDate) {
      coverageDays.add(format(currentDate, 'yyyy-MM-dd'));
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }
  });

  const coveredDays = coverageDays.size;
  const coveragePercentage = Math.round((coveredDays / periodDays) * 100);
  const hasFullCoverage = coveredDays >= periodDays;
  const hasMissingData = relevantBills.some(bill => 
    !bill.extractedData?.kilowatt_hours || !bill.extractedData?.cost_per_kilowatt_hour
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Utility Bill Coverage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              <div className="space-y-2">
                <div className="h-10 bg-gray-100 rounded animate-pulse" />
                <div className="h-10 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ) : (
            <>
          {/* Coverage Summary */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              {hasFullCoverage ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : coveragePercentage > 0 ? (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">
                {coveragePercentage}% Coverage
              </span>
            </div>
            <span className="text-sm text-gray-600">
              {coveredDays} of {periodDays} days
            </span>
          </div>

          {/* Coverage Status */}
          {hasFullCoverage ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-800">
                Full utility bill coverage for this period. You can generate accurate invoices.
              </p>
            </div>
          ) : coveragePercentage > 0 ? (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Partial coverage ({coveragePercentage}%). Pro-rata calculations will be used for accurate billing.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <XCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-800">
                No utility bills found for this period. Please upload bills before generating invoices.
              </p>
            </div>
          )}

          {/* Missing Data Warning */}
          {hasMissingData && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-800">
                Some utility bills are missing extracted data. Please review and update them.
              </p>
            </div>
          )}

          {/* Relevant Bills */}
          {relevantBills.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Relevant Utility Bills:</h4>
              <div className="space-y-2">
                {relevantBills.map(bill => (
                  <div key={bill._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        {bill.extractedData?.start_date && bill.extractedData?.end_date ? (
                          <>
                            {format(parseISO(bill.extractedData.start_date), 'MMM d')} - 
                            {format(parseISO(bill.extractedData.end_date), 'MMM d, yyyy')}
                          </>
                        ) : (
                          'Date not extracted'
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {bill.extractedData?.kilowatt_hours ? (
                        <Badge variant="outline" className="text-xs">
                          {bill.extractedData.kilowatt_hours} kWh
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          Missing kWh
                        </Badge>
                      )}
                      {bill.extractedData?.cost_per_kilowatt_hour ? (
                        <Badge variant="outline" className="text-xs">
                          ${bill.extractedData.cost_per_kilowatt_hour}/kWh
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          Missing Rate
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}