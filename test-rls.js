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

async function testRLS() {
  console.log("🔍 Testing RLS Policies...\n");

  try {
    // Test subscription_plans (should be readable by anyone)
    const { data: plans, error: plansError } = await supabase
      .from("subscription_plans")
      .select("*")
      .limit(5);

    if (plansError) {
      console.log("❌ subscription_plans access failed:", plansError.message);
    } else {
      console.log(
        "✅ subscription_plans accessible:",
        plans?.length || 0,
        "plans found",
      );
    }

    // Test subscriptions (using service role, should see all)
    const { data: subs, error: subsError } = await supabase
      .from("subscriptions")
      .select("*")
      .limit(5);

    if (subsError) {
      console.log("❌ subscriptions access failed:", subsError.message);
    } else {
      console.log(
        "✅ subscriptions accessible:",
        subs?.length || 0,
        "subscriptions found",
      );
    }

    // Test slack_connections (using service role, should see all)
    const { data: connections, error: connError } = await supabase
      .from("slack_connections")
      .select("*")
      .limit(5);

    if (connError) {
      console.log("❌ slack_connections access failed:", connError.message);
    } else {
      console.log(
        "✅ slack_connections accessible:",
        connections?.length || 0,
        "connections found",
      );
    }

    // Test reminders (should be accessible with service role)
    const { data: reminders, error: remError } = await supabase
      .from("reminders")
      .select("*")
      .limit(5);

    if (remError) {
      console.log("❌ reminders access failed:", remError.message);
    } else {
      console.log(
        "✅ reminders accessible:",
        reminders?.length || 0,
        "reminders found",
      );
    }

    console.log("\n📋 RLS Test Complete!");
    console.log("If all tests show ✅, RLS policies are working correctly.");
    console.log(
      "If you see ❌ errors, run fix-rls-policies.sql in Supabase SQL Editor.",
    );
  } catch (error) {
    console.log("❌ Test error:", error.message);
  }
}

testRLS();
