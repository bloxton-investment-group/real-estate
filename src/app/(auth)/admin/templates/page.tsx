import { TemplateManager } from "@/components/documents/template-manager";
import { PageHeader } from "@/components/navigation/page-header";

export default function TemplatesPage() {
  return (
    <div className="container mx-auto p-6">
      <PageHeader
        title="Template Management"
        backHref="/dashboard"
        backLabel="Back to Dashboard"
        breadcrumbs={[
          { label: "Admin" },
          { label: "Templates" }
        ]}
        showBreadcrumbs={true}
      />
      <TemplateManager />
    </div>
  );
}