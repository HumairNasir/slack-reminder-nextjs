"use client";

import { useAuth } from "@/context/AuthContext";
import "./pricing.css";

export default function PricingCard({
  plan,
  isPopular = false,
  isCurrent = false, // 👈 Checks if this is the active plan
  actionLabel = "Get Started", // 👈 This variable holds the dynamic text
  onAction = null, // 👈 This function handles the click
  isLoading = false,
  buttonClass = "", // 👈 Handles red/grey colors
}) {
  const { user } = useAuth();

  // Handle the click (Upgrade, Cancel, etc.)
  const handleClick = () => {
    if (onAction) {
      onAction();
    } else {
      console.warn("No action provided for this button");
    }
  };

  return (
    <div
      className={`pricing-card ${isPopular ? "popular" : ""} ${isCurrent ? "current-plan-border" : ""}`}
      style={
        isCurrent ? { border: "2px solid #2563eb", position: "relative" } : {}
      }
    >
      {/* Popular Badge */}
      {isPopular && <div className="popular-badge">Most Popular</div>}

      {/* Current Plan Badge */}
      {isCurrent && (
        <div
          style={{
            position: "absolute",
            top: "11px",
            right: "1px",
            backgroundColor: "#1252dd",
            color: "white",
            fontSize: "0.75rem",
            padding: "4px 12px",
            borderRadius: "9999px", // Fully rounded
            fontWeight: "600",
            zIndex: 10,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)", // Optional: adds a nice pop
          }}
        >
          Current Plan
        </div>
      )}

      <div className="pricing-header">
        <h3>{plan.name}</h3>
        <div className="price">
          <span className="amount">${plan.price}</span>
          <span className="period">/month</span>
        </div>
      </div>

      <div className="features">
        <ul>
          <li>✓ {plan.channels} Slack Channels</li>
          <li>✓ {plan.reminders} Reminders</li>
          <li>
            ✓ {plan.recurring ? "Recurring Reminders" : "Basic Scheduling"}
          </li>
          <li>✓ {plan.support} Support</li>
        </ul>
      </div>

      {/* 👇 THIS IS THE KEY CHANGE 👇 */}
      <button
        className={`subscribe-btn ${buttonClass}`}
        onClick={handleClick}
        disabled={isLoading || !user}
        style={
          buttonClass === "btn-cancel"
            ? { backgroundColor: "#dc2626" }
            : buttonClass === "btn-secondary"
              ? { backgroundColor: "#4b5563" }
              : {}
        }
      >
        {isLoading ? "Processing..." : actionLabel}
      </button>
    </div>
  );
}
