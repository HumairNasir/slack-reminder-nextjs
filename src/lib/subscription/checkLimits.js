// Client-side function that calls the API route with user ID
export async function checkUserLimits(userId) {
  try {
    // Call the API route with user ID as query parameter
    // ADDED: cache: "no-store" to ensure we get fresh data after deletions
    const response = await fetch(
      `/api/subscription/check-limits?userId=${userId}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch limits");
    }

    const result = await response.json();

    if (result.success) {
      return result.data;
    }

    throw new Error(result.error || "Unknown API error");
  } catch (error) {
    console.error("checkUserLimits error:", error);
    // Return safe default so UI doesn't crash
    return {
      allowed: false,
      plan: null,
      limits: {
        maxChannels: 0,
        maxReminders: 0,
        currentChannels: 0,
        currentReminders: 0,
        canAddChannel: false,
        canAddReminder: false,
      },
    };
  }
}
