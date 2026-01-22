import { sendDueReminders } from "./src/lib/scheduler/sendReminders.js";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

async function testScheduler() {
  console.log("Testing scheduler directly...");

  try {
    const result = await sendDueReminders();
    console.log("Scheduler result:", result);
  } catch (error) {
    console.error("Scheduler error:", error);
  }
}

testScheduler();
