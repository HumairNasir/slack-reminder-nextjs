-- Test data for development
-- Run this in Supabase SQL Editor to create test subscriptions

-- Insert a basic subscription plan
INSERT INTO public.subscription_plans (id, name, description, price, max_channels, max_reminders, features)
VALUES
  ('basic-plan-id', 'Basic Plan', 'Basic reminder plan', 9.99, 5, 10, '["Basic reminders", "5 channels", "Email support"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insert a test subscription for the user (replace with actual user ID)
-- User ID from logs: e2e355f2-d823-4f15-ade9-d9bb4c1311e6
INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
VALUES
  ('e2e355f2-d823-4f15-ade9-d9bb4c1311e6', 'basic-plan-id', 'active', NOW(), NOW() + INTERVAL '1 month')
ON CONFLICT (user_id) DO UPDATE SET
  status = 'active',
  current_period_end = NOW() + INTERVAL '1 month';

-- Insert a test Slack connection for the user
INSERT INTO public.slack_connections (user_id, slack_user_id, slack_team_id, access_token, team_name, is_active)
VALUES
  ('e2e355f2-d823-4f15-ade9-d9bb4c1311e6', 'test-slack-user', 'test-team', 'test-token', 'Test Team', true)
ON CONFLICT (user_id) DO NOTHING;

-- Insert a test Slack channel
INSERT INTO public.slack_channels (connection_id, slack_channel_id, name, is_private)
SELECT
  sc.id,
  'C1234567890',
  'general',
  false
FROM public.slack_connections sc
WHERE sc.user_id = 'e2e355f2-d823-4f15-ade9-d9bb4c1311e6'
ON CONFLICT (connection_id, slack_channel_id) DO NOTHING;