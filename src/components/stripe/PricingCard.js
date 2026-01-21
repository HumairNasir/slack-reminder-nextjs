"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import "./pricing.css";

export default function PricingCard({ plan, isPopular = false }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubscribe = async () => {
    if (!user) {
      alert("Please login first");
      return;
    }

    setLoading(true);

    try {
      // 1. Create checkout session
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: plan.priceId,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (error) {
      console.error("Subscription error:", error);
      alert("Failed to start subscription. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`pricing-card ${isPopular ? "popular" : ""}`}>
      {isPopular && <div className="popular-badge">Most Popular</div>}

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

      <button
        className="subscribe-btn"
        onClick={handleSubscribe}
        disabled={loading || !user}
      >
        {loading ? "Processing..." : "Get Started"}
      </button>
    </div>
  );
}
