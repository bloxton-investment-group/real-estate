import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import type { FilterExpression } from "convex/server";

// Check if user has permission for a specific resource
export const checkPermission = query({
  args: {
    resourceType: v.union(v.literal("property"), v.literal("feature")),
    resourceId: v.optional(v.id("properties")),
    feature: v.optional(v.string()),
    permission: v.union(v.literal("read"), v.literal("write"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return false;

    // Admins have all permissions
    if (user.role === "admin") return true;

    // Check specific permissions
    const userAccess = await ctx.db
      .query("userAccess")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => {
        const typeMatch = q.eq(q.field("resourceType"), args.resourceType);
        
        if (args.resourceType === "property" && args.resourceId) {
          return q.and(
            typeMatch,
            q.eq(q.field("resourceId"), args.resourceId)
          );
        } else if (args.resourceType === "feature" && args.feature) {
          return q.and(
            typeMatch,
            q.eq(q.field("feature"), args.feature)
          );
        }
        
        return typeMatch;
      })
      .collect();

    // Check if any permission matches or is higher
    const permissionLevels = { read: 1, write: 2, admin: 3 };
    const requiredLevel = permissionLevels[args.permission];

    return userAccess.some(
      (access) => permissionLevels[access.permission] >= requiredLevel
    );
  },
});

// Grant permission to a user
export const grantPermission = mutation({
  args: {
    userId: v.id("users"),
    resourceType: v.union(v.literal("property"), v.literal("feature")),
    resourceId: v.optional(v.id("properties")),
    feature: v.optional(v.string()),
    permission: v.union(v.literal("read"), v.literal("write"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) throw new Error("User not found");

    // Check if current user can grant permissions
    const canGrant = await checkIfCanGrantPermission(
      ctx,
      currentUser,
      args.resourceType,
      args.resourceId,
      args.feature
    );

    if (!canGrant) {
      throw new Error("You don't have permission to grant access to this resource");
    }

    // Check if permission already exists
    const existingAccess = await ctx.db
      .query("userAccess")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => {
        const typeMatch = q.eq(q.field("resourceType"), args.resourceType);
        
        if (args.resourceType === "property" && args.resourceId) {
          return q.and(
            typeMatch,
            q.eq(q.field("resourceId"), args.resourceId)
          );
        } else if (args.resourceType === "feature" && args.feature) {
          return q.and(
            typeMatch,
            q.eq(q.field("feature"), args.feature)
          );
        }
        
        return typeMatch;
      })
      .first();

    if (existingAccess) {
      // Update existing permission
      await ctx.db.patch(existingAccess._id, {
        permission: args.permission,
        grantedBy: currentUser._id,
        grantedAt: Date.now(),
      });
    } else {
      // Create new permission
      await ctx.db.insert("userAccess", {
        userId: args.userId,
        resourceType: args.resourceType,
        resourceId: args.resourceId,
        feature: args.feature,
        permission: args.permission,
        grantedBy: currentUser._id,
        grantedAt: Date.now(),
      });
    }

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId: currentUser._id,
      action: "grant_permission",
      resourceType: "userAccess",
      resourceId: args.userId,
      metadata: {
        resourceType: args.resourceType,
        resourceId: args.resourceId,
        feature: args.feature,
        permission: args.permission,
      },
      timestamp: Date.now(),
    });
  },
});

// Revoke permission from a user
export const revokePermission = mutation({
  args: {
    userAccessId: v.id("userAccess"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) throw new Error("User not found");

    const access = await ctx.db.get(args.userAccessId);
    if (!access) throw new Error("Access record not found");

    // Check if current user can revoke permissions
    const canRevoke = await checkIfCanGrantPermission(
      ctx,
      currentUser,
      access.resourceType,
      access.resourceId,
      access.feature
    );

    if (!canRevoke) {
      throw new Error("You don't have permission to revoke access to this resource");
    }

    await ctx.db.delete(args.userAccessId);

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId: currentUser._id,
      action: "revoke_permission",
      resourceType: "userAccess",
      resourceId: access.userId,
      metadata: {
        resourceType: access.resourceType,
        resourceId: access.resourceId,
        feature: access.feature,
        permission: access.permission,
      },
      timestamp: Date.now(),
    });
  },
});

// Get all permissions for a user
export const getUserPermissions = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    const targetUserId = args.userId || user._id;

    // Only admins can view other users' permissions
    if (targetUserId !== user._id && user.role !== "admin") {
      return [];
    }

    const permissions = await ctx.db
      .query("userAccess")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();

    // Enhance with property details
    const enhancedPermissions = await Promise.all(
      permissions.map(async (perm) => {
        let resourceDetails = null;
        if (perm.resourceType === "property" && perm.resourceId) {
          resourceDetails = await ctx.db.get(perm.resourceId);
        }
        return {
          ...perm,
          resourceDetails,
        };
      })
    );

    return enhancedPermissions;
  },
});

// Helper function to check if user can grant permissions
async function checkIfCanGrantPermission(
  ctx: any,
  user: any,
  resourceType: "property" | "feature",
  resourceId?: Id<"properties">,
  feature?: string
): Promise<boolean> {
  // Admins can grant any permission
  if (user.role === "admin") return true;

  // Managers can grant permissions for resources they have admin access to
  if (user.role === "manager") {
    const hasAdminAccess = await ctx.db
      .query("userAccess")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .filter((q: any) => {
        const typeMatch = q.eq(q.field("resourceType"), resourceType);
        const adminMatch = q.eq(q.field("permission"), "admin");
        
        if (resourceType === "property" && resourceId) {
          return q.and(
            typeMatch,
            adminMatch,
            q.eq(q.field("resourceId"), resourceId)
          );
        } else if (resourceType === "feature" && feature) {
          return q.and(
            typeMatch,
            adminMatch,
            q.eq(q.field("feature"), feature)
          );
        }
        
        return q.and(typeMatch, adminMatch);
      })
      .first();

    return !!hasAdminAccess;
  }

  return false;
}