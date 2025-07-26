"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Zap, User } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

interface Tenant {
  _id: Id<"tenants">;
  name: string;
}

interface TenantBillingPeriod {
  _id: Id<"tenantBillingPeriods">;
  propertyId: Id<"properties">;
  tenantId: Id<"tenants">;
  startDate: string;
  endDate: string;
  kilowattHours: number;
  meterReadings?: {
    room?: number;
    fan?: number;
    main?: number;
  };
  calculationNotes?: string;
  createdAt: number;
  tenant?: Tenant;
}

interface TenantBillingPeriodsListProps {
  billingPeriods: TenantBillingPeriod[];
  tenants: Tenant[];
}

export function TenantBillingPeriodsList({ billingPeriods, tenants }: TenantBillingPeriodsListProps) {
  // Create a map for quick tenant lookups
  const tenantMap = new Map(tenants.map(tenant => [tenant._id, tenant]));

  // Sort periods by most recent first
  const sortedPeriods = [...billingPeriods].sort((a, b) => b.createdAt - a.createdAt);

  if (sortedPeriods.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No billing periods created yet.</p>
          <p className="text-sm">Create your first billing period to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tenant Billing Periods</h3>
        <Badge variant="secondary">{sortedPeriods.length} periods</Badge>
      </div>

      <div className="grid gap-4">
        {sortedPeriods.map((period) => {
          const tenant = tenantMap.get(period.tenantId);
          
          return (
            <Card key={period._id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-semibold">{tenant?.name || "Unknown Tenant"}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{period.startDate} to {period.endDate}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      <span className="font-mono text-lg">
                        {period.kilowattHours.toLocaleString()} kWh
                      </span>
                    </div>

                    {/* Meter Readings */}
                    {period.meterReadings && (
                      <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">Meter Readings:</div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          {period.meterReadings.room && (
                            <div>
                              <span className="text-gray-500">Room:</span>
                              <span className="ml-1 font-mono">{period.meterReadings.room}</span>
                            </div>
                          )}
                          {period.meterReadings.fan && (
                            <div>
                              <span className="text-gray-500">Fan:</span>
                              <span className="ml-1 font-mono">{period.meterReadings.fan}</span>
                            </div>
                          )}
                          {period.meterReadings.main && (
                            <div>
                              <span className="text-gray-500">Main:</span>
                              <span className="ml-1 font-mono">{period.meterReadings.main}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Calculation Notes */}
                    {period.calculationNotes && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                        <div className="text-xs text-blue-600 mb-1">Calculation Notes:</div>
                        <div className="text-sm text-blue-800">{period.calculationNotes}</div>
                      </div>
                    )}
                  </div>

                  <div className="text-right text-sm text-gray-500">
                    <div>Created</div>
                    <div>{new Date(period.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}