// import { NextResponse } from "next/server";
// import { createClient } from "@/lib/supabase/server";

// export async function GET(request) {
//   const { searchParams } = new URL(request.url);
//   const code = searchParams.get("code");
//   const userId = searchParams.get("state");
//   const error = searchParams.get("error");

//   // Your Vercel URL
//   const appUrl = "https://slack-reminder-nextjs.vercel.app";

//   if (error) {
//     return NextResponse.redirect(`${appUrl}/dashboard/slack?error=${error}`);
//   }

//   if (!code || !userId) {
//     return NextResponse.redirect(
//       `${appUrl}/dashboard/slack?error=missing_params`,
//     );
//   }

//   try {
//     // Exchange code for token
//     const response = await fetch("https://slack.com/api/oauth.v2.access", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/x-www-form-urlencoded",
//       },
//       body: new URLSearchParams({
//         client_id: process.env.NEXT_PUBLIC_SLACK_CLIENT_ID,
//         client_secret: process.env.SLACK_CLIENT_SECRET,
//         code,
//         redirect_uri: `${appUrl}/api/slack/callback`,
//       }),
//     });

//     const data = await response.json();

//     if (!data.ok) {
//       console.error("Slack OAuth error:", data);
//       return NextResponse.redirect(
//         `${appUrl}/dashboard/slack?error=${data.error || "oauth_failed"}`,
//       );
//     }

//     // Save to database
//     const supabase = await createClient();

//     // const { error: dbError } = await supabase.from("slack_connections").insert({
//     //   user_id: userId,
//     //   team_id: data.team.id,
//     //   team_name: data.team.name,
//     //   bot_token: Buffer.from(data.access_token).toString("base64"), // Simple encryption
//     //   bot_user_id: data.bot_user_id,
//     //   is_active: true,
//     // });

//     // if (dbError) {
//     //   console.error("Database error:", dbError);
//     //   return NextResponse.redirect(`${appUrl}/dashboard/slack?error=db_error`);
//     // }

//     // // Success!
//     // return NextResponse.redirect(`${appUrl}/dashboard/slack?success=true`);
//     // ... inside the try block ...

//     // 3. Save to Supabase
//     const { error: dbError } = await supabase.from("slack_connections").upsert(
//       {
//         user_id: user.id,
//         slack_user_id: authed_user.id,
//         team_id: team.id,
//         team_name: team.name,
//         access_token: access_token,
//         bot_token: access_token,
//         is_active: true,
//         updated_at: new Date().toISOString(),
//       },
//       { onConflict: "user_id, team_id" }, // This REQUIRES the SQL index from Step 1
//     );

//     if (dbError) {
//       // 👇 CRITICAL: Log this so you can see it in Vercel Dashboard -> Logs
//       console.error("FULL DATABASE ERROR:", JSON.stringify(dbError, null, 2));

//       // Pass the actual error message to the URL so you can read it on the frontend
//       return NextResponse.redirect(
//         `${requestUrl.origin}/dashboard/slack?error=db_error&details=${encodeURIComponent(dbError.message)}`,
//       );
//     }
//   } catch (error) {
//     console.error("Slack OAuth catch error:", error);
//     return NextResponse.redirect(
//       `${appUrl}/dashboard/slack?error=server_error`,
//     );
//   }
// }
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");

  // Use a relative path for the redirect to support both localhost and production
  const next = "/dashboard/slack";
  const origin = requestUrl.origin; // e.g., http://localhost:3000

  if (error) {
    return NextResponse.redirect(`${origin}${next}?error=access_denied`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}${next}?error=missing_params`);
  }

  try {
    const supabase = await createClient();

    // ---------------------------------------------------------
    // 1. DEFINE 'user' HERE (CRITICAL STEP)
    // ---------------------------------------------------------
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Check immediately if 'user' is missing
    if (authError || !user) {
      console.error("Auth Error - User not found:", authError);
      return NextResponse.redirect(`${origin}${next}?error=unauthorized`);
    }

    // ---------------------------------------------------------
    // 2. Exchange Code for Token
    // ---------------------------------------------------------
    const client = new WebClient();
    const result = await client.oauth.v2.access({
      client_id: process.env.NEXT_PUBLIC_SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code: code,
      redirect_uri: `${origin}/api/slack/callback`,
    });

    if (!result.ok) {
      console.error("Slack OAuth Failed:", result.error);
      return NextResponse.redirect(`${origin}${next}?error=oauth_failed`);
    }

    const { team, authed_user, access_token } = result;

    // ---------------------------------------------------------
    // 3. Save to DB (Now 'user.id' is guaranteed to exist)
    // ---------------------------------------------------------
    const { error: dbError } = await supabase.from("slack_connections").upsert(
      {
        user_id: user.id, // <--- This is where it was likely failing before
        slack_user_id: authed_user.id,
        team_id: team.id,
        team_name: team.name,
        access_token: access_token,
        bot_token: access_token,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id, team_id" },
    );

    if (dbError) {
      console.error("Database Error:", dbError);
      return NextResponse.redirect(`${origin}${next}?error=db_error`);
    }

    // Success
    return NextResponse.redirect(`${origin}${next}?success=true`);
  } catch (err) {
    // Note: 'user' is NOT available here in the catch block
    console.error("Slack OAuth catch error:", err);
    return NextResponse.redirect(`${origin}${next}?error=server_error`);
  }
}
