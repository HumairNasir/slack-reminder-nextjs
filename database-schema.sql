-- Database schema for Slack Reminder System
-- Run this in Supabase SQL Editor to create the missing tables

-- Add missing columns to existing reminders table
ALTER TABLE public.reminders
ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(50) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Update existing records to use new column names
UPDATE public.reminders
SET recurrence_pattern = CASE
  WHEN recurrence = 'once' THEN 'none'
  WHEN recurrence IS NOT NULL THEN recurrence
  ELSE 'none'
END
WHERE recurrence_pattern IS NULL;

-- Update status values
UPDATE public.reminders
SET status = CASE
  WHEN status = 'active' THEN 'pending'
  ELSE status
END;

-- Create reminders table (if it doesn't exist with correct structure)
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    connection_id UUID NOT NULL REFERENCES public.slack_connections(id) ON DELETE CASCADE,
    channel_id VARCHAR(255) NOT NULL,
    channel_name VARCHAR(255),
    scheduled_for TIMESTAMPTZ NOT NULL,
    recurrence_pattern VARCHAR(50) DEFAULT 'none', -- 'none', 'daily', 'weekly', 'monthly'
    recurrence_end TIMESTAMPTZ, -- when recurring reminders should stop
    timezone VARCHAR(100) DEFAULT 'UTC',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'cancelled', 'failed'
    is_active BOOLEAN DEFAULT true,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reminder_logs table for tracking sent reminders
CREATE TABLE IF NOT EXISTS public.reminder_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reminder_id UUID NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_id VARCHAR(255),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) NOT NULL, -- 'sent', 'failed'
    error_message TEXT,
    slack_message_ts VARCHAR(255), -- Slack message timestamp
    slack_response JSONB, -- Store the full Slack API response
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_for ON public.reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_reminders_connection_id ON public.reminders(connection_id);
CREATE INDEX IF NOT EXISTS idx_reminders_is_active ON public.reminders(is_active);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_reminder_id ON public.reminder_logs(reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_user_id ON public.reminder_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent_at ON public.reminder_logs(sent_at);

-- Enable Row Level Security (RLS) for existing tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscriptions table
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all subscriptions" ON public.subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for subscription_plans table
CREATE POLICY "Anyone can view subscription plans" ON public.subscription_plans
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage subscription plans" ON public.subscription_plans
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for slack_connections table
CREATE POLICY "Users can view their own connections" ON public.slack_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections" ON public.slack_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" ON public.slack_connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all connections" ON public.slack_connections
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for slack_channels table
CREATE POLICY "Users can view channels for their connections" ON public.slack_channels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.slack_connections
            WHERE slack_connections.id = slack_channels.connection_id
            AND slack_connections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert channels for their connections" ON public.slack_channels
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.slack_connections
            WHERE slack_connections.id = slack_channels.connection_id
            AND slack_connections.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all channels" ON public.slack_channels
    FOR ALL USING (auth.role() = 'service_role');

-- Enable Row Level Security (RLS) for new tables
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reminders table
CREATE POLICY "Users can view their own reminders" ON public.reminders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminders" ON public.reminders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders" ON public.reminders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders" ON public.reminders
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for reminder_logs table
CREATE POLICY "Users can view logs for their reminders" ON public.reminder_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.reminders
            WHERE reminders.id = reminder_logs.reminder_id
            AND reminders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert logs for their reminders" ON public.reminder_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.reminders
            WHERE reminders.id = reminder_logs.reminder_id
            AND reminders.user_id = auth.uid()
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reminders table
CREATE TRIGGER set_reminders_updated_at
    BEFORE UPDATE ON public.reminders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();