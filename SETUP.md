# Setup Instructions

## Quick Start

1. **Install Dependencies**
   ```bash
   cd product-capacity-platform
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Open Browser**
   Navigate to http://localhost:5174

## First Time Usage

1. Login with any name and role
2. Go to "Team" to add team members
3. Go to "Projects" to add customer projects
4. Go to "Allocations" to start planning capacity
5. View "Dashboard" for capacity overview
6. Check "History" for audit trail

## Default Login

You can login with any name and role. The system will create a user session for you.

Example:
- Name: John Doe
- Role: Product Operations Manager

## Data Persistence

All data is stored in browser LocalStorage. Your data will persist across sessions unless you clear browser data.

## Troubleshooting

If you encounter issues:
1. Clear browser cache and LocalStorage
2. Restart the development server
3. Check console for errors

## Production Build

```bash
npm run build
npm run preview
```

The build output will be in the `dist` folder.
