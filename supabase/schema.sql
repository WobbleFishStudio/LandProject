-- Land Management Dashboard Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE property_status AS ENUM ('available', 'sold', 'pending', 'not_for_sale');
CREATE TYPE sale_status AS ENUM ('active', 'paid_off', 'defaulted');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'late', 'missed');
CREATE TYPE tax_payment_status AS ENUM ('pending', 'paid');

-- Counties table
CREATE TABLE counties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, state)
);

-- Properties table
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT NOT NULL,
  county_id UUID NOT NULL REFERENCES counties(id) ON DELETE RESTRICT,
  status property_status NOT NULL DEFAULT 'available',
  account_apn TEXT NOT NULL,
  acreage DECIMAL(10, 2) NOT NULL,
  tax_annual DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  description TEXT,
  legal_summary TEXT,
  list_price DECIMAL(12, 2) NOT NULL,
  price_50_percent DECIMAL(12, 2) NOT NULL,
  price_20_percent DECIMAL(12, 2) NOT NULL,
  listing_url TEXT,
  county_tax_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Buyers table
CREATE TABLE buyers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

-- Sales table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE RESTRICT,
  sale_date DATE NOT NULL,
  sale_price DECIMAL(12, 2) NOT NULL,
  down_payment DECIMAL(12, 2) NOT NULL DEFAULT 0,
  finance_amount DECIMAL(12, 2) NOT NULL,
  interest_rate DECIMAL(5, 2) NOT NULL,
  term_months INTEGER NOT NULL,
  monthly_payment DECIMAL(12, 2) NOT NULL,
  total_payment DECIMAL(12, 2) NOT NULL,
  status sale_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  payment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount_due DECIMAL(12, 2) NOT NULL,
  principal DECIMAL(12, 2) NOT NULL,
  interest DECIMAL(12, 2) NOT NULL,
  paid_amount DECIMAL(12, 2),
  paid_date DATE,
  stripe_payment_id TEXT,
  stripe_checkout_session_id TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sale_id, payment_number)
);

-- Tax payments table
CREATE TABLE tax_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status tax_payment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, tax_year)
);

-- Create indexes for better query performance
CREATE INDEX idx_properties_county ON properties(county_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_sales_property ON sales(property_id);
CREATE INDEX idx_sales_buyer ON sales(buyer_id);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_payments_sale ON payments(sale_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);
CREATE INDEX idx_tax_payments_property ON tax_payments(property_id);
CREATE INDEX idx_buyers_user_id ON buyers(user_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_payments ENABLE ROW LEVEL SECURITY;

-- Counties: Readable by all authenticated users
CREATE POLICY "Counties are viewable by authenticated users" ON counties
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Counties are manageable by admins" ON counties
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Properties: Readable by all authenticated users, manageable by admins
CREATE POLICY "Properties are viewable by authenticated users" ON properties
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Properties are manageable by admins" ON properties
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Buyers: Users can view their own record, admins can view all
CREATE POLICY "Buyers can view their own record" ON buyers
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Buyers are manageable by admins" ON buyers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Sales: Buyers can view their own sales, admins can view all
CREATE POLICY "Sales viewable by buyer or admin" ON sales
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM buyers
      WHERE buyers.id = sales.buyer_id
      AND buyers.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Sales are manageable by admins" ON sales
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Payments: Buyers can view their own payments, admins can view all
CREATE POLICY "Payments viewable by buyer or admin" ON payments
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM sales
      JOIN buyers ON buyers.id = sales.buyer_id
      WHERE sales.id = payments.sale_id
      AND buyers.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Payments are manageable by admins" ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Tax payments: Viewable and manageable by admins only
CREATE POLICY "Tax payments are viewable by admins" ON tax_payments
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Tax payments are manageable by admins" ON tax_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for properties updated_at
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically mark property as sold when sale is created
CREATE OR REPLACE FUNCTION mark_property_sold()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE properties SET status = 'sold' WHERE id = NEW.property_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_sale_created
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION mark_property_sold();

-- Function to update payment status based on date
CREATE OR REPLACE FUNCTION update_payment_statuses()
RETURNS void AS $$
BEGIN
  UPDATE payments
  SET status = 'late'
  WHERE status = 'pending'
  AND due_date < CURRENT_DATE;
END;
$$ language 'plpgsql';
