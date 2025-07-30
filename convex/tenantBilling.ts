import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get tenant billing periods for a property
export const getTenantBillingPeriods = query({
  args: { 
    propertyId: v.optional(v.id("properties")),
    tenantId: v.optional(v.id("tenants")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    let periods;
    
    if (args.propertyId) {
      periods = await ctx.db
        .query("tenantBillingPeriods")
        .withIndex("by_property", (q: any) => q.eq("propertyId", args.propertyId))
        .order("desc")
        .collect();
    } else if (args.tenantId) {
      periods = await ctx.db
        .query("tenantBillingPeriods")
        .withIndex("by_tenant", (q: any) => q.eq("tenantId", args.tenantId))
        .order("desc")
        .collect();
    } else {
      periods = await ctx.db
        .query("tenantBillingPeriods")
        .order("desc")
        .collect();
    }

    // Fetch tenant names
    const tenantsMap = new Map();
    for (const period of periods) {
      if (!tenantsMap.has(period.tenantId)) {
        const tenant = await ctx.db.get(period.tenantId);
        if (tenant) {
          tenantsMap.set(period.tenantId, tenant);
        }
      }
    }

    return periods.map(period => ({
      ...period,
      tenant: tenantsMap.get(period.tenantId),
    }));
  },
});

// Create a new tenant billing period
export const createTenantBillingPeriod = mutation({
  args: {
    propertyId: v.id("properties"),
    tenantId: v.id("tenants"),
    startDate: v.string(),
    endDate: v.string(),
    kilowattHours: v.number(),
    meterReadings: v.optional(v.object({
      room: v.optional(v.number()),
      fan: v.optional(v.number()),
      main: v.optional(v.number()),
    })),
    calculationNotes: v.optional(v.string()),
    supportingImageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Only admins and managers can create billing periods
    if (user.role === "viewer") {
      throw new Error("Insufficient permissions");
    }

    // Validate dates
    const start = new Date(args.startDate);
    const end = new Date(args.endDate);
    if (start >= end) {
      throw new Error("End date must be after start date");
    }

    const periodId = await ctx.db.insert("tenantBillingPeriods", {
      propertyId: args.propertyId,
      tenantId: args.tenantId,
      startDate: args.startDate,
      endDate: args.endDate,
      kilowattHours: args.kilowattHours,
      meterReadings: args.meterReadings,
      calculationNotes: args.calculationNotes,
      supportingImageId: args.supportingImageId,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "create_tenant_billing_period",
      resourceType: "tenantBillingPeriods",
      resourceId: periodId,
      metadata: { propertyId: args.propertyId, tenantId: args.tenantId },
      timestamp: Date.now(),
    });

    return periodId;
  },
});

// Find utility bills that overlap with a date range
export const findOverlappingUtilityBills = query({
  args: {
    propertyId: v.id("properties"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get all utility bills for the property
    const bills = await ctx.db
      .query("utilityBills")
      .withIndex("by_property", (q: any) => q.eq("propertyId", args.propertyId))
      .collect();

    const periodStart = new Date(args.startDate);
    const periodEnd = new Date(args.endDate);

    // Filter bills that overlap with the period
    const overlappingBills = [];
    for (const bill of bills) {
      // Extract dates from bill data
      const billStartDate = bill.extractedData?.start_date ? new Date(bill.extractedData.start_date) : null;
      const billEndDate = bill.extractedData?.end_date ? new Date(bill.extractedData.end_date) : null;

      if (!billStartDate || !billEndDate) continue;

      // Check if there's any overlap
      if (billEndDate >= periodStart && billStartDate <= periodEnd) {
        // Calculate overlap details
        const overlapStart = new Date(Math.max(billStartDate.getTime(), periodStart.getTime()));
        const overlapEnd = new Date(Math.min(billEndDate.getTime(), periodEnd.getTime()));
        const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const billTotalDays = Math.ceil((billEndDate.getTime() - billStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        overlappingBills.push({
          ...bill,
          overlap: {
            overlapStart: overlapStart.toISOString().split('T')[0],
            overlapEnd: overlapEnd.toISOString().split('T')[0],
            overlapDays,
            billTotalDays,
            overlapPercentage: (overlapDays / billTotalDays) * 100,
          },
        });
      }
    }

    return overlappingBills;
  },
});

// Calculate pro-rata allocation for a tenant billing period
// Update supporting image for a billing period
export const updateSupportingImage = mutation({
  args: {
    billingPeriodId: v.id("tenantBillingPeriods"),
    supportingImageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Only admins and managers can update billing periods
    if (user.role === "viewer") {
      throw new Error("Insufficient permissions");
    }

    const period = await ctx.db.get(args.billingPeriodId);
    if (!period) {
      throw new Error("Billing period not found");
    }

    // Delete old image if exists
    if (period.supportingImageId) {
      await ctx.storage.delete(period.supportingImageId);
    }

    // Update the period with new image
    await ctx.db.patch(args.billingPeriodId, {
      supportingImageId: args.supportingImageId,
    });

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "update_billing_period_image",
      resourceType: "tenantBillingPeriods",
      resourceId: args.billingPeriodId,
      metadata: { imageId: args.supportingImageId },
      timestamp: Date.now(),
    });

    return args.billingPeriodId;
  },
});

// Delete supporting image for a billing period
export const deleteSupportingImage = mutation({
  args: {
    billingPeriodId: v.id("tenantBillingPeriods"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Only admins and managers can update billing periods
    if (user.role === "viewer") {
      throw new Error("Insufficient permissions");
    }

    const period = await ctx.db.get(args.billingPeriodId);
    if (!period) {
      throw new Error("Billing period not found");
    }

    // Delete image if exists
    if (period.supportingImageId) {
      await ctx.storage.delete(period.supportingImageId);
    }

    // Remove image reference
    await ctx.db.patch(args.billingPeriodId, {
      supportingImageId: undefined,
    });

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "delete_billing_period_image",
      resourceType: "tenantBillingPeriods",
      resourceId: args.billingPeriodId,
      timestamp: Date.now(),
    });

    return args.billingPeriodId;
  },
});

// Get supporting image URL
export const getSupportingImageUrl = query({
  args: {
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    if (!args.storageId) return null;
    
    try {
      const url = await ctx.storage.getUrl(args.storageId);
      return url;
    } catch (error) {
      console.error("Error getting image URL:", error);
      return null;
    }
  },
});

// Get multiple supporting image URLs in batch
export const getBatchSupportingImageUrls = query({
  args: {
    storageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const urls: string[] = [];
    
    for (const storageId of args.storageIds) {
      try {
        const url = await ctx.storage.getUrl(storageId);
        if (url) {
          urls.push(url);
        }
      } catch (error) {
        console.error("Error getting image URL for", storageId, error);
      }
    }
    
    return urls;
  },
});

export const calculateProRataAllocation = query({
  args: {
    tenantBillingPeriodId: v.id("tenantBillingPeriods"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const period = await ctx.db.get(args.tenantBillingPeriodId);
    if (!period) {
      throw new Error("Billing period not found");
    }

    // Find overlapping utility bills
    // Use the same logic as findOverlappingUtilityBills but inline to avoid circular dependency
    const bills = await ctx.db
      .query("utilityBills")
      .withIndex("by_property", (q: any) => q.eq("propertyId", period.propertyId))
      .collect();

    const periodStart = new Date(period.startDate);
    const periodEnd = new Date(period.endDate);

    const overlappingBills = [];
    for (const bill of bills) {
      const billStartDate = bill.extractedData?.start_date ? new Date(bill.extractedData.start_date) : null;
      const billEndDate = bill.extractedData?.end_date ? new Date(bill.extractedData.end_date) : null;

      if (!billStartDate || !billEndDate) continue;

      if (billEndDate >= periodStart && billStartDate <= periodEnd) {
        const overlapStart = new Date(Math.max(billStartDate.getTime(), periodStart.getTime()));
        const overlapEnd = new Date(Math.min(billEndDate.getTime(), periodEnd.getTime()));
        const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const billTotalDays = Math.ceil((billEndDate.getTime() - billStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        overlappingBills.push({
          ...bill,
          overlap: {
            overlapStart: overlapStart.toISOString().split('T')[0],
            overlapEnd: overlapEnd.toISOString().split('T')[0],
            overlapDays,
            billTotalDays,
            overlapPercentage: (overlapDays / billTotalDays) * 100,
          },
        });
      }
    }

    // Calculate total property usage for the period (sum of all overlapping bills weighted by overlap)
    let totalPropertyKwh = 0;
    const billAllocations = [];

    for (const bill of overlappingBills) {
      if (!bill.extractedData?.kilowatt_hours) continue;
      
      const overlapRatio = bill.overlap.overlapDays / bill.overlap.billTotalDays;
      const allocatedKwh = bill.extractedData.kilowatt_hours * overlapRatio;
      totalPropertyKwh += allocatedKwh;

      // Calculate daily rates for taxes and fees
      const dailyRates = {
        stateSalesTax: (bill.extractedData.state_sales_tax || 0) / bill.overlap.billTotalDays,
        grossReceiptTax: (bill.extractedData.gross_receipt_tax || 0) / bill.overlap.billTotalDays,
        adjustment: (bill.extractedData.adjustment || 0) / bill.overlap.billTotalDays,
        deliveryCharges: (bill.extractedData.delivery_charges || 0) / bill.overlap.billTotalDays,
      };

      // Allocate costs based on overlap days
      const allocatedCosts = {
        stateSalesTax: dailyRates.stateSalesTax * bill.overlap.overlapDays,
        grossReceiptTax: dailyRates.grossReceiptTax * bill.overlap.overlapDays,
        adjustment: dailyRates.adjustment * bill.overlap.overlapDays,
        deliveryCharges: dailyRates.deliveryCharges * bill.overlap.overlapDays,
      };

      billAllocations.push({
        billId: bill._id,
        billPeriod: `${bill.extractedData.start_date || 'N/A'} to ${bill.extractedData.end_date || 'N/A'}`,
        overlap: bill.overlap,
        dailyRates,
        allocatedCosts,
        electricRate: bill.extractedData.cost_per_kilowatt_hour || 0,
      });
    }

    // Calculate tenant's contribution ratio
    const tenantRatio = totalPropertyKwh > 0 ? period.kilowattHours / totalPropertyKwh : 0;

    // Calculate tenant's share of costs
    const tenantCosts = {
      stateSalesTax: 0,
      grossReceiptTax: 0,
      adjustment: 0,
      deliveryCharges: 0,
    };

    // Calculate weighted average electric rate
    let weightedRateSum = 0;
    let weightSum = 0;

    for (const allocation of billAllocations) {
      // Add tenant's share of this bill's allocated costs
      tenantCosts.stateSalesTax += allocation.allocatedCosts.stateSalesTax * tenantRatio;
      tenantCosts.grossReceiptTax += allocation.allocatedCosts.grossReceiptTax * tenantRatio;
      tenantCosts.adjustment += allocation.allocatedCosts.adjustment * tenantRatio;
      tenantCosts.deliveryCharges += allocation.allocatedCosts.deliveryCharges * tenantRatio;

      // Weight electric rate by overlap days
      weightedRateSum += allocation.electricRate * allocation.overlap.overlapDays;
      weightSum += allocation.overlap.overlapDays;
    }

    const avgElectricRate = weightSum > 0 ? weightedRateSum / weightSum : 0;
    const directCost = period.kilowattHours * avgElectricRate;
    const totalCost = directCost + 
      tenantCosts.stateSalesTax + 
      tenantCosts.grossReceiptTax + 
      tenantCosts.adjustment + 
      tenantCosts.deliveryCharges;

    return {
      period,
      totalPropertyKwh,
      tenantRatio,
      avgElectricRate,
      directCost,
      allocatedCosts: tenantCosts,
      totalCost,
      billAllocations,
    };
  },
});

