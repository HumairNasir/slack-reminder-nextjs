import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

async function updateDatabaseSchema() {
  console.log("Updating database schema...");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    console.log("Fixing reminder statuses from 'active' to 'pending'...");

    // Update status from 'active' to 'pending'
    const { data, error: updateError } = await supabase
      .from("reminders")
      .update({ status: "pending" })
      .eq("status", "active")
      .select();

    if (updateError) {
      console.error("Error updating statuses:", updateError);
    } else {
      console.log(
        `Updated ${data?.length || 0} reminders from 'active' to 'pending'`,
      );
    }

    console.log(
      "\n⚠️  IMPORTANT: You need to add missing columns manually in Supabase SQL Editor:",
    );
    console.log(`
-- Run this in your Supabase SQL Editor:
ALTER TABLE public.reminders
ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(50) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Then update existing records:
UPDATE public.reminders
SET recurrence_pattern = CASE
  WHEN recurrence = 'once' THEN 'none'
  WHEN recurrence IS NOT NULL THEN recurrence
  ELSE 'none'
END
WHERE recurrence_pattern IS NULL;
    `);

    // Test if we can now query with the expected structure (even though columns don't exist yet)
    console.log("\nTesting current query structure...");
    const { data: testData, error: testError } = await supabase
      .from("reminders")
      .select("*")
      .eq("status", "pending")
      .limit(1);

    if (testError) {
      console.error("Test query failed:", testError);
    } else {
      console.log("Status fix successful. Sample reminder:", testData[0]);
    }
  } catch (error) {
    console.error("Schema update error:", error);
  }
}

updateDatabaseSchema();
