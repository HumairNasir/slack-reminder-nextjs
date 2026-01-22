import { NextResponse } from "next/server";
import {
  sendDueReminders,
  handleRecurringReminders,
} from "@/lib/scheduler/sendReminders";

console.log("Scheduler API route loaded successfully");

export async function GET(request) {
  console.log("=== SCHEDULER API: Received request ===");

  try {
    // Check environment variables
    console.log("Environment check:");
    console.log(
      "- SUPABASE_URL:",
      process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing",
    );
    console.log(
      "- SUPABASE_KEY:",
      process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ Set" : "❌ Missing",
    );

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error("❌ Environment variables not loaded");
      return NextResponse.json(
        { success: false, error: "Environment variables not configured" },
        { status: 500 },
      );
    }

    // Run the scheduler
    const result = await sendDueReminders();

    // Handle recurring reminders
    const recurringResult = await handleRecurringReminders();

    const response = {
      success: result.success,
      sent: result.sent || 0,
      failed: result.failed || 0,
      recurringCreated: recurringResult.created || 0,
      timestamp: new Date().toISOString(),
      results: result.results || [],
    };

    console.log("=== SCHEDULER API: Completed ===", response);

    return NextResponse.json(response, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error("Scheduler API error:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// Optional: POST endpoint for manual triggering
export async function POST(request) {
  console.log("=== SCHEDULER API: Manual trigger ===");

  try {
    const result = await sendDueReminders();
    const recurringResult = await handleRecurringReminders();

    return NextResponse.json({
      success: result.success,
      sent: result.sent || 0,
      failed: result.failed || 0,
      recurringCreated: recurringResult.created || 0,
      timestamp: new Date().toISOString(),
      manual: true,
    });
  } catch (error) {
    console.error("Manual scheduler error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
