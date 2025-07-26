"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Id } from "../../../convex/_generated/dataModel";
import { TenantEditForm } from "./tenant-edit-form";
import { Edit3, Mail, Phone, AlertTriangle } from "lucide-react";

interface Tenant {
  _id: Id<"tenants">;
  name: string;
  email?: string;
  phone?: string;
  unitNumber?: string;
  billingInstructions?: string;
  active: boolean;
}

interface TenantManagementCardProps {
  tenants: Tenant[];
}

export function TenantManagementCard({ tenants }: TenantManagementCardProps) {
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const activeTenants = tenants.filter(t => t.active);

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

  if (editingTenant) {
    return (
      <TenantEditForm
        tenant={editingTenant}
        onSave={() => setEditingTenant(null)}
        onCancel={() => setEditingTenant(null)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Active Tenants ({activeTenants.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeTenants.length === 0 ? (
          <p className="text-gray-500 py-4">No active tenants</p>
        ) : (
          <div className="space-y-4">
            {activeTenants.map((tenant) => (
              <div key={tenant._id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{tenant.name}</h4>
                      {tenant.unitNumber && (
                        <Badge variant="outline">{tenant.unitNumber}</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      {tenant.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <span>{tenant.email}</span>
                        </div>
                      )}
                      {tenant.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{tenant.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Billing Instructions */}
                    {tenant.billingInstructions && (
                      <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-amber-800 text-sm mb-1">
                              Billing Instructions:
                            </div>
                            <div className="text-sm text-amber-700 leading-relaxed">
                              {renderBillingInstructions(tenant.billingInstructions)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingTenant(tenant)}
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}