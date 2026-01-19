import { Calendar, Home, Settings, Slack, Zap } from "lucide-react";
import "./sidebar.css";

const menuItems = [
  { name: "Dashboard", icon: Home, href: "/dashboard" },
  { name: "Reminders", icon: Calendar, href: "/dashboard/reminders" },
  { name: "Slack", icon: Slack, href: "/dashboard/slack" },
  { name: "Billing", icon: Zap, href: "/dashboard/billing" },
  { name: "Settings", icon: Settings, href: "/dashboard/settings" },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <div className="section">
          <h2 className="section-title">Main</h2>
          <ul className="menu-list">
            {menuItems.map((item) => (
              <li key={item.name}>
                <a href={item.href} className="menu-item">
                  <item.icon className="menu-icon" />
                  <span>{item.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="section">
          <h2 className="section-title">Quick Stats</h2>
          <div className="stats-card">
            <div className="stat">
              <p className="stat-label">Active Reminders</p>
              <p className="stat-value">0</p>
            </div>
            <div className="stat">
              <p className="stat-label">Slack Channels</p>
              <p className="stat-value">0</p>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}
