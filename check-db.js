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

async function checkTables() {
  console.log("🔍 Checking database tables...\n");

  try {
    // Check if reminders table exists
    const { data: reminders, error: remindersError } = await supabase
      .from("reminders")
      .select("*")
      .limit(1);

    if (remindersError && remindersError.code === "PGRST116") {
      console.log("❌ reminders table does NOT exist");
    } else if (remindersError) {
      console.log("❌ Error checking reminders table:", remindersError.message);
    } else {
      console.log("✅ reminders table exists");
    }

    // Check if reminder_logs table exists
    const { data: logs, error: logsError } = await supabase
      .from("reminder_logs")
      .select("*")
      .limit(1);

    if (logsError && logsError.code === "PGRST116") {
      console.log("❌ reminder_logs table does NOT exist");
    } else if (logsError) {
      console.log("❌ Error checking reminder_logs table:", logsError.message);
    } else {
      console.log("✅ reminder_logs table exists");
    }

    // Check existing tables
    console.log("\n📋 Checking other required tables...");

    const tablesToCheck = [
      "users",
      "subscriptions",
      "subscription_plans",
      "slack_connections",
      "slack_channels",
    ];

    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase.from(table).select("*").limit(1);
        if (error && error.code === "PGRST116") {
          console.log(`❌ ${table} table does NOT exist`);
        } else if (error) {
          console.log(`❌ Error checking ${table}:`, error.message);
        } else {
          console.log(`✅ ${table} table exists`);
        }
      } catch (err) {
        console.log(`❌ Error checking ${table}:`, err.message);
      }
    }
  } catch (error) {
    console.log("❌ Connection error:", error.message);
  }
}

checkTables();
