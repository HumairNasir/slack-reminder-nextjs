"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Users, FileText, Bell } from "lucide-react"; // Using Lucide icons to match
import "./sidebar.css";
// import "./adminsidebar.css";

// Define menu items in an array for cleaner mapping
const menuItems = [
  { name: "Overview", icon: BarChart3, href: "/admin" },
  { name: "Users", icon: Users, href: "/admin/users" },
  { name: "Reminders", icon: Bell, href: "/admin/reminders" },
  { name: "System Logs", icon: FileText, href: "/admin/logs" },
];

export default function AdminSidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />
      )}

      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <nav className="sidebar-nav">
          {/* Main Section */}
          <div className="section">
            <h2 className="section-title" style={{ color: "#6b7280" }}>
              Main
            </h2>
            <ul className="menu-list">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`menu-item ${isActive ? "active" : ""}`}
                      onClick={() => setIsOpen(false)} // Close on mobile click
                    >
                      <item.icon className="menu-icon" />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </aside>
    </>
  );
}
