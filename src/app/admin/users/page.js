"use client";

import { createClient } from "@/lib/supabase/client"; // Your path
import { useEffect, useState } from "react";
import { Search, Loader2, CheckCircle, XCircle } from "lucide-react";
import "../admin.css"; // Reusing the admin CSS

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
    // Fetch users and their subscription status
    // Note: We join with the subscriptions table to get the status
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

  // Filter users based on search
  const filteredUsers = users.filter((user) =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">User Management</h1>

        {/* Search Bar */}
        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="section-container">
        {loading ? (
          <div className="loading-state">
            <Loader2 className="animate-spin" size={32} />
            <p>Loading users...</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
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
                {filteredUsers.map((user) => {
                  // Get subscription status safely
                  const subStatus = user.subscriptions?.[0]?.status || "free";
                  const isActive = subStatus === "active";

                  return (
                    <tr key={user.id}>
                      <td className="font-medium">{user.email}</td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <span
                          className={`badge ${isActive ? "badge-success" : "badge-warning"}`}
                        >
                          {subStatus.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {
                          /* You might need to fetch role separately if not in user meta */ "User"
                        }
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {/* Simple visual indicator for now */}
                          <CheckCircle size={16} color="green" /> Active
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      No users found matching "{searchTerm}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
