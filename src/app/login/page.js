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

      // 2. Fetch role from users table
      const { data: profile, error: roleError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (roleError) {
        console.warn("Could not fetch user role:", roleError.message);
      }

      const userRole = profile?.role || "user";
      console.log("Login successful. Role:", userRole);

      // 3. Redirect based on Role - ONLY CALL THIS ONCE
      const redirectPath = userRole === "super_admin" ? "/admin" : "/dashboard";
      console.log("Redirecting to:", redirectPath);

      // Use window.location for full page reload to clear any stale state
      window.location.href = redirectPath;

      // OR if you prefer router:
      // router.push(redirectPath);
      // router.refresh();
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
    // Note: We don't set loading(false) on success because page will redirect
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
