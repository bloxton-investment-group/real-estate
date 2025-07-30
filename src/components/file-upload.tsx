"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, File, X, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface FileUploadProps {
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
  onUploadComplete?: (files: { storageId: string; name: string; size: number; type: string }[]) => void;
  disabled?: boolean;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  storageId?: string;
  error?: string;
}

export function FileUpload({
  accept = {
    "application/pdf": [".pdf"],
    "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
  },
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  onUploadComplete,
  disabled = false,
  className = "",
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    // Get upload URL from Convex
    const uploadUrl = await generateUploadUrl();

    // Upload file to Convex storage
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const { storageId } = await response.json();
    return storageId;
  }, [generateUploadUrl]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return;

      // Initialize uploading files
      const newUploadingFiles: UploadingFile[] = acceptedFiles.map((file) => ({
        file,
        progress: 0,
        status: "uploading",
      }));

      setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

      // Upload files one by one
      const uploadPromises = acceptedFiles.map(async (file, index) => {
        try {
          // Update progress to show upload started
          setUploadingFiles((prev) =>
            prev.map((uf, i) =>
              uf.file === file ? { ...uf, progress: 10 } : uf
            )
          );

          const storageId = await uploadFile(file);

          // Mark as completed
          setUploadingFiles((prev) =>
            prev.map((uf) =>
              uf.file === file
                ? { ...uf, progress: 100, status: "completed", storageId }
                : uf
            )
          );

          return {
            storageId,
            name: file.name,
            size: file.size,
            type: file.type,
          };
        } catch (error) {
          console.error("Upload failed:", error);
          
          // Mark as error
          setUploadingFiles((prev) =>
            prev.map((uf) =>
              uf.file === file
                ? {
                    ...uf,
                    status: "error",
                    error: error instanceof Error ? error.message : "Upload failed",
                  }
                : uf
            )
          );

          toast.error(`Failed to upload ${file.name}`);
          return null;
        }
      });

      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((result) => result !== null);

      if (successfulUploads.length > 0) {
        onUploadComplete?.(successfulUploads);
        toast.success(`Uploaded ${successfulUploads.length} file(s) successfully`);
      }
    },
    [disabled, onUploadComplete, uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    disabled,
  });

  const removeFile = (fileToRemove: File) => {
    setUploadingFiles((prev) => prev.filter((uf) => uf.file !== fileToRemove));
  };

  const clearCompleted = () => {
    setUploadingFiles((prev) => prev.filter((uf) => uf.status !== "completed"));
  };

  return (
    <div className={className}>
      <Card
        {...getRootProps()}
        className={`border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-gray-300 hover:border-gray-400"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        
        {isDragActive ? (
          <p className="text-lg font-medium">Drop files here...</p>
        ) : (
          <div>
            <p className="text-lg font-medium mb-2">
              Drag & drop files here, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports PDF and image files up to {Math.round(maxSize / (1024 * 1024))}MB
            </p>
          </div>
        )}
      </Card>

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <div className="mt-4 space-y-2">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="text-sm text-red-600 bg-red-50 p-2 rounded">
              <strong>{file.name}</strong>: {errors.map((e) => e.message).join(", ")}
            </div>
          ))}
        </div>
      )}

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Uploading Files</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={clearCompleted}
              disabled={uploadingFiles.every((uf) => uf.status !== "completed")}
            >
              Clear Completed
            </Button>
          </div>
          
          {uploadingFiles.map((uploadingFile) => (
            <div
              key={uploadingFile.file.name}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-md"
            >
              <File className="h-5 w-5 text-gray-500" />
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {uploadingFile.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(uploadingFile.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                
                {uploadingFile.status === "uploading" && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${uploadingFile.progress}%` }}
                    />
                  </div>
                )}
                
                {uploadingFile.status === "error" && (
                  <p className="text-xs text-red-500 mt-1">
                    {uploadingFile.error}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {uploadingFile.status === "uploading" && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                )}
                
                {uploadingFile.status === "completed" && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                
                {uploadingFile.status === "error" && (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(uploadingFile.file)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}