"use client";
import { checkUserLimits } from "@/lib/subscription/checkLimits";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import "./reminder.css";

export default function RemindersPage() {
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function checkLimits() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const limitsData = await checkUserLimits(user.id);
      setLimits(limitsData);
      setCanCreate(limitsData.allowed && limitsData.limits?.canAddReminder);
      setLoading(false);
    }

    checkLimits();
  }, []);

  const handleCreateReminder = () => {
    if (!limits?.allowed) {
      alert("You need an active subscription to create reminders.");
      return;
    }

    if (!limits.limits?.canAddReminder) {
      alert(
        `Plan limit reached! You can only have ${limits.limits.maxReminders} reminders.`,
      );
      return;
    }

    // Redirect to reminder creation form
    // or show form modal
    alert("Opening reminder creation form...");
    // window.location.href = "/dashboard/reminders/create";
  };

  if (loading) {
    return <div className="page-title">Loading...</div>;
  }

  return (
    <div>
      <h1 className="page-title">Reminders</h1>

      {limits && (
        <div className="plan-status">
          <h3>Subscription Status</h3>
          <p>Plan: {limits.allowed ? "Active" : "No active plan"}</p>

          {limits.allowed && (
            <>
              <div className="usage-stats">
                <p>
                  Reminders: {limits.limits.currentReminders} /{" "}
                  {limits.limits.maxReminders}
                </p>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(limits.limits.currentReminders / limits.limits.maxReminders) * 100}%`,
                      backgroundColor: limits.limits.canAddReminder
                        ? "green"
                        : "red",
                    }}
                  />
                </div>
                {!limits.limits.canAddReminder && (
                  <p className="warning">
                    ⚠️ Reminder limit reached! Upgrade your plan.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className="reminder-actions">
        <button
          onClick={handleCreateReminder}
          disabled={!canCreate}
          className={`create-btn ${!canCreate ? "disabled" : ""}`}
        >
          {canCreate ? "➕ Create New Reminder" : "Plan Limit Reached"}
        </button>

        {!limits?.allowed && (
          <p className="error-message">
            You need an active subscription to create reminders.
            <a href="/dashboard/billing"> Upgrade your plan</a>
          </p>
        )}
      </div>

      <div className="reminders-list">
        <h3>Your Reminders</h3>
        <p>No reminders yet. Create your first one!</p>
        {/* Reminders list will go here */}
      </div>
    </div>
  );
}
