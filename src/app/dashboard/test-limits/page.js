"use client";

import { checkUserLimits } from "@/lib/subscription/checkLimits";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function TestLimitsPage() {
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function testLimits() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log("=== DEBUG ===");
      console.log("Logged in user ID:", user?.id);
      console.log("User email:", user?.email);

      if (!user) {
        setLimits({ allowed: false, reason: "Not logged in" });
        setLoading(false);
        return;
      }

      console.log("Calling checkUserLimits with ID:", user.id);
      const result = await checkUserLimits(user.id);
      console.log("Result from checkUserLimits:", result);

      setLimits(result);
      setLoading(false);
    }

    testLimits();
  }, []);

  if (loading) return <div>Loading limits...</div>;

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>Plan Limits Test</h1>
      <pre>{JSON.stringify(limits, null, 2)}</pre>

      {limits && (
        <>
          <h2>Interpretation:</h2>
          <ul>
            <li>Allowed: {limits.allowed ? "✅ YES" : "❌ NO"}</li>
            <li>Reason: {limits.reason || "N/A"}</li>
            {limits.allowed && limits.limits && (
              <>
                <li>Max Channels: {limits.limits.maxChannels}</li>
                <li>Max Reminders: {limits.limits.maxReminders}</li>
                <li>
                  Can Add Channel:{" "}
                  {limits.limits.canAddChannel ? "✅ YES" : "❌ NO"}
                </li>
                <li>
                  Can Add Reminder:{" "}
                  {limits.limits.canAddReminder ? "✅ YES" : "❌ NO"}
                </li>
              </>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
