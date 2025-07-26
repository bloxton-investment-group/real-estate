import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get tenants for a property
export const getTenantsByProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const tenants = await ctx.db
      .query("tenants")
      .withIndex("by_property", (q: any) => q.eq("propertyId", args.propertyId))
      .filter((q: any) => q.eq(q.field("active"), true))
      .collect();

    return tenants;
  },
});

// Get all tenants
export const getAllTenants = query({
  args: {},
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const tenants = await ctx.db
      .query("tenants")
      .filter((q: any) => q.eq(q.field("active"), true))
      .collect();

    return tenants;
  },
});

// Create a new tenant
export const createTenant = mutation({
  args: {
    propertyId: v.id("properties"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    unitNumber: v.optional(v.string()),
    billingInstructions: v.optional(v.string()),
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

    // Only admins and managers can create tenants
    if (user.role === "viewer") {
      throw new Error("Insufficient permissions to create tenants");
    }

    const tenantId = await ctx.db.insert("tenants", {
      propertyId: args.propertyId,
      name: args.name,
      email: args.email,
      phone: args.phone,
      unitNumber: args.unitNumber,
      billingInstructions: args.billingInstructions,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "create_tenant",
      resourceType: "tenants",
      resourceId: tenantId,
      metadata: { propertyId: args.propertyId },
      timestamp: Date.now(),
    });

    return tenantId;
  },
});

// Update tenant
export const updateTenant = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    unitNumber: v.optional(v.string()),
    billingInstructions: v.optional(v.string()),
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

    // Only admins and managers can update tenants
    if (user.role === "viewer") {
      throw new Error("Insufficient permissions to update tenants");
    }

    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updateData.name = args.name;
    if (args.email !== undefined) updateData.email = args.email;
    if (args.phone !== undefined) updateData.phone = args.phone;
    if (args.unitNumber !== undefined) updateData.unitNumber = args.unitNumber;
    if (args.billingInstructions !== undefined) updateData.billingInstructions = args.billingInstructions;

    await ctx.db.patch(args.tenantId, updateData);

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "update_tenant",
      resourceType: "tenants",
      resourceId: args.tenantId,
      metadata: { propertyId: tenant.propertyId },
      timestamp: Date.now(),
    });

    return args.tenantId;
  },
});

// Deactivate tenant
export const deactivateTenant = mutation({
  args: {
    tenantId: v.id("tenants"),
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

    // Only admins and managers can deactivate tenants
    if (user.role === "viewer") {
      throw new Error("Insufficient permissions to deactivate tenants");
    }

    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    await ctx.db.patch(args.tenantId, {
      active: false,
      updatedAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "deactivate_tenant",
      resourceType: "tenants",
      resourceId: args.tenantId,
      metadata: { propertyId: tenant.propertyId },
      timestamp: Date.now(),
    });

    return args.tenantId;
  },
});