"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UtilityBillData {
  // Main bill data
  kilowatt_hours?: number;
  state_sales_tax?: number;
  gross_receipt_tax?: number;
  adjustment?: number;
  cost_per_kilowatt_hour?: number;
  delivery_charges?: number;
}

interface TenantBillingCalculatorProps {
  billData: UtilityBillData;
  tenantName?: string;
  billingMethod?: 'basic' | 'advanced';
}

interface TenantInvoiceCalculation {
  tenant_kilowatt_hours: number;
  contribution_ratio: number;
  direct_cost: number;
  shared_costs: {
    state_sales_tax: number;
    gross_receipt_tax: number;
    adjustment: number;
    delivery_charges: number;
  };
  total_invoice: number;
  is_calculable: boolean;
  missing_fields: string[];
}

export function TenantBillingCalculator({ 
  billData, 
  tenantName = "Tenant",
  billingMethod = "advanced"
}: TenantBillingCalculatorProps) {
  const [tenantKwh, setTenantKwh] = useState<string>("");
  
  const calculateTenantInvoice = (tenantUsage: number): TenantInvoiceCalculation => {
    if (billingMethod === 'basic') {
      // Basic method: just usage * rate
      const requiredFields = ['cost_per_kilowatt_hour'];
      const missingFields = requiredFields.filter(field => 
        !billData[field as keyof UtilityBillData] && billData[field as keyof UtilityBillData] !== 0
      );
      
      if (missingFields.length > 0 || !tenantUsage) {
        return {
          tenant_kilowatt_hours: tenantUsage || 0,
          contribution_ratio: 0,
          direct_cost: 0,
          shared_costs: {
            state_sales_tax: 0,
            gross_receipt_tax: 0,
            adjustment: 0,
            delivery_charges: 0,
          },
          total_invoice: 0,
          is_calculable: false,
          missing_fields: !tenantUsage ? [...missingFields, 'tenant_usage'] : missingFields,
        };
      }

      const direct_cost = tenantUsage * (billData.cost_per_kilowatt_hour || 0);
      
      return {
        tenant_kilowatt_hours: tenantUsage,
        contribution_ratio: 0, // Not applicable for basic method
        direct_cost,
        shared_costs: {
          state_sales_tax: 0,
          gross_receipt_tax: 0,
          adjustment: 0,
          delivery_charges: 0,
        },
        total_invoice: direct_cost,
        is_calculable: true,
        missing_fields: [],
      };
    }

    // Advanced method: proportional calculation
    const requiredFields = [
      'kilowatt_hours', 'cost_per_kilowatt_hour', 'state_sales_tax', 
      'gross_receipt_tax', 'adjustment', 'delivery_charges'
    ];
    
    const missingFields = requiredFields.filter(field => 
      !billData[field as keyof UtilityBillData] && billData[field as keyof UtilityBillData] !== 0
    );
    
    if (missingFields.length > 0 || !tenantUsage) {
      return {
        tenant_kilowatt_hours: tenantUsage || 0,
        contribution_ratio: 0,
        direct_cost: 0,
        shared_costs: {
          state_sales_tax: 0,
          gross_receipt_tax: 0,
          adjustment: 0,
          delivery_charges: 0,
        },
        total_invoice: 0,
        is_calculable: false,
        missing_fields: !tenantUsage ? [...missingFields, 'tenant_usage'] : missingFields,
      };
    }

    // Calculate contribution ratio
    const contribution_ratio = (billData.kilowatt_hours || 1) > 0 
      ? tenantUsage / (billData.kilowatt_hours || 1) 
      : 0;
    
    // Calculate direct cost (tenant's usage * electric rate)
    const direct_cost = tenantUsage * (billData.cost_per_kilowatt_hour || 0);
    
    // Calculate shared costs (tenant's portion of taxes, fees, etc.)
    const shared_costs = {
      state_sales_tax: (billData.state_sales_tax || 0) * contribution_ratio,
      gross_receipt_tax: (billData.gross_receipt_tax || 0) * contribution_ratio,
      adjustment: (billData.adjustment || 0) * contribution_ratio,
      delivery_charges: (billData.delivery_charges || 0) * contribution_ratio,
    };
    
    // Calculate total invoice
    const total_invoice = direct_cost + 
      shared_costs.state_sales_tax + 
      shared_costs.gross_receipt_tax + 
      shared_costs.adjustment + 
      shared_costs.delivery_charges;
    
    return {
      tenant_kilowatt_hours: tenantUsage,
      contribution_ratio,
      direct_cost,
      shared_costs,
      total_invoice,
      is_calculable: true,
      missing_fields: [],
    };
  };

  const tenantUsage = parseFloat(tenantKwh) || 0;
  const calculation = calculateTenantInvoice(tenantUsage);
  
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-blue-800">⚡ {tenantName} Billing Calculator</CardTitle>
        <p className="text-sm text-blue-700">
          {billingMethod === 'basic' 
            ? 'Basic method: Usage × Rate' 
            : 'Advanced method: Proportional billing based on usage'
          }
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Tenant Usage Input */}
        <div className="p-4 bg-white rounded-lg border">
          <Label htmlFor="tenant-kwh" className="text-sm font-medium mb-2 block">
            Tenant Kilowatt Hours
          </Label>
          <Input
            id="tenant-kwh"
            type="number"
            step="0.01"
            placeholder="Enter tenant's kWh usage"
            value={tenantKwh}
            onChange={(e) => setTenantKwh(e.target.value)}
            className="text-lg font-semibold"
          />
          <p className="text-xs text-gray-500 mt-2">
            For Snyder: Enter (room kWh - fan kWh). For others: Enter meter reading.
          </p>
        </div>

        {/* Missing Fields Warning */}
        {calculation.missing_fields.length > 0 && (
          <div className="p-3 bg-yellow-100 rounded-lg border border-yellow-300">
            <p className="text-sm text-yellow-800 mb-2">Missing required fields:</p>
            <div className="flex flex-wrap gap-2">
              {calculation.missing_fields.map(field => (
                <Badge key={field} variant="outline" className="text-yellow-700 border-yellow-300">
                  {field === 'tenant_usage' ? 'Tenant Usage kWh' : field.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Calculation Results */}
        {tenantUsage > 0 && calculation.is_calculable && (
          <>
            {/* Usage Summary */}
            {billingMethod === 'advanced' && (
              <div className="p-3 bg-white rounded-lg border">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Contribution Ratio:</span>
                  <span className="font-semibold">
                    {tenantUsage.toFixed(2)} ÷ {billData.kilowatt_hours} = {(calculation.contribution_ratio * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}

            {/* Cost Breakdown */}
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-800">Invoice Breakdown:</h4>
              
              {/* Direct Cost */}
              <div className="flex justify-between p-2 bg-white rounded border">
                <span>{billingMethod === 'basic' ? 'Total Cost:' : 'Direct Usage Cost:'}</span>
                <span className="font-mono">
                  {tenantUsage.toFixed(2)} × ${billData.cost_per_kilowatt_hour?.toFixed(4)} = 
                  <strong className="ml-1">${calculation.direct_cost.toFixed(2)}</strong>
                </span>
              </div>

              {/* Shared Costs - only for advanced method */}
              {billingMethod === 'advanced' && calculation.contribution_ratio > 0 && (
                <>
                  <div className="text-sm text-gray-600 font-medium">
                    Shared Costs ({(calculation.contribution_ratio * 100).toFixed(2)}% of each):
                  </div>
                  
                  <div className="flex justify-between p-2 bg-white rounded border text-sm">
                    <span>State Sales Tax:</span>
                    <span className="font-mono">${calculation.shared_costs.state_sales_tax.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between p-2 bg-white rounded border text-sm">
                    <span>Gross Receipt Tax:</span>
                    <span className="font-mono">${calculation.shared_costs.gross_receipt_tax.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between p-2 bg-white rounded border text-sm">
                    <span>Adjustment:</span>
                    <span className="font-mono">${calculation.shared_costs.adjustment.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between p-2 bg-white rounded border text-sm">
                    <span>Delivery Charges:</span>
                    <span className="font-mono">${calculation.shared_costs.delivery_charges.toFixed(2)}</span>
                  </div>
                </>
              )}

              {/* Total */}
              <div className="flex justify-between p-3 bg-blue-100 rounded-lg border-2 border-blue-300">
                <span className="font-bold text-blue-800">TOTAL INVOICE:</span>
                <span className="font-bold text-xl text-blue-800">
                  ${calculation.is_calculable ? calculation.total_invoice.toFixed(2) : '0.00'}
                </span>
              </div>
            </div>

            {/* Summary Note */}
            <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
              <strong>Calculation Method:</strong> {
                billingMethod === 'basic' 
                  ? 'Simple usage × electric rate'
                  : 'Tenant usage × rate + proportional share of taxes and fees'
              }
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}