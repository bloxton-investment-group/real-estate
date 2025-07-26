"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentAreaSelector, type ExtractionArea } from "./document-area-selector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/file-upload";
import { Loader2, Plus, Eye, Settings } from "lucide-react";

export function TemplateManager() {
  const [selectedDocumentType, setSelectedDocumentType] = useState("utility_bill");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [sampleFileUrl, setSampleFileUrl] = useState<string | null>(null);

  const templates = useQuery(api.documents.getExtractionTemplates, {
    documentType: selectedDocumentType,
  });

  const handleFileUpload = (files: { storageId: string; name: string; size: number; type: string }[]) => {
    if (files.length > 0) {
      setSampleFileUrl(`/api/files/${files[0].storageId}`);
    }
  };

  const handleViewTemplate = (template: any) => {
    setSelectedTemplate(template);
    setShowViewDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Extraction Templates</h2>
          <p className="text-muted-foreground">
            Manage document extraction templates for improved accuracy
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Extraction Template</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Document Type</label>
                <Select
                  value={selectedDocumentType}
                  onValueChange={setSelectedDocumentType}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utility_bill">Utility Bill</SelectItem>
                    <SelectItem value="lease_agreement">Lease Agreement</SelectItem>
                    <SelectItem value="rental_application">Rental Application</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Sample Document</label>
                <FileUpload
                  accept={{
                    "application/pdf": [".pdf"],
                    "image/*": [".png", ".jpg", ".jpeg"]
                  }}
                  maxSize={10 * 1024 * 1024}
                  onUploadComplete={handleFileUpload}
                />
              </div>

              {sampleFileUrl && (
                <div className="mt-4">
                  <DocumentAreaSelector
                    fileUrl={sampleFileUrl}
                    mode="select"
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Document Type:</label>
        <Select
          value={selectedDocumentType}
          onValueChange={setSelectedDocumentType}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="utility_bill">Utility Bills</SelectItem>
            <SelectItem value="lease_agreement">Lease Agreements</SelectItem>
            <SelectItem value="rental_application">Rental Applications</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {templates === undefined ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center h-32">
                <Settings className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  No templates found for {selectedDocumentType.replace("_", " ")}
                </p>
                <p className="text-sm text-muted-foreground">
                  Create your first template to improve extraction accuracy
                </p>
              </CardContent>
            </Card>
          ) : (
            templates.map((template) => (
              <Card key={template._id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="secondary">
                      {template.areas.length} areas
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Fields: {template.areas.map((area: ExtractionArea) => area.fieldName).join(", ")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(template.createdAt).toLocaleDateString()}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewTemplate(template)}
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate?.name} - Template Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Document Type</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.documentType.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Total Areas</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.areas.length} extraction areas
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Extraction Areas</label>
                <div className="space-y-2">
                  {selectedTemplate.areas.map((area: ExtractionArea, index: number) => (
                    <div
                      key={area.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <span className="font-medium">{area.fieldName}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({area.fieldType})
                        </span>
                      </div>
                      <Badge variant="outline">
                        Page {area.pageNumber}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Created on {new Date(selectedTemplate.createdAt).toLocaleDateString()} at{" "}
                {new Date(selectedTemplate.createdAt).toLocaleTimeString()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}