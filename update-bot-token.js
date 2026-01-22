import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

async function updateBotToken() {
  console.log("Updating Slack bot token...");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // SECURITY: Get token from environment variable instead of hardcoding
  const realBotToken = process.env.SLACK_BOT_TOKEN;

  if (!realBotToken) {
    console.error("❌ SLACK_BOT_TOKEN environment variable not set!");
    console.log("Set it in your .env.local file:");
    console.log("SLACK_BOT_TOKEN=xoxb-your-bot-token-here");
    return;
  }

  try {
    // Update the bot token for the existing connection
    const { data, error } = await supabase
      .from("slack_connections")
      .update({ bot_token: realBotToken })
      .eq("team_name", "TxLabz") // Update the TxLabz connection
      .select();

    if (error) {
      console.error("Error updating bot token:", error);
    } else {
      console.log("✅ Bot token updated successfully");
      console.log("Updated connections:", data);
    }
  } catch (error) {
    console.error("Update error:", error);
  }
}

updateBotToken();
