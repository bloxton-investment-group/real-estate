"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TenantBillingPeriodForm } from "./tenant-billing-period-form";
import { TenantBillingPeriodsList } from "./tenant-billing-periods-list";
import { TenantInvoiceGenerator } from "./tenant-invoice-generator";
import { BillingCalculatorWidget } from "./billing-calculator-widget";

interface TenantBillingManagerProps {
  propertyId: Id<"properties">;
}

export function TenantBillingManager({ propertyId }: TenantBillingManagerProps) {
  const [activeTab, setActiveTab] = useState("periods");
  
  // Get tenants for this property
  const tenants = useQuery(api.tenants.getTenantsByProperty, { propertyId });
  
  // Get tenant billing periods
  const billingPeriods = useQuery(api.tenantBilling.getTenantBillingPeriods, { propertyId });
  
  // Get utility bills for this property
  const utilityBills = useQuery(api.documents.getUtilityBills, { propertyId });

  if (!tenants || !billingPeriods || !utilityBills) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="periods">Billing Periods</TabsTrigger>
          <TabsTrigger value="new-period">New Period</TabsTrigger>
          <TabsTrigger value="invoices">Generate Invoice</TabsTrigger>
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="periods" className="space-y-4">
          <TenantBillingPeriodsList 
            billingPeriods={billingPeriods}
            tenants={tenants}
          />
        </TabsContent>

        <TabsContent value="new-period" className="space-y-4">
          <TenantBillingPeriodForm 
            propertyId={propertyId}
            tenants={tenants}
          />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <TenantInvoiceGenerator
            propertyId={propertyId}
            tenants={tenants}
            billingPeriods={billingPeriods}
            utilityBills={utilityBills}
          />
        </TabsContent>

        <TabsContent value="calculator" className="space-y-4">
          <BillingCalculatorWidget />
        </TabsContent>
      </Tabs>
    </div>
  );
}