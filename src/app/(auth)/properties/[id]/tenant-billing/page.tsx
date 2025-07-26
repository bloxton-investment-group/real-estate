import { TenantBillingManager } from "@/components/tenant-billing/tenant-billing-manager";
import { Id } from "../../../../../../convex/_generated/dataModel";

interface TenantBillingPageProps {
  params: {
    id: string;
  };
}

export default function TenantBillingPage({ params }: TenantBillingPageProps) {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Tenant Billing Management</h1>
      <TenantBillingManager propertyId={params.id as Id<"properties">} />
    </div>
  );
}