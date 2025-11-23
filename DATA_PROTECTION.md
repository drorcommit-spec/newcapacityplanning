# Data Protection & Recovery Guide

## 🛡️ Automatic Backup System

The system now includes automatic backup protection to prevent data loss.

### How It Works

1. **Before Every Save**: Creates a timestamped backup
2. **Validation**: Checks JSON is valid before writing
3. **Automatic Cleanup**: Keeps last 10 backups
4. **Recovery**: Easy restoration from any backup

### Backup Files Location

```
product-capacity-platform/server/
├── database.json (current)
├── database.backup.1732276800000.json
├── database.backup.1732276900000.json
└── ... (up to 10 backups)
```

## 📋 Manual Backup

### Create Manual Backup
```bash
cd server
copy database.json database.manual-backup.json
```

### Restore Manual Backup
```bash
cd server
copy database.manual-backup.json database.json
```

## 🔧 Recovery Options

### Option 1: Automatic Recovery (Recommended)

The server automatically creates backups. If corruption occurs:

1. Stop the server
2. Look in `server/` folder for `database.backup.*.json` files
3. Find the most recent valid backup
4. Copy it to `database.json`
5. Restart the server

### Option 2: Using Recovery Script

```bash
cd server
node recover-database.js
```

This script attempts to extract valid JSON from corrupted files.

### Option 3: API Recovery

```bash
# List available backups
curl http://localhost:3002/api/backups

# Restore from specific backup
curl -X POST http://localhost:3002/api/restore/database.backup.1732276800000.json
```

## 🚨 If Data Loss Occurs

### Immediate Steps

1. **DON'T PANIC** - Backups exist
2. **Stop the server** immediately
3. **Check backup files** in server folder
4. **Restore latest valid backup**
5. **Restart server**

### Prevention

The new system prevents corruption by:
- ✅ Validating JSON before writing
- ✅ Creating backups before every save
- ✅ Logging all database operations
- ✅ Keeping multiple backup versions

## 📊 Monitoring

### Check Server Logs

The server now logs:
- ✅ Database saved successfully
- 💾 Backup created: filename
- ❌ Error writing database

### Verify Database Health

```bash
# Check if database is valid JSON
node -e "JSON.parse(require('fs').readFileSync('server/database.json'))"
```

## 🔄 Best Practices

1. **Regular Manual Backups**: Copy `database.json` weekly
2. **Monitor Server Logs**: Watch for error messages
3. **Test Backups**: Occasionally verify backups are valid
4. **Keep Backups**: Don't delete backup files manually

## 📝 Backup Schedule

- **Automatic**: Before every database write
- **Manual**: Weekly (recommended)
- **Retention**: Last 10 automatic backups
- **Manual Backups**: Keep indefinitely

## 🆘 Emergency Contact

If you experience data loss:

1. Check `server/database.backup.*.json` files
2. Use the most recent valid backup
3. Contact support with:
   - Error messages from server logs
   - Timestamp of when issue occurred
   - List of backup files available

## ✅ Current Protection Status

- ✅ Automatic backups: ENABLED
- ✅ JSON validation: ENABLED
- ✅ Backup retention: 10 files
- ✅ Recovery API: AVAILABLE
- ✅ Manual backup support: YES

Your data is now protected with multiple layers of backup and recovery options!
