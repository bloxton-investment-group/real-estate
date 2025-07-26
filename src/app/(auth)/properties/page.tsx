"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, MapPin, Plus, Edit, Users } from "lucide-react";

export default function PropertiesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const properties = useQuery(api.properties.getProperties, {});

  if (authLoading || properties === undefined) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Properties</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const activeProperties = properties?.filter(p => p.active) || [];
  const inactiveProperties = properties?.filter(p => !p.active) || [];

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Properties</h1>
          <p className="text-gray-600 mt-1">
            Manage your real estate portfolio
          </p>
        </div>
        <Link href="/properties/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </Link>
      </div>

      {/* Active Properties */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold">Active Properties</h2>
          <Badge variant="secondary">{activeProperties.length}</Badge>
        </div>
        
        {activeProperties.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No active properties</h3>
              <p className="text-gray-600 mb-4">Get started by adding your first property</p>
              <Link href="/properties/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProperties.map((property) => (
              <Card key={property._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{property.name}</CardTitle>
                      <div className="flex items-center text-gray-600 mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="text-sm">{property.address}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {property.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {property.description}
                    </p>
                  )}
                  <div className="flex justify-between items-center">
                    <Link href={`/properties/${property._id}`}>
                      <Button variant="outline" size="sm">
                        <Users className="h-4 w-4 mr-2" />
                        View Tenants
                      </Button>
                    </Link>
                    <Link href={`/properties/${property._id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Inactive Properties */}
      {inactiveProperties.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold text-gray-600">Inactive Properties</h2>
            <Badge variant="outline">{inactiveProperties.length}</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inactiveProperties.map((property) => (
              <Card key={property._id} className="opacity-75">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-gray-600">{property.name}</CardTitle>
                      <div className="flex items-center text-gray-500 mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="text-sm">{property.address}</span>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      Inactive
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {property.description && (
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                      {property.description}
                    </p>
                  )}
                  <div className="flex justify-between items-center">
                    <Link href={`/properties/${property._id}`}>
                      <Button variant="outline" size="sm" disabled>
                        <Users className="h-4 w-4 mr-2" />
                        View Tenants
                      </Button>
                    </Link>
                    <Link href={`/properties/${property._id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
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