import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");
  const error = searchParams.get("error");

  // Your Vercel URL
  const appUrl = "https://slack-reminder-nextjs.vercel.app";

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard/slack?error=${error}`);
  }

  if (!code || !userId) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/slack?error=missing_params`,
    );
  }

  try {
    // Exchange code for token
    const response = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: `${appUrl}/api/slack/callback`,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error("Slack OAuth error:", data);
      return NextResponse.redirect(
        `${appUrl}/dashboard/slack?error=${data.error || "oauth_failed"}`,
      );
    }

    // Save to database
    const supabase = await createClient();

    // const { error: dbError } = await supabase.from("slack_connections").insert({
    //   user_id: userId,
    //   team_id: data.team.id,
    //   team_name: data.team.name,
    //   bot_token: Buffer.from(data.access_token).toString("base64"), // Simple encryption
    //   bot_user_id: data.bot_user_id,
    //   is_active: true,
    // });

    // if (dbError) {
    //   console.error("Database error:", dbError);
    //   return NextResponse.redirect(`${appUrl}/dashboard/slack?error=db_error`);
    // }

    // // Success!
    // return NextResponse.redirect(`${appUrl}/dashboard/slack?success=true`);
    // ... inside the try block ...

    // 3. Save to Supabase
    const { error: dbError } = await supabase.from("slack_connections").upsert(
      {
        user_id: user.id,
        slack_user_id: authed_user.id,
        team_id: team.id,
        team_name: team.name,
        access_token: access_token,
        bot_token: access_token,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id, team_id" }, // This REQUIRES the SQL index from Step 1
    );

    if (dbError) {
      // 👇 CRITICAL: Log this so you can see it in Vercel Dashboard -> Logs
      console.error("FULL DATABASE ERROR:", JSON.stringify(dbError, null, 2));

      // Pass the actual error message to the URL so you can read it on the frontend
      return NextResponse.redirect(
        `${requestUrl.origin}/dashboard/slack?error=db_error&details=${encodeURIComponent(dbError.message)}`,
      );
    }
  } catch (error) {
    console.error("Slack OAuth catch error:", error);
    return NextResponse.redirect(
      `${appUrl}/dashboard/slack?error=server_error`,
    );
  }
}
