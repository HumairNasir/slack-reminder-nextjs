import { createClient } from "@supabase/supabase-js";
import { WebClient } from "@slack/web-api";

// ========== SCHEDULER SERVICE ==========

/**
 * Main function to send all due reminders
 * Called by cron job every minute
 */
export async function sendDueReminders() {
  // console.log("=== SCHEDULER: Starting reminder check ===");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    // 1. Find all reminders that are due now
    const now = new Date();
    // console.log("Checking for reminders due before:", now.toISOString());

    // First, get due reminders
    // Note: is_active column will be added via schema update
    const { data: dueReminders, error: queryError } = await supabase
      .from("reminders")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now.toISOString());

    if (queryError) {
      console.error("Query error:", queryError);
      return { success: false, error: queryError.message };
    }

    // console.log(`Found ${dueReminders?.length || 0} due reminders`);

    if (!dueReminders || dueReminders.length === 0) {
      return { success: true, sent: 0, message: "No due reminders" };
    }

    // 2. Get Slack connections for these reminders
    const connectionIds = [
      ...new Set(dueReminders.map((r) => r.connection_id)),
    ];
    const { data: connections, error: connError } = await supabase
      .from("slack_connections")
      .select("id, bot_token, team_id, is_active")
      .in("id", connectionIds)
      .eq("is_active", true);

    if (connError) {
      console.error("Connection query error:", connError);
      return { success: false, error: connError.message };
    }

    // Create a map of connection data
    const connectionMap = {};
    connections.forEach((conn) => {
      connectionMap[conn.id] = conn;
    });

    // Filter reminders to only those with valid connections
    const validReminders = dueReminders.filter(
      (reminder) => connectionMap[reminder.connection_id],
    );

    // console.log(`Valid reminders with connections: ${validReminders.length}`);

    // 2. Group reminders by user to batch API calls
    const remindersByUser = {};
    validReminders.forEach((reminder) => {
      const connection = connectionMap[reminder.connection_id];
      if (!remindersByUser[reminder.user_id]) {
        remindersByUser[reminder.user_id] = {
          bot_token: connection.bot_token,
          reminders: [],
        };
      }
      remindersByUser[reminder.user_id].reminders.push(reminder);
    });

    // 3. Send reminders for each user
    let totalSent = 0;
    let totalFailed = 0;
    const results = [];

    for (const [userId, userData] of Object.entries(remindersByUser)) {
      const { bot_token, reminders } = userData;
      const slack = new WebClient(bot_token);

      for (const reminder of reminders) {
        try {
          console.log(
            `Sending reminder ${reminder.id} to channel ${reminder.channel_id}`,
          );

          // Send message to Slack
          const result = await slack.chat.postMessage({
            channel: reminder.channel_id,
            text: `*${reminder.title}*\n${reminder.message}`,
            username: "Reminder Bot",
            icon_emoji: "⏰",
          });

          if (result.ok) {
            // Update reminder status to sent
            await supabase
              .from("reminders")
              .update({
                status: "sent",
                updated_at: new Date().toISOString(),
              })
              .eq("id", reminder.id);

            // Log successful send
            await supabase.from("reminder_logs").insert({
              reminder_id: reminder.id,
              user_id: userId,
              channel_id: reminder.channel_id,
              status: "sent",
              slack_message_ts: result.ts,
              sent_at: new Date().toISOString(),
            });

            totalSent++;
            results.push({
              reminderId: reminder.id,
              status: "sent",
              channel: reminder.channel_id,
            });
          } else {
            throw new Error(`Slack API error: ${result.error}`);
          }
        } catch (error) {
          console.error(
            `Failed to send reminder ${reminder.id}:`,
            error.message,
          );

          // Update reminder status to failed
          await supabase
            .from("reminders")
            .update({
              status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", reminder.id);

          // Log failed send
          await supabase.from("reminder_logs").insert({
            reminder_id: reminder.id,
            user_id: userId,
            channel_id: reminder.channel_id,
            status: "failed",
            error_message: error.message,
            sent_at: new Date().toISOString(),
          });

          totalFailed++;
          results.push({
            reminderId: reminder.id,
            status: "failed",
            error: error.message,
          });
        }
      }
    }

    console.log(
      `=== SCHEDULER: Completed - Sent: ${totalSent}, Failed: ${totalFailed} ===`,
    );

    return {
      success: true,
      sent: totalSent,
      failed: totalFailed,
      results,
    };
  } catch (error) {
    console.error("Scheduler error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle recurring reminders by creating next occurrence
 */
export async function handleRecurringReminders() {
  // console.log("=== HANDLING RECURRING REMINDERS ===");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    // Find completed recurring reminders
    const { data: completedRecurring, error } = await supabase
      .from("reminders")
      .select(
        "id, recurrence, scheduled_for, title, message, channel_id, user_id",
      )
      .eq("status", "sent")
      .not("recurrence", "is", null)
      .not("recurrence", "eq", "once");

    if (error) {
      console.error("Error fetching recurring reminders:", error);
      return { success: false, error: error.message };
    }

    let created = 0;
    for (const reminder of completedRecurring) {
      try {
        const nextScheduled = calculateNextOccurrence(
          new Date(reminder.scheduled_for),
          reminder.recurrence_pattern,
        );

        if (nextScheduled) {
          // Create next occurrence
          await supabase.from("reminders").insert({
            title: reminder.title,
            message: reminder.message,
            scheduled_for: nextScheduled.toISOString(),
            channel_id: reminder.channel_id,
            user_id: reminder.user_id,
            recurrence: reminder.recurrence,
            status: "active",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          created++;
        }
      } catch (recurringError) {
        console.error(
          `Error creating recurring reminder for ${reminder.id}:`,
          recurringError,
        );
      }
    }

    // console.log(`Created ${created} recurring reminder instances`);
    return { success: true, created };
  } catch (error) {
    console.error("Recurring reminders error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate next occurrence based on recurrence pattern
 */
function calculateNextOccurrence(currentDate, pattern) {
  const next = new Date(currentDate);

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
      return null; // No recurrence or 'once'
  }

  return next;
}
