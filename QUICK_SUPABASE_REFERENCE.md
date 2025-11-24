# Quick Supabase Reference

## 🎯 Quick Start

### Local Development (JSON File)
```bash
# .env.local
VITE_USE_SUPABASE=false

# Start backend
npm run server

# Start frontend
npm run dev
```

### Production (Supabase)
```bash
# Set in Vercel/hosting
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📦 Migration Commands

```bash
# Migrate data from JSON to Supabase
node server/migrate-to-supabase.js

# Create manual backup
copy server\database.json server\database.backup.manual.json
```

---

## 🔍 How It Works

### Local Development
1. App checks `VITE_USE_SUPABASE=false`
2. Uses JSON file via Express backend
3. Automatic backups to `database.backup.*.json`
4. CSV exports to `csv-backups/`

### Production
1. App checks `VITE_USE_SUPABASE=true`
2. Connects to Supabase PostgreSQL
3. Automatic backups in `data_backups` table
4. Supabase handles daily backups

---

## 🛡️ Data Safety

### Multiple Backup Layers

**Local (JSON mode):**
- ✅ Automatic JSON backups before every write
- ✅ CSV exports with timestamps
- ✅ Keeps last 10 backups
- ✅ Recovery scripts available

**Production (Supabase mode):**
- ✅ Application-level backups in `data_backups` table
- ✅ Supabase automatic daily backups
- ✅ Point-in-time recovery
- ✅ Manual backup/export anytime

### Your Data is Safe Because:
1. **Pre-migration backup** created automatically
2. **Dual storage** during transition (JSON + Supabase)
3. **Automatic backups** in both systems
4. **Easy rollback** if needed
5. **No data deletion** - only copying

---

## 🚨 Emergency Recovery

### Restore from JSON Backup
```bash
# Find backup file
dir server\database.backup.*.json

# Restore it
copy server\database.backup.1234567890.json server\database.json

# Restart server
npm run server
```

### Restore from Supabase
```sql
-- In Supabase SQL Editor
SELECT full_backup FROM data_backups 
ORDER BY backup_date DESC LIMIT 1;
```

---

## 📊 Useful SQL Queries

### Check Data Counts
```sql
SELECT 
  (SELECT COUNT(*) FROM team_members) as team_members,
  (SELECT COUNT(*) FROM projects) as projects,
  (SELECT COUNT(*) FROM allocations) as allocations;
```

### Create Backup
```sql
SELECT create_automatic_backup();
```

### View Recent Backups
```sql
SELECT backup_date, team_members_count, projects_count, allocations_count
FROM data_backups
ORDER BY backup_date DESC
LIMIT 10;
```

### Export Specific Table
```sql
SELECT * FROM team_members;
SELECT * FROM projects;
SELECT * FROM allocations;
```

---

## 🔄 Switching Between Modes

### Switch to Supabase (Production)
1. Set `VITE_USE_SUPABASE=true`
2. Set Supabase credentials
3. Deploy

### Switch to JSON (Local)
1. Set `VITE_USE_SUPABASE=false`
2. Ensure `database.json` exists
3. Start local server

**Both modes can coexist!** Use JSON locally, Supabase in production.

---

## ✅ Verification Checklist

### After Migration
- [ ] All tables have data in Supabase
- [ ] Pre-migration backup exists
- [ ] Production environment variables set
- [ ] Production site works
- [ ] Local development still works
- [ ] Manual backup downloaded

### Regular Maintenance
- [ ] Check Supabase backups weekly
- [ ] Download manual backup monthly
- [ ] Verify data integrity monthly
- [ ] Test recovery process quarterly

---

## 📞 Quick Help

**Problem**: Data not showing in production
**Fix**: Check environment variables are set correctly

**Problem**: Local development broken
**Fix**: Ensure `VITE_USE_SUPABASE=false` in `.env.local`

**Problem**: Need to rollback
**Fix**: Copy pre-migration backup to `database.json`

**Problem**: Lost data
**Fix**: Check `data_backups` table or Supabase backups

---

**Remember**: Your data is backed up in multiple places. You cannot lose it! 🛡️
