"use client";

import { useAuth } from "@/context/AuthContext";
import PricingCard from "@/components/stripe/PricingCard";
// import "../../../components/stripe/pricing.css";
import "@/components/stripe/pricing.css";

const plans = [
  {
    name: "Starter",
    price: 5,
    priceId: "price_starter_monthly", // You'll get this from Stripe dashboard
    channels: 20,
    reminders: 50,
    recurring: false,
    support: "Email",
    description: "Perfect for individuals",
  },
  {
    name: "Pro",
    price: 10,
    priceId: "price_pro_monthly",
    channels: 50,
    reminders: 100,
    recurring: true,
    support: "Priority Email",
    description: "Best for teams",
    popular: true,
  },
  {
    name: "Business",
    price: 25,
    priceId: "price_business_monthly",
    channels: 100,
    reminders: "Unlimited",
    recurring: true,
    support: "Phone & Email",
    description: "For organizations",
  },
];

export default function BillingPage() {
  const { user } = useAuth();

  return (
    <div className="billing-page">
      <h1 className="page-title">Choose Your Plan</h1>

      <div className="page-description">
        <p>
          Select the perfect plan for your Slack reminder needs. All plans
          include basic features.
        </p>
        {!user && (
          <p className="login-notice">
            ⚠️ Please login to subscribe to a plan.
          </p>
        )}
      </div>

      <div className="pricing-grid">
        {plans.map((plan, index) => (
          <PricingCard
            key={plan.name}
            plan={plan}
            isPopular={plan.popular || false}
          />
        ))}
      </div>

      <div className="faq-section">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-grid">
          <div className="faq-item">
            <h3>Can I change plans later?</h3>
            <p>
              Yes, you can upgrade or downgrade at any time. Changes take effect
              immediately.
            </p>
          </div>
          <div className="faq-item">
            <h3>Is there a free trial?</h3>
            <p>
              No free trial, but you can cancel within 14 days for a full
              refund.
            </p>
          </div>
          <div className="faq-item">
            <h3>What payment methods do you accept?</h3>
            <p>We accept all major credit cards via Stripe.</p>
          </div>
          <div className="faq-item">
            <h3>Can I cancel anytime?</h3>
            <p>
              Yes, cancel anytime from your dashboard. No cancellation fees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
