"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

export function Breadcrumbs({ items, className, showHome = true }: BreadcrumbsProps) {
  const allItems = showHome 
    ? [{ label: "Home", href: "/dashboard", icon: <Home className="h-4 w-4" /> }, ...items]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center space-x-1 text-sm", className)}>
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;
        
        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
            )}
            
            {isLast || !item.href ? (
              <span className="flex items-center gap-1 text-gray-900 font-medium">
                {item.icon}
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
              >
                {item.icon}
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}