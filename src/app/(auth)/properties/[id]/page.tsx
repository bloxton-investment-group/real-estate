"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building, MapPin, Edit, Users, Plus, Mail, Phone, FileText, Calculator } from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

interface PropertyPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function PropertyPage({ params }: PropertyPageProps) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams.id as Id<"properties">;
  
  const property = useQuery(api.properties.getProperty, { id: propertyId });
  const tenants = useQuery(api.properties.getPropertyTenants, { propertyId });

  if (property === undefined || tenants === undefined) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (property === null) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Property Not Found</h1>
          <p className="text-gray-600 mt-2">The property you're looking for doesn't exist.</p>
          <Link href="/properties">
            <Button className="mt-4">Back to Properties</Button>
          </Link>
        </div>
      </div>
    );
  }

  const activeTenants = tenants.filter(t => t.active);
  const inactiveTenants = tenants.filter(t => !t.active);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href="/properties">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Properties
          </Button>
        </Link>
        
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Building className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">{property.name}</h1>
              <div className="flex items-center text-gray-600 mt-1">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{property.address}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Badge variant={property.active ? "default" : "secondary"}>
              {property.active ? "Active" : "Inactive"}
            </Badge>
            <Link href={`/properties/${propertyId}/documents`}>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Documents
              </Button>
            </Link>
            <Link href={`/properties/${propertyId}/tenant-billing`}>
              <Button variant="outline" size="sm">
                <Calculator className="h-4 w-4 mr-2" />
                Tenant Billing
              </Button>
            </Link>
            <Link href={`/properties/${propertyId}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Property Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Property Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">Address</h3>
              <p className="text-gray-600">{property.address}</p>
            </div>
            
            {property.description && (
              <div>
                <h3 className="font-medium text-gray-900">Description</h3>
                <p className="text-gray-600">{property.description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-900">Status</h3>
                <Badge variant={property.active ? "default" : "secondary"}>
                  {property.active ? "Active" : "Inactive"}
                </Badge>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">Total Tenants</h3>
                <p className="text-gray-600">{tenants.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Tenants */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Active Tenants</h2>
            <Badge variant="secondary">{activeTenants.length}</Badge>
          </div>
          <Button size="sm" disabled>
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        </div>
        
        {activeTenants.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No active tenants</h3>
              <p className="text-gray-600 mb-4">This property doesn't have any active tenants yet</p>
              <Button disabled>
                <Plus className="h-4 w-4 mr-2" />
                Add First Tenant
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTenants.map((tenant) => (
              <Card key={tenant._id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{tenant.name}</CardTitle>
                      {tenant.unitNumber && (
                        <p className="text-sm text-gray-600">Unit: {tenant.unitNumber}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tenant.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        <span className="truncate">{tenant.email}</span>
                      </div>
                    )}
                    {tenant.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        <span>{tenant.phone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Inactive Tenants */}
      {inactiveTenants.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold text-gray-600">Inactive Tenants</h2>
            <Badge variant="outline">{inactiveTenants.length}</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveTenants.map((tenant) => (
              <Card key={tenant._id} className="opacity-75">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-gray-600">{tenant.name}</CardTitle>
                      {tenant.unitNumber && (
                        <p className="text-sm text-gray-500">Unit: {tenant.unitNumber}</p>
                      )}
                    </div>
                    <Badge variant="secondary">
                      Inactive
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tenant.email && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail className="h-4 w-4 mr-2" />
                        <span className="truncate">{tenant.email}</span>
                      </div>
                    )}
                    {tenant.phone && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="h-4 w-4 mr-2" />
                        <span>{tenant.phone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}