"use client";

import { useEffect, useState, Suspense } from "react"; // Added Suspense
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import PricingCard from "@/components/stripe/PricingCard";
import { Loader2 } from "lucide-react";
import "@/components/stripe/pricing.css";

// 1. Rename your main logic component to 'BillingContent'
//    and remove 'export default' from it.
function BillingContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user) {
      fetchBillingData();
    }
  }, [user, authLoading]);

  const fetchBillingData = async () => {
    try {
      console.log("🔄 Fetching billing data...");

      // Fetch Plans
      const { data: dbPlans } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });

      const formattedPlans = (dbPlans || []).map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price_monthly,
        priceId: p.stripe_price_id,
        slug: p.slug,
        channels: p.max_channels,
        reminders:
          p.max_reminders === -1 || p.max_reminders > 9999
            ? "Unlimited"
            : p.max_reminders,
        recurring: p.slug !== "starter",
        support:
          p.slug === "business"
            ? "Phone & Email"
            : p.slug === "pro"
              ? "Priority Email"
              : "Email",
        popular: p.slug === "pro",
      }));

      setPlans(formattedPlans);

      // Fetch Subscription
      const { data: subData, error } = await supabase
        .from("subscriptions")
        .select("*, plan:subscription_plans(*)")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing", "past_due"])
        .maybeSingle();

      if (error) console.error("❌ Subscription Error:", error.message);
      else console.log("👤 User Subscription:", subData);

      setCurrentSubscription(subData);
    } catch (error) {
      console.error("❌ General Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (priceId) => {
    setProcessingId(priceId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ priceId }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
      else alert("Failed to start checkout.");
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Something went wrong.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelPlan = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel? Premium features will be disabled immediately.",
      )
    )
      return;
    alert("Please use the Stripe Customer Portal to cancel.");
  };

  const getCardConfig = (plan) => {
    const isFreeTrial =
      currentSubscription?.plan?.slug === "free_trial" ||
      currentSubscription?.status === "trialing";
    const currentPlanId = currentSubscription?.plan_id;

    const currentPrice = parseFloat(
      currentSubscription?.plan?.price_monthly || 0,
    );
    const planPrice = parseFloat(plan.price);

    if (currentPlanId === plan.id) {
      return {
        label: "Cancel Plan",
        action: handleCancelPlan,
        class: "btn-cancel",
        isCurrent: true,
      };
    }
    if (isFreeTrial) {
      return {
        label: "Subscribe",
        action: () => handleCheckout(plan.priceId),
        class: "",
        isCurrent: false,
      };
    }
    if (currentSubscription) {
      if (planPrice > currentPrice) {
        return {
          label: "Upgrade",
          action: () => handleCheckout(plan.priceId),
          class: "",
          isCurrent: false,
        };
      } else {
        return {
          label: "Downgrade",
          action: () => handleCheckout(plan.priceId),
          class: "btn-secondary",
          isCurrent: false,
        };
      }
    }
    return {
      label: "Get Started",
      action: () => handleCheckout(plan.priceId),
      class: "",
      isCurrent: false,
    };
  };

  if (loading)
    return (
      <div className="flex-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  const isFreeTrial =
    currentSubscription?.plan?.slug === "free_trial" ||
    currentSubscription?.status === "trialing";

  return (
    <div className="billing-page">
      <h1 className="page-title">Choose Your Plan</h1>
      <div className="page-description">
        <p>Select the perfect plan for your Slack reminder needs.</p>

        {isFreeTrial && (
          <div
            style={{
              backgroundColor: "#fff3cd",
              color: "#856404",
              padding: "10px",
              borderRadius: "5px",
              marginTop: "15px",
              border: "1px solid #ffeeba",
              textAlign: "center",
            }}
          >
            ⚠️ You are using the <strong>Free Trial</strong>. Subscribe to
            remove limits.
          </div>
        )}
      </div>

      <div className="pricing-grid">
        {plans.map((plan) => {
          const config = getCardConfig(plan);

          return (
            <PricingCard
              key={plan.name}
              plan={plan}
              isPopular={plan.popular}
              isCurrent={config.isCurrent}
              actionLabel={config.label}
              onAction={config.action}
              buttonClass={config.class}
              isLoading={
                processingId === plan.priceId || processingId === "cancel"
              }
            />
          );
        })}
      </div>
    </div>
  );
}

// 2. Export a Wrapper Component that uses Suspense
//    This fixes the "useSearchParams() should be wrapped in a suspense boundary" error.
export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-center">
          <Loader2 className="animate-spin" />
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
