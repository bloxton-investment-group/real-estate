import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users synced from Clerk
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("viewer")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // Properties (addresses)
  properties: defineTable({
    address: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active", ["active"]),

  // Tenants
  tenants: defineTable({
    propertyId: v.id("properties"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    unitNumber: v.optional(v.string()),
    billingInstructions: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_property", ["propertyId"])
    .index("by_active", ["active"]),

  // User access control
  userAccess: defineTable({
    userId: v.id("users"),
    resourceType: v.union(v.literal("property"), v.literal("feature")),
    resourceId: v.optional(v.id("properties")), // Only for property access
    feature: v.optional(v.string()), // e.g., "create_invoice", "view_reports"
    permission: v.union(v.literal("read"), v.literal("write"), v.literal("admin")),
    grantedBy: v.id("users"),
    grantedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_resource", ["resourceType", "resourceId"]),

  // Invoice templates/versions
  invoiceTemplates: defineTable({
    name: v.string(),
    type: v.union(v.literal("basic_meter"), v.literal("advanced_utility")),
    version: v.number(),
    isActive: v.boolean(),
    template: v.object({
      // Template-specific configuration
      fields: v.array(v.string()),
      calculations: v.optional(v.any()),
    }),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_active", ["isActive"]),

  // Meter readings
  meterReadings: defineTable({
    propertyId: v.id("properties"),
    tenantId: v.id("tenants"),
    imageUrl: v.string(),
    extractedValue: v.number(),
    adjustedValue: v.number(), // After multiplication by 16
    readingDate: v.number(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_property", ["propertyId"])
    .index("by_tenant", ["tenantId"])
    .index("by_date", ["readingDate"]),

  // Utility bills
  utilityBills: defineTable({
    propertyId: v.id("properties"),
    billPdfUrl: v.string(),
    summaryPageUrl: v.optional(v.string()), // Redacted version
    extractedData: v.optional(v.object({
      kilowatt_hours: v.optional(v.number()),
      state_sales_tax: v.optional(v.number()),
      gross_receipt_tax: v.optional(v.number()),
      adjustment: v.optional(v.number()),
      cost_per_kilowatt_hour: v.optional(v.number()),
      delivery_charges: v.optional(v.number()),
      account_number: v.optional(v.union(v.string(), v.number())),
      meter_number: v.optional(v.union(v.string(), v.number())),
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
        color: v.optional(v.string()), // Hex color for redaction (e.g., "#FFFFFF", "#000000")
      })),
    }))),
    // Bill-specific notes (separate from invoice notes)
    billNotes: v.optional(v.string()),
    // Legacy field for compatibility (to be removed after migration)
    invoiceNotes: v.optional(v.string()),
    uploadedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_property", ["propertyId"])
    .index("by_created", ["createdAt"]),

  // Extraction templates for documents
  extractionTemplates: defineTable({
    name: v.string(),
    documentType: v.string(), // e.g., "utility_bill", "lease_agreement"
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
    createdBy: v.id("users"),
    createdAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_type", ["documentType"])
    .index("by_active", ["isActive"]),

  // Redaction regions
  redactionRegions: defineTable({
    utilityBillId: v.id("utilityBills"),
    region: v.object({
      x: v.number(),
      y: v.number(),
      width: v.number(),
      height: v.number(),
      page: v.number(),
    }),
    createdBy: v.id("users"),
    createdAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_bill", ["utilityBillId"])
    .index("by_active", ["isActive"]),

  // Invoices
  invoices: defineTable({
    propertyId: v.id("properties"),
    tenantId: v.id("tenants"),
    templateId: v.id("invoiceTemplates"),
    invoiceNumber: v.string(),
    type: v.union(v.literal("basic_meter"), v.literal("advanced_utility")),
    status: v.union(v.literal("draft"), v.literal("sent"), v.literal("paid")),
    
    // Date range
    startDate: v.number(),
    endDate: v.number(),
    
    // Basic meter invoice data
    meterReadingId: v.optional(v.id("meterReadings")),
    previousMeterReadingId: v.optional(v.id("meterReadings")),
    kwhUsed: v.optional(v.number()),
    rate: v.optional(v.number()),
    
    // Advanced utility invoice data
    utilityBillId: v.optional(v.id("utilityBills")),
    
    // Calculated amounts
    subtotal: v.number(),
    tax: v.optional(v.number()),
    total: v.number(),
    
    // Metadata
    notes: v.optional(v.string()),
    pdfUrl: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_property", ["propertyId"])
    .index("by_tenant", ["tenantId"])
    .index("by_status", ["status"])
    .index("by_number", ["invoiceNumber"])
    .index("by_date_range", ["startDate", "endDate"]),

  // Tenant billing periods (monthly usage tracking)
  tenantBillingPeriods: defineTable({
    propertyId: v.id("properties"),
    tenantId: v.id("tenants"),
    startDate: v.string(), // ISO date YYYY-MM-DD
    endDate: v.string(), // ISO date YYYY-MM-DD
    kilowattHours: v.number(), // Tenant's usage for the period
    
    // Optional meter readings for documentation
    meterReadings: v.optional(v.object({
      room: v.optional(v.number()),
      fan: v.optional(v.number()),
      main: v.optional(v.number()),
    })),
    
    // Supporting image (e.g., meter reading photo)
    supportingImageId: v.optional(v.id("_storage")),
    
    calculationNotes: v.optional(v.string()), // e.g., "Room: 2456 - Fan: 1089 = 1367 kWh"
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_property", ["propertyId"])
    .index("by_tenant", ["tenantId"])
    .index("by_dates", ["startDate", "endDate"]),

  // Tenant invoices with pro-rata calculations
  tenantInvoices: defineTable({
    propertyId: v.id("properties"),
    tenantId: v.id("tenants"),
    billingPeriodIds: v.array(v.id("tenantBillingPeriods")), // Can span multiple periods
    
    // Invoice details
    invoiceNumber: v.string(),
    invoiceDate: v.string(), // ISO date
    dueDate: v.optional(v.string()), // ISO date
    
    // Calculation method and results
    calculationMethod: v.union(v.literal("basic"), v.literal("pro_rata")),
    totalKilowattHours: v.number(),
    electricRate: v.number(), // Average rate if multiple bills
    
    // Cost breakdown
    directCost: v.number(), // kWh × rate
    allocatedCosts: v.object({
      stateSalesTax: v.number(),
      grossReceiptTax: v.number(),
      adjustment: v.number(),
      deliveryCharges: v.number(),
    }),
    totalAmount: v.number(),
    
    // Overlapping utility bills used in calculation
    utilityBillAllocations: v.array(v.object({
      utilityBillId: v.id("utilityBills"),
      overlapDays: v.number(),
      totalDays: v.number(),
      allocationPercentage: v.number(), // How much of this bill applies
      allocatedAmounts: v.object({
        stateSalesTax: v.number(),
        grossReceiptTax: v.number(),
        adjustment: v.number(),
        deliveryCharges: v.number(),
      }),
    })),
    
    // Documentation
    calculationBreakdown: v.string(), // Detailed explanation
    customNotes: v.optional(v.string()), // Additional notes
    attachmentUrls: v.array(v.string()), // Redacted PDFs
    
    // Status
    status: v.union(v.literal("draft"), v.literal("sent"), v.literal("paid")),
    
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_property", ["propertyId"])
    .index("by_tenant", ["tenantId"])
    .index("by_invoice_number", ["invoiceNumber"])
    .index("by_status", ["status"]),

  // Audit log
  auditLogs: defineTable({
    userId: v.id("users"),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_resource", ["resourceType", "resourceId"])
    .index("by_timestamp", ["timestamp"]),
});