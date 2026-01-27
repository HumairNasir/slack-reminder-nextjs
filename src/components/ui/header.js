"use client";

import { User, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import "./header.css";

export default function Header({ sidebarOpen, setSidebarOpen }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setDropdownOpen(false);
    router.push("/login");
    router.refresh();
  };

  const displayName = user?.email?.split("@")[0] || "User";

  return (
    <header className="header">
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? (
          <X className="toggle-icon" />
        ) : (
          <Menu className="toggle-icon" />
        )}
      </button>

      <div className="header-logo">
        <div className="logo-icon" />
        <h1>Slack Reminder</h1>
      </div>

      <div className="header-actions">
        {user ? (
          <>
            {/* <button className="notification-btn">
              <Bell className="icon" />
              <span className="notification-dot" />
            </button> */}

            <div className="user-dropdown" ref={dropdownRef}>
              <button
                className="user-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="user-avatar">
                  <User className="avatar-icon" />
                </div>
                <span>{displayName}</span>
              </button>

              {dropdownOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-item user-info">
                    <div className="user-email">{user.email}</div>
                    {/* <div className="user-role">{user.role}</div> */}
                  </div>
                  <button
                    className="dropdown-item logout-btn"
                    onClick={handleLogout}
                  >
                    <LogOut className="logout-icon" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <button className="login-btn" onClick={() => router.push("/login")}>
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
