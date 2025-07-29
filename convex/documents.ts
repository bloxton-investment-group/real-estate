import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Get utility bills for a property
export const getUtilityBills = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const bills = await ctx.db
      .query("utilityBills")
      .withIndex("by_property", (q: any) => q.eq("propertyId", args.propertyId))
      .order("desc")
      .collect();

    return bills;
  },
});

// Get a single utility bill by ID (for viewing PDF)
export const getUtilityBill = query({
  args: { billId: v.id("utilityBills") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const bill = await ctx.db.get(args.billId);
    if (!bill) {
      throw new Error("Utility bill not found");
    }

    return bill;
  },
});

// Get meter readings for a property
export const getMeterReadings = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const readings = await ctx.db
      .query("meterReadings")
      .withIndex("by_property", (q: any) => q.eq("propertyId", args.propertyId))
      .order("desc")
      .collect();

    return readings;
  },
});

// Create a new utility bill (legacy format)
export const createUtilityBill = mutation({
  args: {
    propertyId: v.id("properties"),
    billPdfUrl: v.string(),
    extractedData: v.optional(v.object({
      kilowatt_hours: v.optional(v.number()),
      state_sales_tax: v.optional(v.number()),
      gross_receipt_tax: v.optional(v.number()),
      adjustment: v.optional(v.number()),
      cost_per_kilowatt_hour: v.optional(v.number()),
      delivery_charges: v.optional(v.number()),
      account_number: v.optional(v.string()),
      meter_number: v.optional(v.string()),
      start_date: v.optional(v.string()),
      end_date: v.optional(v.string()),
      due_date: v.optional(v.string()),
      bill_date: v.optional(v.string()),
    })),
    // New area-based extraction support
    extractionAreas: v.optional(v.array(v.object({
      id: v.string(),
      fieldName: v.string(),
      fieldType: v.union(v.literal("text"), v.literal("number"), v.literal("currency"), v.literal("date")),
      x: v.number(),
      y: v.number(),
      width: v.number(),
      height: v.number(),
      pageNumber: v.number(),
    }))),
    extractedValues: v.optional(v.array(v.object({
      fieldName: v.string(),
      value: v.string(),
      confidence: v.number(),
      areaId: v.string(),
    }))),
    // Page management and redaction support
    pageInfo: v.optional(v.array(v.object({
      pageNumber: v.number(),
      keep: v.boolean(),
      redactionAreas: v.array(v.object({
        id: v.string(),
        fieldName: v.string(),
        fieldType: v.union(v.literal("text"), v.literal("number"), v.literal("currency"), v.literal("date")),
        x: v.number(),
        y: v.number(),
        width: v.number(),
        height: v.number(),
        pageNumber: v.number(),
        color: v.optional(v.string()),
      })),
    }))),
    billNotes: v.optional(v.string()),
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

    // Only admins and managers can upload utility bills
    if (user.role === "viewer") {
      throw new Error("Insufficient permissions to upload utility bills");
    }

    const billId = await ctx.db.insert("utilityBills", {
      propertyId: args.propertyId,
      billPdfUrl: args.billPdfUrl,
      extractedData: args.extractedData,
      extractionAreas: args.extractionAreas,
      extractedValues: args.extractedValues,
      pageInfo: args.pageInfo,
      billNotes: args.billNotes,
      uploadedBy: user._id,
      createdAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "upload_utility_bill",
      resourceType: "utilityBills",
      resourceId: billId,
      metadata: { propertyId: args.propertyId },
      timestamp: Date.now(),
    });

    return billId;
  },
});

// Create a new meter reading
export const createMeterReading = mutation({
  args: {
    propertyId: v.id("properties"),
    tenantId: v.id("tenants"),
    imageUrl: v.string(),
    extractedValue: v.number(),
    adjustedValue: v.number(),
    readingDate: v.number(),
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

    // Only admins and managers can create meter readings
    if (user.role === "viewer") {
      throw new Error("Insufficient permissions to create meter readings");
    }

    const readingId = await ctx.db.insert("meterReadings", {
      propertyId: args.propertyId,
      tenantId: args.tenantId,
      imageUrl: args.imageUrl,
      extractedValue: args.extractedValue,
      adjustedValue: args.adjustedValue,
      readingDate: args.readingDate,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "create_meter_reading",
      resourceType: "meterReadings",
      resourceId: readingId,
      metadata: { propertyId: args.propertyId, tenantId: args.tenantId },
      timestamp: Date.now(),
    });

    return readingId;
  },
});

// Get all documents for a property (bills and readings combined)
export const getPropertyDocuments = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get utility bills
    const bills = await ctx.db
      .query("utilityBills")
      .withIndex("by_property", (q: any) => q.eq("propertyId", args.propertyId))
      .collect();

    // Get meter readings
    const readings = await ctx.db
      .query("meterReadings")
      .withIndex("by_property", (q: any) => q.eq("propertyId", args.propertyId))
      .collect();

    // Combine and sort by date
    const documents = [
      ...bills.map(bill => ({
        ...bill,
        type: "utility_bill" as const,
        date: bill.createdAt, // Use creation date since billDate was removed
      })),
      ...readings.map(reading => ({
        ...reading,
        type: "meter_reading" as const,
        date: reading.readingDate,
      })),
    ].sort((a, b) => {
      const dateA = a.date || 0;
      const dateB = b.date || 0;
      return dateB - dateA;
    });

    return documents;
  },
});

// Get redaction regions for a utility bill
export const getRedactionRegions = query({
  args: { utilityBillId: v.id("utilityBills") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const regions = await ctx.db
      .query("redactionRegions")
      .withIndex("by_bill", (q: any) => q.eq("utilityBillId", args.utilityBillId))
      .filter((q: any) => q.eq(q.field("isActive"), true))
      .collect();

    return regions;
  },
});

// Create redaction region
export const createRedactionRegion = mutation({
  args: {
    utilityBillId: v.id("utilityBills"),
    region: v.object({
      x: v.number(),
      y: v.number(),
      width: v.number(),
      height: v.number(),
      page: v.number(),
    }),
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

    // Only admins and managers can create redaction regions
    if (user.role === "viewer") {
      throw new Error("Insufficient permissions to create redaction regions");
    }

    const regionId = await ctx.db.insert("redactionRegions", {
      utilityBillId: args.utilityBillId,
      region: args.region,
      createdBy: user._id,
      createdAt: Date.now(),
      isActive: true,
    });

    return regionId;
  },
});

// Get extraction templates by document type
export const getExtractionTemplates = query({
  args: { documentType: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const templates = await ctx.db
      .query("extractionTemplates")
      .withIndex("by_type", (q: any) => q.eq("documentType", args.documentType))
      .filter((q: any) => q.eq(q.field("isActive"), true))
      .collect();

    return templates;
  },
});

// Create extraction template
export const createExtractionTemplate = mutation({
  args: {
    name: v.string(),
    documentType: v.string(),
    areas: v.array(v.object({
      id: v.string(),
      fieldName: v.string(),
      fieldType: v.union(v.literal("text"), v.literal("number"), v.literal("currency"), v.literal("date")),
      x: v.number(),
      y: v.number(),
      width: v.number(),
      height: v.number(),
      pageNumber: v.number(),
    })),
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

    // Only admins and managers can create templates
    if (user.role === "viewer") {
      throw new Error("Insufficient permissions to create extraction templates");
    }

    const templateId = await ctx.db.insert("extractionTemplates", {
      name: args.name,
      documentType: args.documentType,
      areas: args.areas,
      createdBy: user._id,
      createdAt: Date.now(),
      isActive: true,
    });

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "create_extraction_template",
      resourceType: "extractionTemplates",
      resourceId: templateId,
      metadata: { documentType: args.documentType },
      timestamp: Date.now(),
    });

    return templateId;
  },
});

// Update utility bill with redacted PDF URL (called by PDF processing action)
export const updateUtilityBillRedactedUrl = mutation({
  args: {
    billId: v.id("utilityBills"),
    summaryPageUrl: v.optional(v.string()),
    processingStats: v.optional(v.object({
      originalPages: v.number(),
      finalPages: v.number(),
      removedPages: v.number(),
      redactionCount: v.number(),
    })),
    processingError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const bill = await ctx.db.get(args.billId);
    if (!bill) {
      throw new Error("Utility bill not found");
    }

    // Update the bill with redacted PDF URL
    await ctx.db.patch(args.billId, {
      summaryPageUrl: args.summaryPageUrl || undefined,
    });

    // Get current user for logging
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .first();

    if (user) {
      // Log the PDF processing result
      await ctx.db.insert("auditLogs", {
        userId: user._id,
        action: args.summaryPageUrl ? "pdf_processing_success" : "pdf_processing_error",
        resourceType: "utilityBills",
        resourceId: args.billId,
        metadata: {
          processingStats: args.processingStats,
          processingError: args.processingError,
        },
        timestamp: Date.now(),
      });
    }

    return { success: true };
  },
});

// Update utility bill page info (for re-editing)
export const updateUtilityBillPageInfo = mutation({
  args: {
    billId: v.id("utilityBills"),
    pageInfo: v.array(v.object({
      pageNumber: v.number(),
      keep: v.boolean(),
      redactionAreas: v.array(v.object({
        id: v.string(),
        fieldName: v.string(),
        fieldType: v.union(v.literal("text"), v.literal("number"), v.literal("currency"), v.literal("date")),
        x: v.number(),
        y: v.number(),
        width: v.number(),
        height: v.number(),
        pageNumber: v.number(),
        color: v.optional(v.string()),
      })),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const bill = await ctx.db.get(args.billId);
    if (!bill) {
      throw new Error("Utility bill not found");
    }

    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Only admins and managers can edit bills
    if (user.role === "viewer") {
      throw new Error("Insufficient permissions to edit utility bills");
    }

    // Update the bill's page info
    await ctx.db.patch(args.billId, {
      pageInfo: args.pageInfo,
    });

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "update_bill_pages",
      resourceType: "utilityBills",
      resourceId: args.billId,
      metadata: {
        pagesKept: args.pageInfo.filter(p => p.keep).length,
        totalPages: args.pageInfo.length,
        redactionCount: args.pageInfo.reduce((sum, p) => sum + p.redactionAreas.length, 0),
      },
      timestamp: Date.now(),
    });

    return { success: true };
  },
});