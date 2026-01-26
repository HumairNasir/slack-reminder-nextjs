import { createClient } from "@supabase/supabase-js";
import { WebClient } from "@slack/web-api";

// ========== SCHEDULER SERVICE ==========

export async function sendDueReminders() {
  // Use Service Role Key to bypass RLS policies so the scheduler sees EVERYTHING
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const now = new Date();

    // 1. Find all ACTIVE reminders that are due
    // We join with slack_connections to get the token
    const { data: dueReminders, error: queryError } = await supabase
      .from("reminders")
      .select(
        `
        *,
        slack_connections (
          bot_token
        )
      `,
      )
      .eq("status", "active") // Only pick up active ones
      .lte("scheduled_for", now.toISOString()); // Due now or in the past

    if (queryError) {
      console.error("Scheduler Query Error:", queryError);
      return { success: false, error: queryError.message };
    }

    if (!dueReminders || dueReminders.length === 0) {
      return { success: true, sent: 0, message: "No due reminders" };
    }

    let totalSent = 0;
    let totalFailed = 0;
    const results = [];

    // 2. Process each reminder independently
    for (const reminder of dueReminders) {
      try {
        console.log(`Processing reminder ${reminder.id}...`);

        // STRICT: Only use bot_token as requested
        const botToken = reminder.slack_connections?.bot_token;

        if (!botToken) {
          throw new Error("No bot_token found for this connection");
        }

        const slack = new WebClient(botToken);

        // A. Send message to Slack
        const result = await slack.chat.postMessage({
          channel: reminder.channel_id,
          text: `*${reminder.title}*\n${reminder.message}`,
          username: "Reminder Bot",
          icon_emoji: "⏰",
        });

        if (result.ok) {
          // B. SUCCESS: Update status to 'sent'
          await supabase
            .from("reminders")
            .update({
              status: "sent",
              updated_at: new Date().toISOString(),
            })
            .eq("id", reminder.id);

          // Log success
          await supabase.from("reminder_logs").insert({
            reminder_id: reminder.id,
            user_id: reminder.user_id,
            channel_id: reminder.channel_id,
            status: "sent",
            slack_message_ts: result.ts,
            sent_at: new Date().toISOString(),
          });

          // C. Handle Recurrence (Create the next one immediately)
          if (reminder.recurrence && reminder.recurrence !== "once") {
            await handleNextOccurrence(supabase, reminder);
          }

          totalSent++;
          results.push({ id: reminder.id, status: "sent" });
        } else {
          throw new Error(`Slack API error: ${result.error}`);
        }
      } catch (error) {
        console.error(`Failed to send reminder ${reminder.id}:`, error.message);

        // D. FAILURE: Mark as 'failed' so we don't retry forever
        await supabase
          .from("reminders")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", reminder.id);

        // Log failure
        await supabase.from("reminder_logs").insert({
          reminder_id: reminder.id,
          user_id: reminder.user_id,
          channel_id: reminder.channel_id,
          status: "failed",
          error_message: error.message,
          sent_at: new Date().toISOString(),
        });

        totalFailed++;
        results.push({
          id: reminder.id,
          status: "failed",
          error: error.message,
        });

        // LOOP CONTINUES -> This failure does NOT stop the next reminder!
      }
    }

    return {
      success: true,
      sent: totalSent,
      failed: totalFailed,
      results,
    };
  } catch (error) {
    console.error("Scheduler Fatal Error:", error);
    return { success: false, error: error.message };
  }
}

// Helper: Calculate and create the NEXT reminder
async function handleNextOccurrence(supabase, previousReminder) {
  try {
    const nextDate = calculateNextOccurrence(
      new Date(previousReminder.scheduled_for),
      previousReminder.recurrence,
    );

    if (nextDate) {
      console.log(
        `Creating next ${previousReminder.recurrence} reminder for ${nextDate.toISOString()}`,
      );

      await supabase.from("reminders").insert({
        title: previousReminder.title,
        message: previousReminder.message,
        scheduled_for: nextDate.toISOString(),
        channel_id: previousReminder.channel_id,
        connection_id: previousReminder.connection_id,
        user_id: previousReminder.user_id,
        recurrence: previousReminder.recurrence,
        status: "active",
        created_at: new Date().toISOString(),
        timezone: previousReminder.timezone,
      });
    }
  } catch (e) {
    console.error("Failed to create next recurring reminder:", e);
  }
}

function calculateNextOccurrence(currentDate, pattern) {
  const next = new Date(currentDate);
  // Add time based on pattern
  switch (pattern) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      return null;
  }
  return next;
}
