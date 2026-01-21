import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  console.log("=== CHECKOUT API CALLED ===");

  try {
    const body = await request.json();
    console.log("Request body:", body);

    const { priceId } = body;

    if (!priceId) {
      console.error("No priceId provided");
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 },
      );
    }

    // Check environment variables
    console.log(
      "Env check - Supabase URL exists:",
      !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
    console.log(
      "Env check - Service role key exists:",
      !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
    console.log(
      "Env check - Anon key exists:",
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log(
      "Creating Supabase client with URL:",
      supabaseUrl?.substring(0, 30) + "...",
    );

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header
    const authHeader = request.headers.get("authorization");
    console.log("Auth header present:", !!authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("No Bearer token in headers");
      return NextResponse.json(
        { error: "No authentication token provided" },
        { status: 401 },
      );
    }

    const token = authHeader.split("Bearer ")[1];
    console.log("Token length:", token?.length);

    // Get user from token
    console.log("Calling supabase.auth.getUser()...");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Authentication failed: " + authError.message },
        { status: 401 },
      );
    }

    if (!user) {
      console.error("No user found");
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    console.log("User authenticated:", user.email);
    console.log("User ID:", user.id);

    // Check Stripe client
    console.log("Stripe client check:", stripe ? "OK" : "Missing");

    if (!stripe) {
      throw new Error("Stripe client not initialized");
    }

    // Check existing subscription
    console.log("Checking existing subscriptions...");
    const { data: existingSubscription, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .single();

    if (subError && subError.code !== "PGRST116") {
      console.error("Subscription query error:", subError);
    }

    console.log("Existing subscription:", existingSubscription);

    // Create or retrieve Stripe customer
    let customerId = existingSubscription?.stripe_customer_id;

    if (!customerId) {
      console.log("Creating new Stripe customer...");
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
        metadata: {
          userId: user.id,
          supabaseUserId: user.id,
        },
      });
      customerId = customer.id;
      console.log("Created customer:", customerId);
    } else {
      console.log("Using existing customer:", customerId);
    }

    // Create checkout session
    console.log("Creating Stripe checkout session...");
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

    console.log("Checkout session created:", session.id);
    console.log("Checkout URL:", session.url);

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("=== CHECKOUT API ERROR ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    // Check for specific Stripe errors
    if (error.type === "StripeInvalidRequestError") {
      console.error("Stripe error details:", error.raw);
    }

    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error.message,
        type: error.name,
      },
      { status: 500 },
    );
  }
}
