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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, Calculator } from "lucide-react";

interface Tenant {
  _id: Id<"tenants">;
  name: string;
  billingInstructions?: string;
}

interface TenantBillingPeriodFormProps {
  propertyId: Id<"properties">;
  tenants: Tenant[];
}

export function TenantBillingPeriodForm({ propertyId, tenants }: TenantBillingPeriodFormProps) {
  const [selectedTenantId, setSelectedTenantId] = useState<Id<"tenants"> | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [kilowattHours, setKilowattHours] = useState("");
  const [roomReading, setRoomReading] = useState("");
  const [fanReading, setFanReading] = useState("");
  const [mainReading, setMainReading] = useState("");
  const [calculationNotes, setCalculationNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createBillingPeriod = useMutation(api.tenantBilling.createTenantBillingPeriod);

  const selectedTenant = tenants.find(t => t._id === selectedTenantId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTenantId || !startDate || !endDate || !kilowattHours) {
      toast.error("Please fill in all required fields");
      return;
    }

    const kwhValue = parseFloat(kilowattHours);
    if (isNaN(kwhValue) || kwhValue <= 0) {
      toast.error("Please enter a valid kilowatt hours value");
      return;
    }

    setIsSubmitting(true);

    try {
      const meterReadings: any = {};
      if (roomReading) meterReadings.room = parseFloat(roomReading);
      if (fanReading) meterReadings.fan = parseFloat(fanReading);
      if (mainReading) meterReadings.main = parseFloat(mainReading);

      await createBillingPeriod({
        propertyId,
        tenantId: selectedTenantId,
        startDate,
        endDate,
        kilowattHours: kwhValue,
        meterReadings: Object.keys(meterReadings).length > 0 ? meterReadings : undefined,
        calculationNotes: calculationNotes || undefined,
      });

      // Reset form
      setSelectedTenantId(null);
      setStartDate("");
      setEndDate("");
      setKilowattHours("");
      setRoomReading("");
      setFanReading("");
      setMainReading("");
      setCalculationNotes("");

      toast.success("Billing period created successfully");
    } catch (error) {
      toast.error("Failed to create billing period");
      console.error("Error creating billing period:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Parse billing instructions to render with links
  const renderBillingInstructions = (instructions: string) => {
    if (!instructions) return null;

    // Simple link parser - looks for [text](url) markdown-style links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(instructions)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(instructions.substring(lastIndex, match.index));
      }
      
      // Add the link
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
    
    // Add remaining text
    if (lastIndex < instructions.length) {
      parts.push(instructions.substring(lastIndex));
    }

    return parts;
  };

  return (
    <div className="space-y-6">
      {/* Tenant-Specific Instructions */}
      {selectedTenant?.billingInstructions && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-amber-800 mb-2">
                  Special Instructions for {selectedTenant.name}
                </h4>
                <div className="text-amber-700 leading-relaxed">
                  {renderBillingInstructions(selectedTenant.billingInstructions)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Create New Billing Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tenant Selection */}
            <div>
              <Label htmlFor="tenant">Tenant *</Label>
              <Select value={selectedTenantId || ""} onValueChange={(value) => setSelectedTenantId(value as Id<"tenants">)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant._id} value={tenant._id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date *</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Kilowatt Hours */}
            <div>
              <Label htmlFor="kwh">Kilowatt Hours *</Label>
              <Input
                id="kwh"
                type="number"
                step="0.01"
                value={kilowattHours}
                onChange={(e) => setKilowattHours(e.target.value)}
                placeholder="Enter tenant's total kWh usage"
                required
              />
            </div>

            {/* Optional Meter Readings */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Optional Meter Readings (for documentation)</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="room-reading" className="text-xs text-gray-600">Room Reading</Label>
                  <Input
                    id="room-reading"
                    type="number"
                    step="0.01"
                    value={roomReading}
                    onChange={(e) => setRoomReading(e.target.value)}
                    placeholder="Room kWh"
                  />
                </div>
                <div>
                  <Label htmlFor="fan-reading" className="text-xs text-gray-600">Fan Reading</Label>
                  <Input
                    id="fan-reading"
                    type="number"
                    step="0.01"
                    value={fanReading}
                    onChange={(e) => setFanReading(e.target.value)}
                    placeholder="Fan kWh"
                  />
                </div>
                <div>
                  <Label htmlFor="main-reading" className="text-xs text-gray-600">Main Reading</Label>
                  <Input
                    id="main-reading"
                    type="number"
                    step="0.01"
                    value={mainReading}
                    onChange={(e) => setMainReading(e.target.value)}
                    placeholder="Main kWh"
                  />
                </div>
              </div>
            </div>

            {/* Calculation Notes */}
            <div>
              <Label htmlFor="notes">Calculation Notes</Label>
              <Textarea
                id="notes"
                value={calculationNotes}
                onChange={(e) => setCalculationNotes(e.target.value)}
                placeholder="e.g., Room: 2456 - Fan: 1089 = 1367 kWh"
                rows={3}
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Creating..." : "Create Billing Period"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}