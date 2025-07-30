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
import { BillingCalculatorDialog } from "./billing-calculator-dialog";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";
import { PersistedNotesWidget } from "@/components/notes/persisted-notes-widget";

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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Manage Billing</h2>
        <BillingCalculatorDialog>
          <Button variant="outline" size="sm">
            <Calculator className="h-4 w-4 mr-2" />
            Calculator
          </Button>
        </BillingCalculatorDialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="periods">Billing Periods</TabsTrigger>
          <TabsTrigger value="new-period">New Period</TabsTrigger>
          <TabsTrigger value="invoices">Generate Invoice</TabsTrigger>
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
      </Tabs>

      {/* Persisted Notes Widget */}
      <PersistedNotesWidget propertyId={propertyId} />
    </div>
  );
}