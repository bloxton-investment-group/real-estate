"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface UploadBillPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Redirect to enhanced upload
export default function UploadBillPage({ params }: UploadBillPageProps) {
  const router = useRouter();
  
  useEffect(() => {
    params.then((resolvedParams) => {
      router.replace(`/properties/${resolvedParams.id}/documents/enhanced-upload`);
    });
  }, [params, router]);
  
  return <div>Redirecting to enhanced upload...</div>;
}