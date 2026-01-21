import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 },
      );
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

    // Get auth token from request headers
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // Try to get user from cookies as fallback
      const cookieHeader = request.headers.get("cookie") || "";
      const accessTokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);

      if (!accessTokenMatch) {
        return NextResponse.json(
          { error: "No authentication token found. Please sign in." },
          { status: 401 },
        );
      }

      // Get user using cookie token
      const {
        data: { user },
        error: userError,
      } = await supabaseAdmin.auth.getUser(accessTokenMatch[1]);

      if (userError || !user) {
        return NextResponse.json(
          { error: "Invalid session. Please sign in again." },
          { status: 401 },
        );
      }

      return await createCheckoutSession(user, priceId, supabaseAdmin);
    }

    // Get user using header token
    const token = authHeader.split("Bearer ")[1];
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid token. Please sign in again." },
        { status: 401 },
      );
    }

    return await createCheckoutSession(user, priceId, supabaseAdmin);
  } catch (error) {
    console.error("Checkout API error:", error);
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

// Helper function to create checkout session
async function createCheckoutSession(user, priceId, supabase) {
  // Check existing subscription
  const { data: existingSubscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing", "past_due"])
    .single();

  // Create or retrieve Stripe customer
  let customerId = existingSubscription?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.user_metadata?.full_name || user.email,
      metadata: {
        userId: user.id,
        supabaseUserId: user.id,
      },
    });
    customerId = customer.id;
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    payment_method_types: ["card"],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/billing?canceled=true`,
    metadata: {
      userId: user.id,
      userEmail: user.email,
      supabaseUserId: user.id,
    },
    allow_promotion_codes: true,
    billing_address_collection: "required",
    subscription_data: {
      metadata: {
        userId: user.id,
        supabaseUserId: user.id,
      },
    },
  });

  return NextResponse.json({
    success: true,
    url: session.url,
    sessionId: session.id,
  });
}
