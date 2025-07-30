"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Breadcrumbs, BreadcrumbItem } from "./breadcrumbs";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  breadcrumbs?: BreadcrumbItem[];
  showBreadcrumbs?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  backHref,
  backLabel = "Back",
  breadcrumbs,
  showBreadcrumbs = false,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      {/* Breadcrumbs */}
      {showBreadcrumbs && breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mb-4">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      )}
      
      {/* Back Button */}
      {backHref && (
        <Link href={backHref}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {backLabel}
          </Button>
        </Link>
      )}
      
      {/* Title and Actions */}
      <div className="flex items-start justify-between">
        <h1 className="text-3xl font-bold">{title}</h1>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}