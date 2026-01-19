"use client";

import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminOnly({ children }) {
  const { role, loading } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role !== "super_admin") {
      router.push("/dashboard");
    }
  }, [role, loading, router]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (role !== "super_admin") {
    return null;
  }

  return <>{children}</>;
}
