"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Search, Loader2, CheckCircle, Plus, XCircle, X } from "lucide-react";
import "../admin.css";
import "./users.css";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [currentUser, setCurrentUser] = useState(null);

  // Added full_name to form state
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    password: "",
    role: "user",
  });

  const [modalLoading, setModalLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select(`*, subscriptions (status, plan_id)`)
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching users:", error);
    else setUsers(data || []);
    setLoading(false);
  }

  // --- ACTIONS ---

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";

    // Optimistic Update
    setUsers(
      users.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)),
    );

    const { error } = await supabase
      .from("users")
      .update({ status: newStatus })
      .eq("id", userId);

    if (error) {
      console.error("Error updating status:", error);
      fetchUsers();
      alert("Failed to update status. Check if 'status' column exists in DB.");
    }
  };

  const openCreateModal = () => {
    setModalMode("create");
    setFormData({ email: "", full_name: "", password: "", role: "user" });
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setModalMode("edit");
    setCurrentUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name || "", // Pre-fill name
      password: "",
      role: user.role || "user",
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);

    if (modalMode === "create") {
      // Create User
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: formData.role,
            status: "active",
            full_name: formData.full_name, // Save Name to Auth Metadata
          },
        },
      });

      if (error) {
        alert("Error creating user: " + error.message);
      } else {
        // Optional: Also force insert into public.users if your triggers are slow
        // But usually, we rely on the Trigger.
        alert("User created! Status set to Active.");
        setIsModalOpen(false);
        fetchUsers();
      }
    } else {
      // Edit User
      const { error } = await supabase
        .from("users")
        .update({
          role: formData.role,
          full_name: formData.full_name,
          email: formData.email, // Updates DB record (Note: Auth email won't change without backend API)
        })
        .eq("id", currentUser.id);

      if (error) {
        alert("Error updating user: " + error.message);
      } else {
        setIsModalOpen(false);
        fetchUsers();
      }
    }
    setModalLoading(false);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div>
      <div className="users-header">
        <h1 className="page-title users-page-title">User Management</h1>
        <div className="users-header-actions">
          <div className="users-search-wrapper">
            <Search size={18} className="users-search-icon" />
            <input
              type="text"
              placeholder="Search by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="users-search-input"
            />
          </div>
          <button className="btn-create" onClick={openCreateModal}>
            <Plus size={18} /> Create User
          </button>
        </div>
      </div>

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
                  <th>Name / Email</th>
                  <th>Joined Date</th>
                  <th>Subscription</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state-cell">
                      No users found matching "{searchTerm}"
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const subStatus = user.subscriptions?.[0]?.status || "free";
                    const isSubActive = subStatus === "active";
                    const isUserActive = user.status === "active";

                    return (
                      <tr key={user.id}>
                        <td>
                          <div
                            style={{ display: "flex", flexDirection: "column" }}
                          >
                            <span style={{ fontWeight: 600, color: "#111827" }}>
                              {user.full_name || "No Name"}
                            </span>
                            <span
                              style={{ fontSize: "0.8rem", color: "#6b7280" }}
                            >
                              {user.email}
                            </span>
                          </div>
                        </td>
                        <td>
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <span
                            className={`badge ${isSubActive ? "active" : "free"}`}
                          >
                            {subStatus.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {/* Capitalize Role */}
                          {user.role === "super_admin" ? "Super Admin" : "User"}
                        </td>
                        <td>
                          {isUserActive ? (
                            <span className="status-active-text">
                              <CheckCircle size={16} /> Active
                            </span>
                          ) : (
                            <span
                              className="status-active-text"
                              style={{ color: "#ef4444" }}
                            >
                              <XCircle size={16} /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="actions-cell">
                          <button
                            className="btn-action btn-edit"
                            onClick={() => openEditModal(user)}
                          >
                            Edit
                          </button>
                          {isUserActive ? (
                            <button
                              className="btn-action btn-deactivate"
                              onClick={() =>
                                handleToggleStatus(user.id, "active")
                              }
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              className="btn-action btn-activate"
                              onClick={() =>
                                handleToggleStatus(user.id, "inactive")
                              }
                            >
                              Activate
                            </button>
                          )}
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

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                {modalMode === "create" ? "Create New User" : "Edit User"}
              </h3>
              <button
                className="close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              {/* Name Input */}
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                />
              </div>

              {/* Email Input */}
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              {/* Password - Only for Create */}
              {modalMode === "create" && (
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                </div>
              )}

              {/* Role Select */}
              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                >
                  <option value="user">User</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  disabled={modalLoading}
                >
                  {modalLoading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
