import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building, FileText, DollarSign, Users, BarChart3 } from "lucide-react";

export default async function DashboardPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Welcome back, {user?.firstName || "User"}!</h2>
            <p className="text-gray-600 mb-6">
              Manage your real estate portfolio with ease. Get started with the tools below.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/properties">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <Building className="h-6 w-6" />
                  <span>Properties</span>
                </Button>
              </Link>
              
              <Button variant="outline" className="w-full h-20 flex-col gap-2" disabled>
                <Users className="h-6 w-6" />
                <span>Tenants</span>
              </Button>
              
              <Button variant="outline" className="w-full h-20 flex-col gap-2" disabled>
                <FileText className="h-6 w-6" />
                <span>Invoices</span>
              </Button>
              
              <Button variant="outline" className="w-full h-20 flex-col gap-2" disabled>
                <DollarSign className="h-6 w-6" />
                <span>Utility Bills</span>
              </Button>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-3">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Properties</span>
                <span className="font-semibold">-</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Tenants</span>
                <span className="font-semibold">-</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pending Invoices</span>
                <span className="font-semibold">-</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
            <p className="text-gray-500 text-sm">No recent activity</p>
          </div>
        </div>
      </div>
    </div>
  );
}