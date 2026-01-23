// console.log("Script starting...");

// const fs = require("fs");
// const path = require("path");
// const { createClient } = require("@supabase/supabase-js");

// console.log("Modules loaded...");

// // Load environment variables from .env.local
// const envPath = path.join(__dirname, ".env.local");
// const envContent = fs.readFileSync(envPath, "utf8");
// const envVars = {};

// envContent.split("\n").forEach((line) => {
//   const [key, ...valueParts] = line.split("=");
//   if (key && valueParts.length > 0) {
//     const cleanKey = key.trim();
//     const cleanValue = valueParts
//       .join("=")
//       .trim()
//       .replace(/^["']|["']$/g, "");
//     envVars[cleanKey] = cleanValue;
//   }
// });

// const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

// if (!supabaseUrl || !supabaseKey) {
//   console.log("❌ Missing Supabase environment variables in .env.local");
//   process.exit(1);
// }

// const supabase = createClient(supabaseUrl, supabaseKey);

// async function runTestData() {
//   console.log("🚀 Running test data setup...\n");
//   console.log("Supabase URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
//   console.log("Supabase Key:", supabaseKey ? "✅ Set" : "❌ Missing");
//   console.log();

//   try {
//     // Insert a basic subscription plan
//     console.log("📝 Creating subscription plan...");
//     const { error: planError } = await supabase
//       .from("subscription_plans")
//       .upsert({
//         id: "basic-plan-id",
//         name: "Basic Plan",
//         description: "Basic reminder plan",
//         price: 9.99,
//         max_channels: 5,
//         max_reminders: 10,
//         features: ["Basic reminders", "5 channels", "Email support"],
//       });

//     if (planError) {
//       console.log("❌ Error creating plan:", planError.message);
//     } else {
//       console.log("✅ Subscription plan created");
//     }

//     // Insert a test subscription for the user
//     console.log("📝 Creating test subscription...");
//     const { error: subError } = await supabase.from("subscriptions").upsert({
//       user_id: "e2e355f2-d823-4f15-ade9-d9bb4c1311e6",
//       plan_id: "basic-plan-id",
//       status: "active",
//       current_period_start: new Date().toISOString(),
//       current_period_end: new Date(
//         Date.now() + 30 * 24 * 60 * 60 * 1000,
//       ).toISOString(), // 30 days from now
//     });

//     if (subError) {
//       console.log("❌ Error creating subscription:", subError.message);
//     } else {
//       console.log("✅ Test subscription created");
//     }

//     // Insert a test Slack connection
//     console.log("📝 Creating test Slack connection...");
//     const { error: connError } = await supabase
//       .from("slack_connections")
//       .upsert({
//         user_id: "e2e355f2-d823-4f15-ade9-d9bb4c1311e6",
//         slack_user_id: "test-slack-user",
//         slack_team_id: "test-team",
//         access_token: "test-token",
//         team_name: "Test Team",
//         is_active: true,
//       });

//     if (connError) {
//       console.log("❌ Error creating connection:", connError.message);
//     } else {
//       console.log("✅ Test Slack connection created");
//     }

//     // Get the connection ID and create a test channel
//     const { data: connection } = await supabase
//       .from("slack_connections")
//       .select("id")
//       .eq("user_id", "e2e355f2-d823-4f15-ade9-d9bb4c1311e6")
//       .single();

//     if (connection) {
//       console.log("📝 Creating test Slack channel...");
//       const { error: channelError } = await supabase
//         .from("slack_channels")
//         .upsert({
//           connection_id: connection.id,
//           slack_channel_id: "C1234567890",
//           name: "general",
//           is_private: false,
//         });

//       if (channelError) {
//         console.log("❌ Error creating channel:", channelError.message);
//       } else {
//         console.log("✅ Test Slack channel created");
//       }
//     }

//     console.log("\n🎉 Test data setup complete!");
//     console.log("🔍 You can now test the reminder creation functionality.");
//   } catch (error) {
//     console.error("❌ Error running test data:", error);
//   }
// }

// runTestData();
