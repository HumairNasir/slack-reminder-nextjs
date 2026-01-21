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
      // 1. Get the current session from Supabase
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || !session.access_token) {
        alert("Session expired. Please login again.");
        return;
      }

      // 2. Create checkout session WITH auth token
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          priceId: plan.priceId,
        }),
      });

      // 3. Check for errors
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Subscription error:", error);
      alert(error.message || "Failed to start subscription. Please try again.");
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
