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
import { toast } from "@/components/ui/use-toast";
import { Loader2, UserPlus, X } from "lucide-react";

interface TenantCreateFormProps {
  propertyId: Id<"properties">;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TenantCreateForm({ propertyId, onSuccess, onCancel }: TenantCreateFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    unitNumber: "",
    billingInstructions: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createTenant = useMutation(api.tenants.createTenant);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Tenant name is required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createTenant({
        propertyId,
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        unitNumber: formData.unitNumber.trim() || undefined,
        billingInstructions: formData.billingInstructions.trim() || undefined,
      });

      toast({
        title: "Success",
        description: `Tenant "${formData.name}" has been created successfully.`,
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        unitNumber: "",
        billingInstructions: "",
      });

      onSuccess?.();
    } catch (error) {
      console.error("Error creating tenant:", error);
      toast({
        title: "Error",
        description: "Failed to create tenant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Tenant
          </div>
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name - Required */}
          <div>
            <Label htmlFor="name" className="text-sm font-medium">
              Tenant Name *
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter tenant's full name"
              required
              disabled={isSubmitting}
              className="mt-1"
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="tenant@example.com"
              disabled={isSubmitting}
              className="mt-1"
            />
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone" className="text-sm font-medium">
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="(555) 123-4567"
              disabled={isSubmitting}
              className="mt-1"
            />
          </div>

          {/* Unit Number */}
          <div>
            <Label htmlFor="unitNumber" className="text-sm font-medium">
              Unit Number
            </Label>
            <Input
              id="unitNumber"
              type="text"
              value={formData.unitNumber}
              onChange={(e) => handleChange("unitNumber", e.target.value)}
              placeholder="e.g., 1A, 2B, Suite 101"
              disabled={isSubmitting}
              className="mt-1"
            />
          </div>

          {/* Billing Instructions */}
          <div>
            <Label htmlFor="billingInstructions" className="text-sm font-medium">
              Billing Instructions
            </Label>
            <Textarea
              id="billingInstructions"
              value={formData.billingInstructions}
              onChange={(e) => handleChange("billingInstructions", e.target.value)}
              placeholder="Special billing instructions, payment methods, or other notes..."
              disabled={isSubmitting}
              className="mt-1 min-h-[80px]"
            />
            <p className="text-xs text-gray-500 mt-1">
              You can use markdown-style links: [Link Text](https://example.com)
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Tenant
                </>
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}