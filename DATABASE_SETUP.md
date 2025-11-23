# Database Setup Guide

The application now uses a simple file-based database (JSON) that persists data on the server.

## Setup Instructions

### 1. Install Server Dependencies

```bash
cd server
npm install
cd ..
```

### 2. Install Frontend Dependencies (if not done)

```bash
npm install
```

### 3. Start the Application

You have two options:

#### Option A: Start Both (Recommended)
```bash
npm run dev:all
```

This starts both the frontend (port 5175) and backend (port 3001) simultaneously.

#### Option B: Start Separately

Terminal 1 - Backend:
```bash
npm run server
```

Terminal 2 - Frontend:
```bash
npm run dev
```

## How It Works

- **Backend Server**: Runs on `http://localhost:3001`
- **Frontend App**: Runs on `http://localhost:5175`
- **Database File**: `server/database.json`

All data is automatically saved to `server/database.json` whenever you make changes.

## Initial Data

The database is initialized with one user:
- **Email**: drors@comm-it.com
- **Name**: Dror
- **Role**: Product Operations Manager

## Database File Location

The database file is located at:
```
product-capacity-platform/server/database.json
```

You can:
- Back it up by copying this file
- Restore it by replacing this file
- View/edit it directly (it's just JSON)

## Troubleshooting

### "Failed to load data" error
- Make sure the backend server is running on port 3001
- Check if `server/database.json` exists
- Check the browser console for detailed errors

### Port already in use
- Backend (3001): Change PORT in `server/server.js`
- Frontend (5175): Change port in `vite.config.ts`

### Data not persisting
- Ensure the backend server is running
- Check browser console for API errors
- Verify `server/database.json` is being updated
