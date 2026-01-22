import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { WebClient } from "@slack/web-api";

// Load environment variables
config({ path: ".env.local" });

async function checkBotChannels() {
  console.log("Checking which channels the Slack bot can access...");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    // Get the bot token
    const { data: connections, error } = await supabase
      .from("slack_connections")
      .select("bot_token, team_name")
      .eq("team_name", "TxLabz")
      .limit(1);

    if (error || !connections.length) {
      console.error("No bot token found");
      return;
    }

    const botToken = connections[0].bot_token;
    const slack = new WebClient(botToken);

    // Get list of channels the bot can access
    const result = await slack.conversations.list({
      types: "public_channel,private_channel",
      limit: 100,
    });

    if (result.ok) {
      console.log("✅ Bot can access these channels:");
      result.channels.forEach((channel) => {
        console.log(
          `- #${channel.name} (${channel.id}) - ${channel.is_member ? "✅ Bot is member" : "❌ Bot not in channel"}`,
        );
      });

      // Check specifically for the programmers channel
      const programmersChannel = result.channels.find(
        (c) => c.name === "programmers",
      );
      if (programmersChannel) {
        console.log(
          `\n🎯 Target channel #programmers (${programmersChannel.id}):`,
        );
        console.log(
          `- Bot is member: ${programmersChannel.is_member ? "✅ YES" : "❌ NO"}`,
        );
        if (!programmersChannel.is_member) {
          console.log(
            "\n💡 To fix: Invite the bot to #programmers channel in Slack:",
          );
          console.log("   Type: /invite @Slack Reminder System");
        }
      } else {
        console.log(
          "\n❌ #programmers channel not found in bot's accessible channels",
        );
      }
    } else {
      console.error("Failed to get channels:", result.error);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

checkBotChannels();
