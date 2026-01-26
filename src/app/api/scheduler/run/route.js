import { NextResponse } from "next/server";
// Ensure the path and filename match exactly where you saved the helper file
import { sendDueReminders } from "@/lib/scheduler/sendReminders";

// Force dynamic prevents Vercel from caching the result
export const dynamic = "force-dynamic";

export async function GET(request) {
  console.log("=== SCHEDULER API: Received request ===");

  try {
    // 1. Run the scheduler (Recurrence is now handled INSIDE this function)
    const result = await sendDueReminders();

    const response = {
      success: result.success,
      sent: result.sent || 0,
      failed: result.failed || 0,
      timestamp: new Date().toISOString(),
      results: result.results || [],
    };

    console.log("=== SCHEDULER API: Completed ===", response);

    return NextResponse.json(response, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error("Scheduler API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// POST endpoint for manual triggering

export async function POST(request) {
  console.log("=== SCHEDULER API: Manual trigger (POST) ===");
  return GET(request);
}
