# First Time Setup

## Initial Login

The system comes pre-configured with one user:

**Email:** `drors@comm-it.com`  
**Name:** Dror  
**Role:** Product Operations Manager (Full Access)

## If Login Doesn't Work

If you're having trouble logging in, the browser might have old data. Follow these steps:

### Option 1: Clear Data via Browser Console

1. Open the app in your browser (http://localhost:5175)
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Type this command and press Enter:
   ```javascript
   localStorage.clear(); location.reload();
   ```
5. The page will refresh with fresh data
6. Try logging in again with `drors@comm-it.com`

### Option 2: Clear Data via Application Tab

1. Open Developer Tools (`F12`)
2. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Find **Local Storage** in the left sidebar
4. Click on your site URL
5. Click "Clear All" or delete individual items
6. Refresh the page
7. Try logging in again

## After First Login

Once logged in as Dror (Product Operations Manager), you can:

1. **Add More Team Members** - Go to Team Management
2. **Create Projects** - Go to Project Management  
3. **Plan Allocations** - Go to Sprint Allocation Planning
4. **Monitor Capacity** - View Dashboard for insights

## Adding More Users

1. Go to **Team Management**
2. Click **Add Team Member**
3. Fill in:
   - Full Name
   - Email (must be unique)
   - Role
   - Team (if Product Manager)
4. Click **Add**

New users can then login with their registered email.
