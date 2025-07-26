"use client";

import React, { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FileUpload } from "@/components/file-upload";

interface DebugExtractorProps {
  propertyId: Id<"properties">;
  onSuccess?: () => void;
}

export function DebugExtractor({
  propertyId,
  onSuccess,
}: DebugExtractorProps) {
  const { isLoaded } = useAuth();
  const getFileUrl = useMutation(api.files.getFileUrl);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [storageId, setStorageId] = useState<string | null>(null);

  const handleFileUpload = async (files: { storageId: string; name: string; size: number; type: string }[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    console.log("File uploaded:", file);
    
    try {
      const url = await getFileUrl({ storageId: file.storageId as any });
      console.log("File URL:", url);
      setFileUrl(url);
      setStorageId(file.storageId);
      toast("File uploaded successfully");
    } catch (error) {
      console.error("Failed to get file URL:", error);
      toast("Failed to get file URL");
    }
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-4 border-red-500">
        <CardHeader className="bg-red-100">
          <CardTitle className="text-red-800">🚨 DEBUG MODE - NO AUTO EXTRACTION 🚨</CardTitle>
          <p className="text-red-700">This is the NEW enhanced extractor - NO automatic bullshit!</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload
            accept={{
              "application/pdf": [".pdf"],
              "image/*": [".png", ".jpg", ".jpeg"]
            }}
            maxSize={10 * 1024 * 1024}
            onUploadComplete={handleFileUpload}
          />
          
          {storageId && (
            <div className="p-4 bg-gray-100 rounded">
              <h3 className="font-semibold mb-2">File Info:</h3>
              <p><strong>Storage ID:</strong> {storageId}</p>
              <p><strong>File URL:</strong> {fileUrl}</p>
            </div>
          )}
          
          {fileUrl && (
            <div className="space-y-4">
              <h3 className="font-semibold">File Preview:</h3>
              <div className="border p-4">
                <iframe 
                  src={fileUrl} 
                  width="100%" 
                  height="400"
                  style={{ border: "1px solid #ccc" }}
                />
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Direct Link Test:</h4>
                <a 
                  href={fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Open file in new tab
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}