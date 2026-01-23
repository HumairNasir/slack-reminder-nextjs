-- Fix RLS Policies for Existing Tables
-- Run this in Supabase SQL Editor to enable RLS and add policies

-- Enable RLS for subscription tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_channels ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Service role can manage subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Users can view their own connections" ON public.slack_connections;
DROP POLICY IF EXISTS "Users can insert their own connections" ON public.slack_connections;
DROP POLICY IF EXISTS "Users can update their own connections" ON public.slack_connections;
DROP POLICY IF EXISTS "Service role can manage all connections" ON public.slack_connections;
DROP POLICY IF EXISTS "Users can view channels for their connections" ON public.slack_channels;
DROP POLICY IF EXISTS "Users can insert channels for their connections" ON public.slack_channels;
DROP POLICY IF EXISTS "Service role can manage all channels" ON public.slack_channels;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Super admins can view all user profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users; -- REMOVE THIS CRITICAL POLICY

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

-- Enable RLS for the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the users table
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Assuming 'user' is the default role for new registrations and preventing self-elevation to super_admin
CREATE POLICY "Enable insert for authenticated users" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id AND role = 'user');

-- Super admins can view all user profiles
CREATE POLICY "Super admins can view all user profiles" ON public.users
    FOR SELECT USING (((SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'));

-- IMPORTANT: The problematic "Admins can view all profiles" (ALL, public) policy
-- should be DELETED manually from the Supabase UI if it exists, as an ALL policy
-- for 'public' is a severe security vulnerability. This script does not recreate it.

-- Enable RLS for the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the users table
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Assuming 'user' is the default role for new registrations and preventing self-elevation to super_admin
CREATE POLICY "Enable insert for authenticated users" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id AND role = 'user');

-- Super admins can view all user profiles
CREATE POLICY "Super admins can view all user profiles" ON public.users
    FOR SELECT USING (((SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'));

-- IMPORTANT: The problematic "Admins can view all profiles" (ALL, public) policy
-- should be DELETED manually from the Supabase UI if it exists, as an ALL policy
-- for 'public' is a severe security vulnerability. This script does not recreate it.