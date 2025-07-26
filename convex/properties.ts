import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Get all properties (with optional filtering)
export const getProperties = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    let properties;
    
    if (args.activeOnly) {
      properties = await ctx.db
        .query("properties")
        .withIndex("by_active", (q: any) => q.eq("active", true))
        .order("desc")
        .collect();
    } else {
      properties = await ctx.db
        .query("properties")
        .order("desc")
        .collect();
    }
    return properties;
  },
});

// Get a single property by ID
export const getProperty = query({
  args: { id: v.id("properties") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const property = await ctx.db.get(args.id);
    if (!property) {
      throw new Error("Property not found");
    }

    return property;
  },
});

// Create a new property
export const createProperty = mutation({
  args: {
    address: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user to check permissions
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Only admins and managers can create properties
    if (user.role === "viewer") {
      throw new Error("Insufficient permissions to create properties");
    }

    const now = Date.now();
    const propertyId = await ctx.db.insert("properties", {
      address: args.address.trim(),
      name: args.name.trim(),
      description: args.description?.trim(),
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "create_property",
      resourceType: "properties",
      resourceId: propertyId,
      metadata: { address: args.address, name: args.name },
      timestamp: now,
    });

    return propertyId;
  },
});

// Update an existing property
export const updateProperty = mutation({
  args: {
    id: v.id("properties"),
    address: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user to check permissions
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Only admins and managers can update properties
    if (user.role === "viewer") {
      throw new Error("Insufficient permissions to update properties");
    }

    const existingProperty = await ctx.db.get(args.id);
    if (!existingProperty) {
      throw new Error("Property not found");
    }

    // Build update object with only provided fields
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.address !== undefined) {
      updates.address = args.address.trim();
    }
    if (args.name !== undefined) {
      updates.name = args.name.trim();
    }
    if (args.description !== undefined) {
      updates.description = args.description?.trim();
    }
    if (args.active !== undefined) {
      updates.active = args.active;
    }

    await ctx.db.patch(args.id, updates);

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "update_property",
      resourceType: "properties",
      resourceId: args.id,
      metadata: { changes: updates },
      timestamp: Date.now(),
    });

    return args.id;
  },
});

// Delete a property (soft delete by setting active to false)
export const deleteProperty = mutation({
  args: { id: v.id("properties") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user to check permissions
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Only admins can delete properties
    if (user.role !== "admin") {
      throw new Error("Only admins can delete properties");
    }

    const existingProperty = await ctx.db.get(args.id);
    if (!existingProperty) {
      throw new Error("Property not found");
    }

    await ctx.db.patch(args.id, {
      active: false,
      updatedAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "delete_property",
      resourceType: "properties",
      resourceId: args.id,
      metadata: { address: existingProperty.address },
      timestamp: Date.now(),
    });

    return args.id;
  },
});

// Get tenants for a specific property
export const getPropertyTenants = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const tenants = await ctx.db
      .query("tenants")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .order("desc")
      .collect();

    return tenants;
  },
});