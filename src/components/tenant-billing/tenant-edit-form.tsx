"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Edit3, AlertTriangle } from "lucide-react";

interface Tenant {
  _id: Id<"tenants">;
  name: string;
  email?: string;
  phone?: string;
  unitNumber?: string;
  billingInstructions?: string;
}

interface TenantEditFormProps {
  tenant: Tenant;
  onSave?: () => void;
  onCancel?: () => void;
}

export function TenantEditForm({ tenant, onSave, onCancel }: TenantEditFormProps) {
  const [name, setName] = useState(tenant.name);
  const [email, setEmail] = useState(tenant.email || "");
  const [phone, setPhone] = useState(tenant.phone || "");
  const [unitNumber, setUnitNumber] = useState(tenant.unitNumber || "");
  const [billingInstructions, setBillingInstructions] = useState(tenant.billingInstructions || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateTenant = useMutation(api.tenants.updateTenant);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Tenant name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateTenant({
        tenantId: tenant._id,
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        unitNumber: unitNumber.trim() || undefined,
        billingInstructions: billingInstructions.trim() || undefined,
      });

      toast.success("Tenant updated successfully");
      onSave?.();
    } catch (error) {
      toast.error("Failed to update tenant");
      console.error("Error updating tenant:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="h-5 w-5" />
          Edit Tenant: {tenant.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit Number</Label>
              <Input
                id="unit"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder="e.g., 1A, 101, Unit 5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tenant@example.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          {/* Billing Instructions */}
          <div>
            <Label htmlFor="billing-instructions">Billing Instructions</Label>
            <Textarea
              id="billing-instructions"
              value={billingInstructions}
              onChange={(e) => setBillingInstructions(e.target.value)}
              placeholder="Special billing instructions for this tenant..."
              rows={4}
            />
            <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">How to add links:</p>
                  <p>Use markdown syntax: [link text](https://example.com)</p>
                  <p className="mt-2"><strong>Example:</strong></p>
                  <p className="font-mono text-xs bg-white p-2 rounded border">
                    Snyder requires you to subtract the relevant month&apos;s reading for the room [here](https://example.com/room) from the fans [here](https://example.com/fan)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}