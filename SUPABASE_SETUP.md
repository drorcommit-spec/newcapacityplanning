# Supabase Setup Guide

## Overview
This guide will help you set up Supabase for production while keeping JSON file storage for local development.

## Step 1: Create Supabase Project

1. Go to https://supabase.com/
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: Product Capacity Platform
   - **Database Password**: (save this securely!)
   - **Region**: Choose closest to your users
5. Wait for project to be created (~2 minutes)

## Step 2: Get Your Credentials

From your Supabase project dashboard:
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 3: Create Database Tables

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the SQL from `supabase-schema.sql` (created below)
4. Click **Run**

## Step 4: Configure Environment Variables

### For Local Development (uses JSON file):
Create `.env.local`:
```
VITE_USE_SUPABASE=false
```

### For Production (uses Supabase):
Set these in Vercel/your hosting:
```
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-key...
```

## Step 5: Deploy

The app will automatically:
- Use JSON file when `VITE_USE_SUPABASE=false` (local)
- Use Supabase when `VITE_USE_SUPABASE=true` (production)

## Migration from JSON to Supabase

To migrate your existing data:
```bash
node server/migrate-to-supabase.js
```

This will read your `database.json` and upload all data to Supabase.

## Backup Strategy

### Local Development
- Automatic JSON backups (existing system)
- CSV exports (existing system)

### Production (Supabase)
- Automatic daily backups by Supabase
- Point-in-time recovery available
- Manual export via Supabase dashboard

## Security Notes

- Never commit `.env` files with real credentials
- Use environment variables for all secrets
- Supabase Row Level Security (RLS) is configured
- API keys are safe to use in frontend (anon key only)
