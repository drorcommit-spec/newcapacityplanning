# Backend Deployment Guide

## Quick Deploy to Railway (Recommended - FREE)

### Step 1: Prepare Repository
The backend is ready to deploy from the `server` folder.

### Step 2: Deploy to Railway

1. **Go to Railway:** https://railway.app/
2. **Sign up/Login** with GitHub
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose:** `drorcommit-spec/newcapacityplanning`
6. **Configure:**
   - Root Directory: `server`
   - Start Command: `npm start`
7. **Click "Deploy"**

### Step 3: Get Your Backend URL

After deployment:
1. Go to your project settings
2. Click "Generate Domain"
3. Copy the URL (e.g., `https://your-app.railway.app`)

### Step 4: Update Frontend

Add environment variable to Vercel:

1. Go to Vercel Dashboard
2. Select your project: `newcapacityplanning`
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-app.railway.app/api`
5. **Redeploy** your frontend

### Step 5: Test

Visit your production app and verify data persists!

---

## Alternative: Deploy to Render (Also FREE)

### Step 1: Go to Render
https://render.com/

### Step 2: Create Web Service
1. Click "New +" → "Web Service"
2. Connect GitHub repo: `newcapacityplanning`
3. Configure:
   - **Name:** capacity-planning-api
   - **Root Directory:** `server`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
4. Click "Create Web Service"

### Step 3: Get URL
Copy the URL (e.g., `https://capacity-planning-api.onrender.com`)

### Step 4: Update Vercel
Same as Railway Step 4 above.

---

## Alternative: Deploy to Heroku

### Prerequisites
```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli
```

### Deploy
```bash
cd server
heroku login
heroku create capacity-planning-api
git init
git add .
git commit -m "Initial commit"
heroku git:remote -a capacity-planning-api
git push heroku main
```

### Get URL
```bash
heroku open
# Copy the URL
```

---

## Environment Variables

### Production Frontend (.env.production)
```
VITE_API_URL=https://your-backend-url.railway.app/api
```

### Local Development (.env.development)
```
VITE_API_URL=http://localhost:3002/api
```

---

## CORS Configuration

The server is already configured to accept requests from any origin:

```javascript
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
```

For production, you may want to restrict this to your Vercel domain:

```javascript
app.use(cors({
  origin: 'https://newcapacityplanning.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
```

---

## Data Persistence

### Current Setup
- Data stored in `database.json` file
- Automatic backups created on every save
- CSV backups in `csv-backups/` folder

### Important Notes
- **Railway/Render Free Tier:** Filesystem is ephemeral (resets on restart)
- **Solution:** Use a database for production

### Upgrade to Database (Future)

For true persistence, consider:
1. **MongoDB Atlas** (Free tier available)
2. **PostgreSQL** (Railway/Render provide free databases)
3. **Supabase** (Free tier with PostgreSQL)

---

## Quick Start (Railway - Easiest)

1. **Deploy Backend:**
   - Go to https://railway.app/
   - New Project → Deploy from GitHub
   - Select repo, set root to `server`
   - Generate domain

2. **Update Frontend:**
   - Vercel → Settings → Environment Variables
   - Add `VITE_API_URL` = `https://your-app.railway.app/api`
   - Redeploy

3. **Done!** Your app now has persistent data in production.

---

## Troubleshooting

### "Failed to connect to server"
- Check backend URL is correct
- Verify backend is running (visit URL in browser)
- Check CORS settings

### "Data not persisting"
- Verify environment variable is set in Vercel
- Check browser console for API errors
- Ensure backend is using correct port

### "502 Bad Gateway"
- Backend might be starting up (wait 30 seconds)
- Check Railway/Render logs for errors

---

## Cost

- **Railway:** Free tier includes 500 hours/month
- **Render:** Free tier (spins down after inactivity)
- **Vercel:** Free for frontend
- **Total:** $0/month for small teams

---

## Next Steps

1. Deploy backend to Railway (5 minutes)
2. Add environment variable to Vercel (2 minutes)
3. Test production app
4. Consider upgrading to real database for better persistence
