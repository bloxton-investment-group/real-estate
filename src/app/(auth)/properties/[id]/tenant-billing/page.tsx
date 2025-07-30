"use client";

import React from "react";
import { TenantBillingManager } from "@/components/tenant-billing/tenant-billing-manager";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { PageHeader } from "@/components/navigation/page-header";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";

interface TenantBillingPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function TenantBillingPage({ params }: TenantBillingPageProps) {
  const resolvedParams = React.use(params);
  const propertyId = resolvedParams.id as Id<"properties">;
  
  // Get property info for breadcrumbs
  const property = useQuery(api.properties.getProperty, { id: propertyId });
  
  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Tenant Billing Management"
        backHref={`/properties/${propertyId}`}
        backLabel="Back to Property"
        breadcrumbs={[
          { label: "Properties", href: "/properties" },
          { label: property?.name || "Property", href: `/properties/${propertyId}` },
          { label: "Tenant Billing" }
        ]}
        showBreadcrumbs={true}
      />
      <TenantBillingManager propertyId={propertyId} />
    </div>
  );
}