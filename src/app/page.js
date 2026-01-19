"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import "./homepage.css";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user && !loading) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="homepage">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-logo">
          <div className="nav-logo-icon" />
          <span className="nav-logo-text">Slack Reminder</span>
        </div>
        <div className="nav-links">
          <Link href="/login" className="nav-link">
            Sign In
          </Link>
          <Link href="/register" className="nav-btn">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero">
        <h1 className="hero-title">
          Schedule Reminders to Slack
          <br />
          <span className="hero-highlight">Automatically</span>
        </h1>
        <p className="hero-subtitle">
          Connect your Slack workspace, schedule messages, and never miss
          important updates again. Perfect for daily standups, weekly reports,
          and team announcements.
        </p>
        <div className="hero-actions">
          <Link href="/register" className="hero-btn primary">
            Start Free Trial
          </Link>
          <Link href="/login" className="hero-btn secondary">
            View Demo
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="features">
        <h2 className="features-title">Powerful Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3 className="feature-name">Slack Integration</h3>
            <p className="feature-desc">
              Connect your own workspace and send messages to any channel.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⏰</div>
            <h3 className="feature-name">Smart Scheduling</h3>
            <p className="feature-desc">
              One-time or recurring reminders with timezone support.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3 className="feature-name">Flexible Plans</h3>
            <p className="feature-desc">
              Choose from starter to enterprise plans that fit your needs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
