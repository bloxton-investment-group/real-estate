"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Image } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BillingPeriodImageProps {
  storageId?: Id<"_storage">;
  periodDates?: string;
}

export function BillingPeriodImage({ storageId, periodDates }: BillingPeriodImageProps) {
  const [showPreview, setShowPreview] = useState(false);
  
  const imageUrl = useQuery(api.tenantBilling.getSupportingImageUrl, 
    storageId ? { storageId } : "skip"
  );

  if (!storageId || !imageUrl) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowPreview(true)}
        className="flex items-center gap-1 text-green-600 hover:text-green-700"
        aria-label="View meter reading image"
      >
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image className="h-3 w-3" aria-hidden="true" />
        <span className="underline">View image</span>
      </button>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Meter Reading Image</DialogTitle>
            {periodDates && (
              <DialogDescription>
                For billing period: {periodDates}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Meter reading"
              className="w-full rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}