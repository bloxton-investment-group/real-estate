import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Generate a tenant invoice from billing periods
export const generateTenantInvoice = mutation({
  args: {
    propertyId: v.id("properties"),
    tenantId: v.id("tenants"),
    billingPeriodIds: v.array(v.id("tenantBillingPeriods")),
    dueDate: v.optional(v.string()),
    customNotes: v.optional(v.string()),
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

    // Only admins and managers can generate invoices
    if (user.role === "viewer") {
      throw new Error("Insufficient permissions");
    }

    // Get tenant and property information
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const property = await ctx.db.get(args.propertyId);
    if (!property) {
      throw new Error("Property not found");
    }

    // Get billing periods
    const billingPeriods = await Promise.all(
      args.billingPeriodIds.map(id => ctx.db.get(id))
    );

    const validPeriods = billingPeriods.filter(Boolean);
    if (validPeriods.length === 0) {
      throw new Error("No valid billing periods found");
    }

    // Calculate total kilowatt hours
    const totalKilowattHours = validPeriods.reduce((sum, period) => sum + (period?.kilowattHours || 0), 0);

    // Find the earliest start date and latest end date
    const startDates = validPeriods.map(p => new Date(p!.startDate));
    const endDates = validPeriods.map(p => new Date(p!.endDate));
    const earliestStart = new Date(Math.min(...startDates.map(d => d.getTime())));
    const latestEnd = new Date(Math.max(...endDates.map(d => d.getTime())));

    // Find all overlapping utility bills for the period
    const allBills = await ctx.db
      .query("utilityBills")
      .withIndex("by_property", (q: any) => q.eq("propertyId", args.propertyId))
      .collect();

    // Calculate overlapping bills and allocations
    const utilityBillAllocations = [];
    let totalPropertyKwh = 0;
    let weightedRateSum = 0;
    let weightSum = 0;
    
    const allocatedCosts = {
      stateSalesTax: 0,
      grossReceiptTax: 0,
      adjustment: 0,
      deliveryCharges: 0,
    };

    for (const bill of allBills) {
      if (!bill.extractedData?.start_date || !bill.extractedData?.end_date) continue;

      const billStart = new Date(bill.extractedData.start_date);
      const billEnd = new Date(bill.extractedData.end_date);

      // Check for overlap
      if (billEnd >= earliestStart && billStart <= latestEnd) {
        const overlapStart = new Date(Math.max(billStart.getTime(), earliestStart.getTime()));
        const overlapEnd = new Date(Math.min(billEnd.getTime(), latestEnd.getTime()));
        const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const billTotalDays = Math.ceil((billEnd.getTime() - billStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const allocationPercentage = overlapDays / billTotalDays;

        // Add to total property kWh
        const allocatedKwh = (bill.extractedData.kilowatt_hours || 0) * allocationPercentage;
        totalPropertyKwh += allocatedKwh;

        // Calculate allocated amounts for this bill
        const billAllocatedAmounts = {
          stateSalesTax: (bill.extractedData.state_sales_tax || 0) * allocationPercentage,
          grossReceiptTax: (bill.extractedData.gross_receipt_tax || 0) * allocationPercentage,
          adjustment: (bill.extractedData.adjustment || 0) * allocationPercentage,
          deliveryCharges: (bill.extractedData.delivery_charges || 0) * allocationPercentage,
        };

        // Weight electric rate by overlap days
        if (bill.extractedData.cost_per_kilowatt_hour) {
          weightedRateSum += bill.extractedData.cost_per_kilowatt_hour * overlapDays;
          weightSum += overlapDays;
        }

        utilityBillAllocations.push({
          utilityBillId: bill._id,
          overlapDays,
          totalDays: billTotalDays,
          allocationPercentage,
          allocatedAmounts: billAllocatedAmounts,
        });
      }
    }

    // Calculate tenant's ratio and costs
    const tenantRatio = totalPropertyKwh > 0 ? totalKilowattHours / totalPropertyKwh : 0;
    const avgElectricRate = weightSum > 0 ? weightedRateSum / weightSum : 0.1479; // Default rate
    const directCost = totalKilowattHours * avgElectricRate;

    // Calculate tenant's share of allocated costs
    for (const allocation of utilityBillAllocations) {
      allocatedCosts.stateSalesTax += allocation.allocatedAmounts.stateSalesTax * tenantRatio;
      allocatedCosts.grossReceiptTax += allocation.allocatedAmounts.grossReceiptTax * tenantRatio;
      allocatedCosts.adjustment += allocation.allocatedAmounts.adjustment * tenantRatio;
      allocatedCosts.deliveryCharges += allocation.allocatedAmounts.deliveryCharges * tenantRatio;
    }

    const totalAmount = directCost + 
      allocatedCosts.stateSalesTax + 
      allocatedCosts.grossReceiptTax + 
      allocatedCosts.adjustment + 
      allocatedCosts.deliveryCharges;

    // Generate invoice number
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
    const invoiceNumber = `INV-${year}${month}-${timestamp}`;

    // Create calculation breakdown
    const calculationBreakdown = `
Billing Period: ${earliestStart.toISOString().split('T')[0]} to ${latestEnd.toISOString().split('T')[0]}
Tenant Usage: ${totalKilowattHours.toLocaleString()} kWh
Property Total: ${totalPropertyKwh.toFixed(0)} kWh
Tenant Ratio: ${(tenantRatio * 100).toFixed(2)}%
Average Rate: $${avgElectricRate.toFixed(4)}/kWh
Direct Cost: $${directCost.toFixed(2)}
Overlapping Bills: ${utilityBillAllocations.length}
`;

    // Create the invoice
    const invoiceId = await ctx.db.insert("tenantInvoices", {
      propertyId: args.propertyId,
      tenantId: args.tenantId,
      billingPeriodIds: args.billingPeriodIds,
      invoiceNumber,
      invoiceDate: new Date().toISOString(),
      dueDate: args.dueDate,
      calculationMethod: "pro_rata",
      totalKilowattHours,
      electricRate: avgElectricRate,
      directCost,
      allocatedCosts,
      totalAmount,
      utilityBillAllocations,
      calculationBreakdown,
      customNotes: args.customNotes,
      attachmentUrls: [],
      status: "draft",
      createdBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "generate_tenant_invoice",
      resourceType: "tenantInvoices",
      resourceId: invoiceId,
      metadata: { 
        propertyId: args.propertyId, 
        tenantId: args.tenantId,
        totalAmount,
        billingPeriodCount: args.billingPeriodIds.length,
      },
      timestamp: Date.now(),
    });

    return {
      invoiceId,
      invoiceNumber,
      totalAmount,
    };
  },
});

// Update invoice with PDF URL
export const updateInvoicePdfUrl = mutation({
  args: {
    invoiceId: v.id("tenantInvoices"),
    pdfUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Add PDF URL to attachments
    const updatedAttachments = [...invoice.attachmentUrls, args.pdfUrl];

    await ctx.db.patch(args.invoiceId, {
      attachmentUrls: updatedAttachments,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get tenant invoice by ID
export const getTenantInvoice = mutation({
  args: {
    invoiceId: v.id("tenantInvoices"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Get related data
    const tenant = await ctx.db.get(invoice.tenantId);
    const property = await ctx.db.get(invoice.propertyId);
    const billingPeriods = await Promise.all(
      invoice.billingPeriodIds.map(id => ctx.db.get(id))
    );

    return {
      invoice,
      tenant,
      property,
      billingPeriods: billingPeriods.filter(Boolean),
    };
  },
});

// Mark invoice as sent
export const markInvoiceAsSent = mutation({
  args: {
    invoiceId: v.id("tenantInvoices"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    await ctx.db.patch(args.invoiceId, {
      status: "sent",
      updatedAt: Date.now(),
    });

    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .first();

    if (user) {
      // Log the action
      await ctx.db.insert("auditLogs", {
        userId: user._id,
        action: "mark_invoice_sent",
        resourceType: "tenantInvoices",
        resourceId: args.invoiceId,
        metadata: { invoiceNumber: invoice.invoiceNumber },
        timestamp: Date.now(),
      });
    }

    return { success: true };
  },
});