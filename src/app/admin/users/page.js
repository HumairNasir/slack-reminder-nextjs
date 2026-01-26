"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Search, Loader2, CheckCircle } from "lucide-react";
import "../admin.css"; // Global admin styles
import "./users.css"; // New external styles

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select(
        `
        *,
        subscriptions (
          status,
          plan_id
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }

  const filteredUsers = users.filter((user) =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div>
      {/* Header with Search */}
      <div className="users-header">
        <h1 className="page-title users-page-title">User Management</h1>
        <div className="search-wrapper">
          <Search size={18} className="search-icon-custom" />
          <input
            type="text"
            placeholder="Search by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input-custom"
          />
        </div>
      </div>

      {/* Main Content Card */}
      <div className="card users-card">
        {loading ? (
          <div className="loading-container">
            <Loader2 className="animate-spin loader-icon-custom" size={32} />
            <p>Loading users...</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="styled-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Joined Date</th>
                  <th>Subscription</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state-cell">
                      No users found matching "{searchTerm}"
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const subStatus = user.subscriptions?.[0]?.status || "free";
                    const isActive = subStatus === "active";
                    return (
                      <tr key={user.id}>
                        <td className="email-text">{user.email}</td>
                        <td>
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <span
                            className={`badge ${isActive ? "active" : "free"}`}
                          >
                            {subStatus.toUpperCase()}
                          </span>
                        </td>
                        <td>User</td>
                        <td>
                          <span className="status-active-text">
                            <CheckCircle size={16} /> Active
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
