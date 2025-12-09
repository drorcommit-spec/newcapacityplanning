# Development Database Setup Guide

## Overview
This guide will help you set up Supabase for your local development environment, replacing the JSON file storage.

## Prerequisites
- Supabase project "Puzzle-Dev" created
- Access to Supabase dashboard

## Step-by-Step Setup

### 1. Get Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your **Puzzle-Dev** project
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: The long key under "Project API keys" (anon/public)

### 2. Configure Environment Variables

1. Open `.env.local` file in the project root
2. Replace the placeholder values:
   ```env
   VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
   VITE_USE_SUPABASE=true
   ```

### 3. Create Database Schema

1. Go to Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `setup-dev-database.sql`
4. Paste into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. Wait for "Success. No rows returned" message

### 4. Import Existing Data (Optional)

If you want to import your existing JSON data into the dev database:

1. Make sure your local JSON file has the data you want
2. Run the app once with `VITE_USE_SUPABASE=false` to ensure JSON is up to date
3. Change `VITE_USE_SUPABASE=true`
4. The app will read from JSON and you can manually copy data, OR
5. Use the Supabase dashboard to import data manually

### 5. Restart Development Server

```cmd
# Stop the current dev server (Ctrl+C)
# Start it again
npm run dev
```

### 6. Verify Setup

1. Open the app in browser: `http://localhost:5174`
2. Open browser console (F12)
3. Look for: `📥 Fetching data from Supabase...`
4. If you see this, Supabase is working!
5. If you see `Using JSM file for data storage`, check your .env.local

## Troubleshooting

### "Supabase is not configured"
- Check that `.env.local` exists
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart the dev server

### "Failed to fetch data"
- Check Supabase project is active
- Verify the SQL schema was created successfully
- Check RLS policies are created

### "No data showing"
- Database is empty - this is normal for a new setup
- Create some test data through the UI
- Or import from production using the sync scripts

## Switching Between JSON and Supabase

To switch back to JSON file (if needed):
```env
VITE_USE_SUPABASE=false
```

To use Supabase:
```env
VITE_USE_SUPABASE=true
```

## Benefits of Using Supabase for Dev

✅ No more file permission issues
✅ Proper database transactions
✅ Better data integrity
✅ Same environment as production
✅ Can test database-specific features
✅ Real-time updates (if enabled)

## Next Steps

After setup is complete:
1. Create your first user in the Members page
2. Assign them to "Admin" team
3. Start creating projects and allocations
4. Test the copy/delete features that were having issues with JSON

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase logs in dashboard
3. Verify all environment variables are set correctly
