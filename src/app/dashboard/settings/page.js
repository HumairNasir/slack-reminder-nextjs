"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Edit2, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import "./settings.css";

// Force dynamic to prevent caching issues
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "", // Initially empty. We NEVER fetch the old password.
  });

  // Load initial data from User Session
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.user_metadata?.full_name || "",
        email: user.email || "",
        password: "", // Always start empty for security
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const updates = {}; // For Supabase Auth
      const dbUpdates = {}; // For Public Database Table

      // 1. Check for Name Change
      if (formData.fullName !== user.user_metadata?.full_name) {
        updates.data = { full_name: formData.fullName };
        dbUpdates.full_name = formData.fullName;
      }

      // 2. Check for Email Change
      if (formData.email !== user.email) {
        updates.email = formData.email;
        dbUpdates.email = formData.email;
      }

      // 3. Check for Password Change
      // We only update if the user actually typed something new
      if (formData.password && formData.password.length > 0) {
        updates.password = formData.password;
      }

      if (Object.keys(updates).length === 0) {
        setIsEditing(false);
        setIsSaving(false);
        return;
      }

      // 4. Update Supabase Auth (The Login System)
      const { error: authError } = await supabase.auth.updateUser(updates);
      if (authError) throw authError;

      // 5. Update Public Users Table (Sync Data)
      if (Object.keys(dbUpdates).length > 0) {
        const { error: dbError } = await supabase
          .from("users") // Matches your 'users' table
          .update(dbUpdates)
          .eq("id", user.id);

        if (dbError) {
          console.error("DB Update Failed:", dbError);
          setMessage({
            type: "error",
            text: "Auth updated, but database sync failed.",
          });
          return;
        }
      }

      setMessage({ type: "success", text: "Profile updated successfully!" });
      setIsEditing(false);

      // Clear password field after save so it doesn't stay in memory
      setFormData((prev) => ({ ...prev, password: "" }));

      if (updates.email) {
        alert("Please check your new email inbox to verify the change.");
      }

      // Refresh page to show new data
      router.refresh();
    } catch (error) {
      console.error("Update error:", error);
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: user.user_metadata?.full_name || "",
      email: user.email || "",
      password: "",
    });
    setIsEditing(false);
    setMessage(null);
  };

  if (loading || !user) {
    return <div className="loading-spinner">Loading settings...</div>;
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="page-title">Account Settings</h1>
        {!isEditing && (
          <button className="btn-edit" onClick={() => setIsEditing(true)}>
            <Edit2 size={16} /> Edit Profile
          </button>
        )}
      </div>

      {message && <div className={`alert ${message.type}`}>{message.text}</div>}

      <div className="settings-card">
        {/* Full Name */}
        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            disabled={!isEditing}
            className={isEditing ? "input-edit" : "input-readonly"}
          />
        </div>

        {/* Email */}
        <div className="form-group">
          <label>Email Address</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            disabled={!isEditing}
            className={isEditing ? "input-edit" : "input-readonly"}
          />
        </div>

        {/* Password Section */}
        <div className="form-group">
          <label>Password</label>
          <div className="password-wrapper">
            <input
              // Toggle between "text" (visible) and "password" (dots)
              type={showPassword ? "text" : "password"}
              name="password"
              // Logic:
              // 1. Not Editing? Show dummy dots "••••••"
              // 2. Editing? Show what the user types (formData.password)
              value={!isEditing ? "••••••••" : formData.password}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder={isEditing ? "Type new password to change" : ""}
              className={isEditing ? "input-edit" : "input-readonly"}
              autoComplete="new-password"
            />

            {/* Eye Icon: Only works in Edit Mode to see what you are typing */}
            {isEditing && (
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
          </div>
          {isEditing && (
            <small className="hint">
              Leave blank if you don't want to change your password.
            </small>
          )}
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="form-actions">
            <button
              className="btn-save"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  <Save size={16} /> Save Changes
                </>
              )}
            </button>
            <button
              className="btn-cancel"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X size={16} /> Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
