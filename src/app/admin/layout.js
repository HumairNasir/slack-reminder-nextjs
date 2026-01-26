"use client";

import React, { useState } from "react";
import Header from "@/components/ui/header"; // Your existing Header component
import AdminSidebar from "@/components/ui/adminsidebar"; // The new sidebar component
import "./admin.css"; // Global layout styles (wrapper, main content)

export default function AdminLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Reusing the User Header. 
        It will show "Slack Reminder" as requested.
        We pass the state handlers so the Menu button works.
      */}
      <Header sidebarOpen={isSidebarOpen} setSidebarOpen={setIsSidebarOpen} />

      <div className="main-wrapper">
        {/* The extracted Sidebar component */}
        <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

        {/* Page Content */}
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
