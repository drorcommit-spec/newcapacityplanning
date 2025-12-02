# Vercel Environment Variables Setup

## Problem
Production app shows: "Failed to connect to server. Could not find the table 'public.teams' in the schema cache. Make sure the backend is running on http://localhost:3002"

## Solution
Configure Vercel environment variables to use Supabase in production.

## Steps

### 1. Go to Vercel Dashboard
1. Open https://vercel.com/dashboard
2. Select your project: `newcapacityplanning`
3. Go to **Settings** → **Environment Variables**

### 2. Add These Environment Variables

Add the following variables for **Production** environment:

| Variable Name | Value | Where to Find |
|--------------|-------|---------------|
| `VITE_USE_SUPABASE` | `true` | (Enable Supabase) |
| `VITE_SUPABASE_URL` | Your Supabase URL | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Anon Key | Supabase Dashboard → Settings → API |

### 3. Get Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → Use for `VITE_SUPABASE_URL`
   - **anon public** key → Use for `VITE_SUPABASE_ANON_KEY`

### 4. Add Variables in Vercel

For each variable:
1. Click **Add New**
2. Enter **Name** (e.g., `VITE_USE_SUPABASE`)
3. Enter **Value** (e.g., `true`)
4. Select **Production** environment
5. Click **Save**

### 5. Redeploy

After adding all variables:
1. Go to **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Select **Redeploy**
4. Wait for deployment to complete

## Verification

After redeployment:
1. Open your production URL
2. Check browser console (F12)
3. Should see: `🔧 Database Mode: Supabase (Production)`
4. No more localhost:3002 errors!

## Important Notes

- ⚠️ **Never commit** Supabase keys to Git
- ✅ Environment variables are **only** in Vercel
- 🔒 Keys are **encrypted** by Vercel
- 🔄 Changes require **redeployment**

## Local Development

For local development, create `.env` file (already in .gitignore):

```env
VITE_USE_SUPABASE=false
# Leave empty for local JSON file mode
```

Or to test Supabase locally:

```env
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

