# Slack Reminder System

A modern, full-featured Slack reminder scheduling application built with Next.js 16, featuring real-time data updates, responsive design, and seamless Slack integration.

## 🚀 Features

### Core Functionality

- **Reminder Scheduling**: Create one-time or recurring reminders with flexible date/time selection
- **Slack Integration**: Connect multiple Slack workspaces and send reminders to specific channels
- **Real-time Updates**: Live dashboard with current reminder counts and connection status
- **Subscription Management**: Multiple pricing tiers with Stripe integration
- **Responsive Design**: Mobile-first design that works perfectly on all devices

### User Experience

- **Modern UI**: Clean, intuitive interface with smooth animations
- **Mobile Responsive**: Adaptive sidebar that collapses on smaller screens
- **Real-time Stats**: Live updates for active reminders and Slack connections
- **Dark/Light Themes**: Consistent design system throughout the application

### Technical Features

- **Row Level Security**: Secure database access with Supabase RLS policies
- **API Routes**: RESTful endpoints for reminders, subscriptions, and Slack integration
- **Authentication**: Secure user authentication with Supabase Auth
- **Payment Processing**: Stripe integration for subscription management

## 🛠️ Technology Stack

- **Frontend**: Next.js 16 with React 19, CSS
- **Backend**: Next.js API Routes, Supabase (Database + Auth)
- **External APIs**: Slack Web API, Stripe Payments
- **Styling**: CSS with custom components
- **Date Handling**: date-fns for scheduling and time zones
- **Icons**: Lucide React icons

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── reminders/     # Reminder CRUD operations
│   │   ├── slack/         # Slack OAuth and channels
│   │   └── stripe/        # Payment processing
│   ├── dashboard/         # Protected dashboard pages
│   │   ├── reminders/     # Reminder management
│   │   ├── billing/       # Subscription management
│   │   └── slack/         # Slack connection setup
│   └── login/register/    # Authentication pages
├── components/            # Reusable UI components
│   ├── stripe/           # Pricing and payment components
│   ├── slack/            # Slack integration components
│   └── ui/               # Core UI components (header, sidebar)
├── context/              # React context providers
├── hooks/                # Custom React hooks
└── lib/                  # Utility libraries
    ├── slack/           # Slack API helpers
    ├── stripe/          # Stripe integration
    ├── subscription/    # Subscription management
    └── supabase/        # Database client and utilities
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Slack App credentials
- Stripe account

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd slack-reminder-system
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   cp .env.local.example .env.local
   ```

   Update `.env.local` with your credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SLACK_CLIENT_ID=your_slack_client_id
   SLACK_CLIENT_SECRET=your_slack_client_secret
   STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_webhook_secret
   ```

4. **Database Setup**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the SQL commands from `database-schema.sql`
   - Run `fix-rls-policies.sql` if you have existing data

5. **Start Development Server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## 📊 Database Schema

### Core Tables

- `users` - User accounts and profiles
- `subscriptions` - User subscription data
- `subscription_plans` - Available pricing plans
- `reminders` - Scheduled reminders
- `reminder_logs` - Sent reminder history
- `slack_connections` - Slack workspace connections
- `slack_channels` - Available Slack channels

### Security

- Row Level Security (RLS) enabled on all tables
- Service role key used for admin operations
- Client-side operations respect user permissions

## 🔧 API Routes

### Reminders

- `GET/POST /api/reminders` - List and create reminders
- `GET/PUT/DELETE /api/reminders/[id]` - Reminder CRUD operations

### Slack Integration

- `GET /api/slack/oauth` - Slack OAuth flow
- `GET /api/slack/channels` - Fetch user channels

### Subscriptions

- `GET /api/subscription/check-limits` - User subscription status
- `POST /api/stripe/checkout` - Create payment session
- `POST /api/stripe/webhook` - Handle payment webhooks

### Scheduler (Automation)

- `GET /api/scheduler/run` - Manual trigger for reminder scheduler
- `POST /api/scheduler/run` - Manual trigger (alternative)

## 🎨 Recent Updates

### v1.0.0 - Complete System

- ✅ Real-time dashboard with live stats
- ✅ Responsive sidebar with mobile hamburger menu
- ✅ Complete reminder scheduling system
- ✅ Slack OAuth integration
- ✅ Stripe subscription management
- ✅ Mobile-first responsive design
- ✅ Row Level Security implementation
- ✅ **Automated reminder scheduler with cron jobs**
- ✅ **Slack message delivery system**
- ✅ **Recurring reminder support**

## 🐛 Troubleshooting

### Subscription Status Shows "Incomplete"

If subscriptions show "incomplete" status after payment:

1. **Normal Behavior**: "Incomplete" is Stripe's initial status when payment requires authentication (3D Secure)
2. **Wait for Webhooks**: Status updates to "active" once payment is confirmed
3. **Manual Sync**: Use the sync endpoint to force status update:
   ```bash
   curl -X POST /api/stripe/sync-subscriptions \
     -H "Content-Type: application/json" \
     -d '{"userId": "your-user-id"}'
   ```
4. **Check Webhook Logs**: Ensure Stripe webhooks are reaching your endpoint
5. **Stripe Dashboard**: Verify webhook events are being sent from Stripe

### Stripe Webhook Events Handled

- `checkout.session.completed` - Initial subscription creation
- `customer.subscription.updated` - Status changes
- `invoice.payment_succeeded` - Payment confirmations
- `customer.subscription.deleted` - Cancellations

### Subscription Data Not Showing

1. Run `fix-rls-policies.sql` in Supabase SQL Editor
2. Verify API route `/api/subscription/check-limits` is working
3. Check browser console for authentication errors

### Slack Connection Issues

1. Verify Slack App credentials in environment variables
2. Ensure OAuth redirect URLs are configured in Slack App
3. Check that required OAuth scopes are granted

### PowerShell Execution Policy (Windows)

```powershell
Set-ExecutionPolicy RemoteSigned
```

## 📝 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Testing the Scheduler

Test the reminder scheduler manually:

```bash
# Test the scheduler function
node test-scheduler.js

# Or trigger via API
curl http://localhost:3000/api/scheduler/run
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment

```bash
npm run build
npm run start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) - The React framework
- [Supabase](https://supabase.com) - Backend as a Service
- [Stripe](https://stripe.com) - Payment processing
- [Slack](https://slack.com) - Team communication platform
