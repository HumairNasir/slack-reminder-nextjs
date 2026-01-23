const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Load environment variables from .env.local
const envPath = path.join(__dirname, ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length > 0) {
    const cleanKey = key.trim();
    const cleanValue = valueParts
      .join("=")
      .trim()
      .replace(/^["']|["']$/g, "");
    envVars[cleanKey] = cleanValue;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("❌ Missing Supabase environment variables in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupSubscription() {
  // console.log("🚀 Setting up test subscription for user...\n");
  // console.log("User ID: e2e355f2-d823-4f15-ade9-d9bb4c1311e6");

  try {
    // First, create or update subscription plan
    // console.log("📝 Ensuring subscription plan exists...");
    const { error: planError } = await supabase
      .from("subscription_plans")
      .upsert({
        id: "basic-plan-id",
        name: "Basic Plan",
        description: "Basic reminder plan for development",
        price: 9.99,
        max_channels: 5,
        max_reminders: 10,
        features: ["Basic reminders", "5 channels", "Email support"],
      });

    if (planError) {
      console.log("❌ Error with plan:", planError.message);
    } else {
      console.log("✅ Subscription plan ready");
    }

    // Create or update subscription for the user
    // console.log("📝 Creating/updating subscription...");
    const { error: subError } = await supabase.from("subscriptions").upsert({
      user_id: "e2e355f2-d823-4f15-ade9-d9bb4c1311e6",
      plan_id: "basic-plan-id",
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(), // 30 days from now
    });

    // if (subError) {
    //   console.log("❌ Error with subscription:", subError.message);
    // } else {
    //   console.log("✅ User subscription created/updated");
    // }

    // console.log("\n🎉 Test subscription setup complete!");
    // console.log("🔍 The user should now be able to create reminders.");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

setupSubscription();
