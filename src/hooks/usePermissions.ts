import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "./useAuth";

type Permission = "read" | "write" | "admin";

export function usePermissions() {
  const { user } = useAuth();

  const checkPropertyPermission = (
    propertyId: Id<"properties">,
    permission: Permission = "read"
  ) => {
    return useQuery(
      api.permissions.checkPermission,
      user
        ? {
            resourceType: "property",
            resourceId: propertyId,
            permission,
          }
        : "skip"
    );
  };

  const checkFeaturePermission = (
    feature: string,
    permission: Permission = "read"
  ) => {
    return useQuery(
      api.permissions.checkPermission,
      user
        ? {
            resourceType: "feature",
            feature,
            permission,
          }
        : "skip"
    );
  };

  const userPermissions = useQuery(
    api.permissions.getUserPermissions,
    user ? {} : "skip"
  );

  return {
    checkPropertyPermission,
    checkFeaturePermission,
    userPermissions,
    isAdmin: user?.role === "admin",
    isManager: user?.role === "manager" || user?.role === "admin",
    canCreateInvoice: (propertyId: Id<"properties">) => {
      const hasPermission = checkPropertyPermission(propertyId, "write");
      return hasPermission || user?.role === "admin" || user?.role === "manager";
    },
  };
}

// Permission constants for features
export const FEATURES = {
  CREATE_INVOICE: "create_invoice",
  VIEW_REPORTS: "view_reports",
  MANAGE_PROPERTIES: "manage_properties",
  MANAGE_TENANTS: "manage_tenants",
  MANAGE_USERS: "manage_users",
  VIEW_AUDIT_LOGS: "view_audit_logs",
} as const;

export type Feature = typeof FEATURES[keyof typeof FEATURES];