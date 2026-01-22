// Client-side function that calls the API route with user ID
export async function checkUserLimits(userId) {
  console.log("=== checkUserLimits START ===");
  console.log("Input userId:", userId);

  try {
    console.log(
      "Making API call to /api/subscription/check-limits with userId:",
      userId,
    );

    // Call the API route with user ID as query parameter
    const response = await fetch(
      `/api/subscription/check-limits?userId=${userId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    console.log("API response status:", response.status);
    console.log("API response ok:", response.ok);

    let result;
    try {
      result = await response.json();
      console.log("API response data:", result);
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      throw new Error("Invalid JSON response from API");
    }

    if (!response.ok) {
      console.error("API error:", result.error);
      throw new Error(`API error: ${result.error || "Unknown error"}`);
    }

    console.log("=== checkUserLimits END ===");
    console.log("Final result:", result.data);

    return result.data;
  } catch (error) {
    console.error("checkUserLimits error:", error);
    console.error("Error details:", error.message);
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
