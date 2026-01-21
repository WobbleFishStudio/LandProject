# Land Management Dashboard

A comprehensive land inventory and sales management system with:
- **Admin Dashboard**: Manage land inventory, track sales, view analytics
- **Buyer Portal**: Customers login to view their payment schedule, make payments
- **Financial Engine**: Amortization schedules, interest calculations, payment tracking

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + React Router
- **Backend/Database**: Supabase (PostgreSQL + Auth + Real-time + Edge Functions)
- **Payments**: Stripe (checkout sessions, payment links, webhooks)
- **UI Components**: Headless UI for accessibility
- **Charts**: Recharts for analytics/visualizations
- **Tables**: TanStack Table for data grids with sorting/filtering

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Stripe account

### 1. Clone and Install

```bash
cd Land
npm install
```

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Copy your project URL and anon key from Settings > API

### 3. Configure Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your publishable key from Developers > API Keys
3. Set up webhook endpoint for production

### 4. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
```

### 5. Deploy Edge Functions (Optional for Stripe)

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref your-project-ref

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_your-key
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your-secret

# Deploy functions
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Creating an Admin User

1. Sign up through the app
2. In Supabase Dashboard > Authentication > Users, find your user
3. Edit the user's metadata to add: `{ "role": "admin" }`

## Project Structure

```
/src
  /components
    /ui              # Reusable UI components (Button, Input, Modal, etc.)
    /layout          # Header, Sidebar, Layout wrappers
  /pages
    /admin           # Admin dashboard pages
    /buyer           # Buyer portal pages
    /auth            # Authentication pages
  /hooks             # Custom React hooks
  /lib
    supabase.ts      # Supabase client config
    stripe.ts        # Stripe client helpers
    calculations.ts  # Financial calculations
  /types             # TypeScript interfaces
  /utils             # Helper functions (export, etc.)

/supabase
  schema.sql         # Database schema
  /functions         # Edge functions for Stripe
```

## Features

### Admin Features
- Dashboard with stats and charts
- Property management (CRUD, status tracking)
- Sales management with amortization calculation
- Buyer management
- Tax payment tracking
- CSV/Google Sheets export

### Buyer Features
- View purchased properties
- Payment schedule with breakdown
- Make payments via Stripe
- Track payment history

### Financial Engine
- Standard amortization calculation
- Monthly payment breakdown (principal vs interest)
- Payoff amount calculation
- Running balance tracking

## Database Schema

See `supabase/schema.sql` for the complete database schema including:
- counties
- properties
- buyers
- sales
- payments
- tax_payments

## License

MIT
