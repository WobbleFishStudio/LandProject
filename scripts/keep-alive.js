#!/usr/bin/env node

/**
 * Supabase Keep-Alive Script
 * Run this as a cron job to prevent Supabase free tier from pausing
 *
 * In Coolify: Set up as a scheduled task to run daily
 * Cron expression: 0 0 * * * (runs at midnight daily)
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

async function keepAlive() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    process.exit(1);
  }

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Pinging Supabase...`);

  try {
    // Simple query to keep the database active
    const response = await fetch(`${SUPABASE_URL}/rest/v1/counties?select=id&limit=1`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (response.ok) {
      console.log(`[${timestamp}] Supabase ping successful (status: ${response.status})`);
    } else {
      console.error(`[${timestamp}] Supabase ping failed (status: ${response.status})`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`[${timestamp}] Supabase ping error:`, error.message);
    process.exit(1);
  }
}

keepAlive();
