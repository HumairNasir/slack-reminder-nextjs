"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import "./login.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Authenticate the User
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setError("No user found.");
        setLoading(false);
        return;
      }

      // 2. Fetch role AND status from users table
      // UPDATED: Added 'status' to the select query
      const { data: profile, error: roleError } = await supabase
        .from("users")
        .select("role, status")
        .eq("id", user.id)
        .single();

      if (roleError) {
        console.warn("Could not fetch user profile:", roleError.message);
      }

      // 🛑 3. CHECK USER STATUS (New Logic)
      // If status exists and is NOT 'active', block them.
      // We explicitly check for 'inactive' or anything that isn't 'active'.
      if (profile && profile.status !== "active") {
        // Immediately kill the session we just created
        await supabase.auth.signOut();

        // Show the popup/error message
        setError(
          "You are not allowed to login. Please contact admin for further details.",
        );
        setLoading(false);
        return;
      }

      const userRole = profile?.role || "user";
      console.log("Login successful. Role:", userRole);

      // 4. Redirect based on Role
      const redirectPath = userRole === "super_admin" ? "/admin" : "/dashboard";
      console.log("Redirecting to:", redirectPath);

      // Use window.location to clear state completely
      window.location.href = redirectPath;
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo" />
          <h1>Welcome Back</h1>
          <p>Sign in to your Slack Reminder account</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="login-footer">
          <p className="footer-text">
            Don't have an account?{" "}
            <Link href="/register" className="footer-link">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
