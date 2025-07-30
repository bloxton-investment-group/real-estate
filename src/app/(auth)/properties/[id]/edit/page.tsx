"use client";

import { use, useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Building, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";

interface EditPropertyPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditPropertyPage({ params }: EditPropertyPageProps) {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const resolvedParams = use(params);
  const propertyId = resolvedParams.id as Id<"properties">;
  
  const property = useQuery(
    api.properties.getProperty, 
    isLoaded && userId ? { id: propertyId } : "skip"
  );
  const updateProperty = useMutation(api.properties.updateProperty);
  const deleteProperty = useMutation(api.properties.deleteProperty);
  
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    description: "",
    active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name,
        address: property.address,
        description: property.description || "",
        active: property.active,
      });
    }
  }, [property]);

  if (!isLoaded || property === undefined) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (!userId) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Not Authenticated</h1>
          <p className="text-gray-600 mt-2">Please sign in to edit this property.</p>
          <Link href="/sign-in">
            <Button className="mt-4">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (property === null) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Property Not Found</h1>
          <p className="text-gray-600 mt-2">The property you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/properties">
            <Button className="mt-4">Back to Properties</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.address.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await updateProperty({
        id: propertyId,
        name: formData.name.trim(),
        address: formData.address.trim(),
        description: formData.description.trim() || undefined,
        active: formData.active,
      });
      
      toast.success("Property updated successfully!");
      router.push("/properties");
    } catch (error) {
      console.error("Failed to update property:", error);
      toast.error("Failed to update property. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this property? This action cannot be undone.")) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      await deleteProperty({ id: propertyId });
      toast.success("Property deleted successfully!");
      router.push("/properties");
    } catch (error) {
      console.error("Failed to delete property:", error);
      toast.error("Failed to delete property. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/properties">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Properties
          </Button>
        </Link>
        
        <div className="flex items-center gap-3">
          <Building className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Edit Property</h1>
            <p className="text-gray-600">Update property information</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Property Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Property Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g., Downtown Apartments, Sunset Villa"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">
                Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="e.g., 123 Main St, Anytown, ST 12345"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Optional description of the property..."
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => handleChange("active", checked)}
              />
              <Label htmlFor="active">Active Property</Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "Updating..." : "Update Property"}
              </Button>
              <Link href="/properties">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Deleting this property will permanently remove it from your portfolio. This action cannot be undone.
          </p>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? "Deleting..." : "Delete Property"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}