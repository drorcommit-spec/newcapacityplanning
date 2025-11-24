# Supabase Production Deployment Guide

## 🎯 Overview

This guide will help you deploy your Product Capacity Platform to production using Supabase for data storage, while keeping JSON file storage for local development.

**Key Benefits:**
- ✅ **No Data Loss**: Multiple safety mechanisms
- ✅ **Easy Local Development**: Continue using JSON files locally
- ✅ **Production Ready**: Supabase handles scaling and backups
- ✅ **Automatic Backups**: Built-in backup system in Supabase

---

## 📋 Prerequisites

- [ ] Supabase account (free tier is fine)
- [ ] Vercel account (or other hosting)
- [ ] Your current `database.json` file backed up

---

## 🚀 Step-by-Step Deployment

### Step 1: Create Backup (CRITICAL!)

Before anything else, create a backup of your current data:

```bash
# Windows
copy product-capacity-platform\server\database.json product-capacity-platform\server\database.backup.manual.json

# Also copy to a safe location outside the project
copy product-capacity-platform\server\database.json C:\Backups\capacity-platform-backup.json
```

### Step 2: Set Up Supabase

1. **Create Project**
   - Go to https://supabase.com/
   - Click "New Project"
   - Name: `Product Capacity Platform`
   - Set a strong database password (SAVE THIS!)
   - Choose region closest to your users
   - Wait ~2 minutes for setup

2. **Create Database Tables**
   - In Supabase dashboard, go to **SQL Editor**
   - Click **New Query**
   - Copy entire contents of `supabase-schema.sql`
   - Paste and click **Run**
   - Verify: Go to **Table Editor** and see 4 tables created

3. **Get API Credentials**
   - Go to **Settings** → **API**
   - Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - Copy **anon public** key (starts with `eyJ...`)
   - **SAVE THESE SECURELY!**

### Step 3: Migrate Your Data

Run the migration script to safely copy your data to Supabase:

```bash
cd product-capacity-platform
node server/migrate-to-supabase.js
```

The script will:
1. Ask for your Supabase credentials
2. Show you a summary of data to migrate
3. Create a backup before migration
4. Upload all data to Supabase
5. Verify the migration

**IMPORTANT**: The script creates a backup file `database.pre-migration.[timestamp].json` - keep this safe!

### Step 4: Verify Migration

1. In Supabase dashboard, go to **Table Editor**
2. Check each table has data:
   - `team_members` - should have your team
   - `projects` - should have your projects
   - `allocations` - should have your allocations
   - `allocation_history` - should have history records

### Step 5: Configure Production Environment

In your Vercel (or hosting platform) dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add these variables:

```
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-key...
```

3. **Important**: Set these for **Production** environment only

### Step 6: Deploy to Production

```bash
# Commit your changes (credentials are NOT committed)
git add .
git commit -m "Add Supabase integration for production"
git push

# Deploy to Vercel (or your platform)
# Vercel will auto-deploy if connected to GitHub
```

### Step 7: Test Production

1. Visit your production URL
2. Check browser console - should see: `🌐 Using Supabase for data storage`
3. Try creating/editing/deleting data
4. Verify changes appear in Supabase dashboard

### Step 8: Verify Local Development Still Works

```bash
# Make sure you're using local environment
# Check .env.local has: VITE_USE_SUPABASE=false

# Start local backend
npm run server

# Start local frontend (in another terminal)
npm run dev

# Check browser console - should see: `📁 Using JSON file for data storage`
```

---

## 🛡️ Data Safety Features

### Automatic Backups in Supabase

1. **Built-in Backups**
   - Supabase automatically backs up your database daily
   - Point-in-time recovery available
   - Backups retained for 7 days (free tier)

2. **Manual Backups**
   - In Supabase dashboard: **Database** → **Backups**
   - Click **Create Backup** anytime
   - Download backups as SQL files

3. **Application-Level Backups**
   - Every save creates a backup in `data_backups` table
   - Function `create_automatic_backup()` stores full snapshots
   - Query backups: `SELECT * FROM data_backups ORDER BY backup_date DESC`

### Local Development Backups

Your existing backup system continues to work:
- JSON backups: `database.backup.[timestamp].json`
- CSV backups: `csv-backups/` folder
- Recovery scripts: `restore-all-data.cjs`

---

## 🔄 Migration Rollback

If something goes wrong, you can rollback:

### Option 1: Restore from Pre-Migration Backup

```bash
# Find your backup file
# It's named: database.pre-migration.[timestamp].json

# Copy it back
copy server\database.pre-migration.1234567890.json server\database.json

# Restart your local server
npm run server
```

### Option 2: Export from Supabase

1. In Supabase dashboard, go to **Table Editor**
2. For each table, click **Export** → **CSV**
3. Use `restore-from-csv.cjs` to import

### Option 3: Use Supabase Backup

1. Go to **Database** → **Backups**
2. Find the backup before migration
3. Click **Restore**

---

## 📊 Monitoring & Maintenance

### Check Data Integrity

```sql
-- Run in Supabase SQL Editor

-- Count records
SELECT 
  (SELECT COUNT(*) FROM team_members) as team_members,
  (SELECT COUNT(*) FROM projects) as projects,
  (SELECT COUNT(*) FROM allocations) as allocations,
  (SELECT COUNT(*) FROM allocation_history) as history;

-- Check recent backups
SELECT 
  backup_date,
  team_members_count,
  projects_count,
  allocations_count
FROM data_backups
ORDER BY backup_date DESC
LIMIT 5;
```

### Create Manual Backup

```sql
-- Run in Supabase SQL Editor
SELECT create_automatic_backup();
```

### Export All Data

```sql
-- Get complete data snapshot
SELECT full_backup 
FROM data_backups 
ORDER BY backup_date DESC 
LIMIT 1;
```

---

## 🆘 Troubleshooting

### Issue: "Supabase is not configured"

**Solution**: Check environment variables are set correctly in production

### Issue: Data not syncing

**Solution**: 
1. Check browser console for errors
2. Verify Supabase credentials are correct
3. Check Supabase dashboard for API errors

### Issue: Want to switch back to JSON

**Solution**:
1. Export data from Supabase
2. Set `VITE_USE_SUPABASE=false`
3. Redeploy

### Issue: Lost data

**Solution**:
1. Check `data_backups` table in Supabase
2. Check pre-migration backup file
3. Check Supabase automatic backups
4. Contact support with backup file

---

## 🔐 Security Best Practices

1. **Never commit credentials**
   - `.env.local` is in `.gitignore`
   - Use environment variables in production

2. **Use Row Level Security**
   - Already configured in schema
   - Customize policies as needed

3. **Regular backups**
   - Supabase handles this automatically
   - Download manual backups monthly

4. **Monitor access**
   - Check Supabase logs regularly
   - Set up alerts for unusual activity

---

## 📞 Support

If you encounter issues:

1. **Check logs**
   - Browser console
   - Supabase dashboard → Logs

2. **Verify backups exist**
   - `server/database.pre-migration.*.json`
   - Supabase `data_backups` table

3. **Restore from backup**
   - Use migration rollback steps above

---

## ✅ Post-Deployment Checklist

- [ ] Data migrated successfully to Supabase
- [ ] Production environment variables set
- [ ] Production site tested and working
- [ ] Local development still works with JSON
- [ ] Pre-migration backup saved safely
- [ ] Manual backup downloaded from Supabase
- [ ] Team notified of new production URL
- [ ] Monitoring set up in Supabase

---

**Last Updated**: November 24, 2025
**Status**: Ready for Production Deployment ✅
