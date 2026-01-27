import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createClient } from "@supabase/supabase-js";

// ========== HELPER: ROBUST UPSERT & STATUS PROTECTION ==========
async function upsertSubscription(subscription, supabase) {
  const priceId = subscription.items.data[0].price.id;

  // 1. Try to find User ID from Metadata
  let userId =
    subscription.metadata?.userId || subscription.metadata?.supabaseUserId;

  // 2. Fallback: Look up User ID by Stripe Customer ID
  if (!userId) {
    const { data: customerMatch } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", subscription.customer)
      .limit(1)
      .single();

    if (customerMatch) {
      userId = customerMatch.user_id;
    } else {
      console.error("❌ CRITICAL: No User ID found for sub:", subscription.id);
      return;
    }
  }

  // 3. Find Plan ID
  let planId = null;
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id")
    .eq("stripe_price_id", priceId)
    .single();
  if (plan) planId = plan.id;

  // 4. CHECK EXISTING STATUS (The Fix 🛡️)
  // We fetch the current status in DB to prevent overwriting 'active' with 'incomplete'
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  let newStatus = subscription.status;

  // 🛡️ PROTECTION: If DB is already 'active', DO NOT downgrade to 'incomplete'
  if (
    existingSub?.status === "active" &&
    subscription.status === "incomplete"
  ) {
    console.log(`🛡️ Ignoring stale 'incomplete' status. Keeping 'active'.`);
    newStatus = "active";
  }

  // 5. Safe Date Handling
  const startDate = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000)
    : new Date();
  const endDate = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // 6. AUTO-CANCEL OLD SUBSCRIPTIONS
  if (newStatus === "active") {
    await supabase
      .from("subscriptions")
      .update({ status: "canceled", updated_at: new Date() })
      .eq("user_id", userId)
      .neq("stripe_subscription_id", subscription.id)
      .in("status", ["active", "trialing", "past_due"]);

    console.log(`🧹 Cleaned up old subscriptions for user ${userId}`);
  }

  // 7. UPSERT FINAL DATA
  await supabase.from("subscriptions").upsert({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    plan_id: planId,
    status: newStatus,
    current_period_start: startDate,
    current_period_end: endDate,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    updated_at: new Date(),
  });

  console.log(`✅ Processed: ${subscription.id} -> ${newStatus}`);
}

// ========== EVENT HANDLERS (Unchanged) ==========

async function handleCheckoutCompleted(session, supabase) {
  try {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription,
    );
    subscription.metadata = { ...subscription.metadata, ...session.metadata };
    await upsertSubscription(subscription, supabase);
  } catch (error) {
    console.error("Checkout Error:", error.message);
  }
}

async function handleSubscriptionUpdate(subscription, supabase) {
  await upsertSubscription(subscription, supabase);
}

async function handleInvoicePaymentSucceeded(invoice, supabase) {
  if (!invoice.subscription) return;
  try {
    const subscription = await stripe.subscriptions.retrieve(
      invoice.subscription,
    );
    // ⚡ FORCE ACTIVE: Payment succeeded, so it IS active, even if API says otherwise
    subscription.status = "active";
    await upsertSubscription(subscription, supabase);
  } catch (error) {
    console.error("Invoice Payment Error:", error.message);
  }
}

async function handleSubscriptionCancel(subscription, supabase) {
  await supabase
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date() })
    .eq("stripe_subscription_id", subscription.id);
}

// ========== MAIN WEBHOOK ROUTE ==========

export async function POST(request) {
  const signature = request.headers.get("stripe-signature");
  let body;
  try {
    body = await request.text();
  } catch (err) {
    return NextResponse.json({ error: "Body" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 },
    );
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, supabaseAdmin);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object, supabaseAdmin);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object, supabaseAdmin);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionCancel(event.data.object, supabaseAdmin);
        break;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook Handler Failed:", error.message);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
