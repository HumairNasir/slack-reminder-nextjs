import { WebClient } from "@slack/web-api";

export function createSlackClient(botToken) {
  return new WebClient(botToken);
}

// For getting Slack OAuth URL
export function getSlackOAuthUrl(userId, redirectUri) {
  const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
  const scopes = [
    "channels:read",
    "channels:manage",
    "chat:write",
    "groups:read",
    "im:read",
    "mpim:read",
  ].join(",");

  const params = new URLSearchParams({
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state: userId, // To identify user after OAuth
    user_scope: "",
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}
