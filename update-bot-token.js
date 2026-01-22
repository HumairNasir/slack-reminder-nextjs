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

  const realBotToken =
    "xoxb-10327840764900-10331541929426-JnkSkThOzneEbJ6S8HqfX1yd";

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
