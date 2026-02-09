# Google Cloud Setup Guide

Follow these steps to set up Google Cloud for the KPI Schedule Sync tool.

## Step 1: Create Google Cloud Project (Already Done ✓)

You already have a project: `kpi-schedule-exporter`

## Step 2: Enable Google Calendar API (Already Done ✓)

The Google Calendar API is already enabled for your project.

## Step 3: Add Yourself as Test User (REQUIRED)

Since your OAuth app is in "Testing" mode, you must add your email as a test user.

### Instructions:

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/

2. **Select your project:**
   - Click the project dropdown at the top
   - Select "kpi-schedule-exporter"

3. **Navigate to OAuth consent screen:**
   - Click "APIs & Services" in the left menu
   - Click "OAuth consent screen"

4. **Add test users:**
   - Scroll down to the "Test users" section
   - Click "+ ADD USERS"
   - Enter your Gmail address (the one you'll use to authorize)
   - Click "Add"
   - Click "Save" at the bottom

5. **Done!**
   - You can now run the sync command

## Step 4: Run the Sync

```bash
pnpm sync 482eb988-e88c-47dc-8246-7cc7daa7c752
```

When the browser opens:
1. Sign in with the email you added as a test user
2. You'll see a warning "Google hasn't verified this app" - this is normal for testing mode
3. Click "Continue" (or "Advanced" → "Go to KPI Schedule Sync (unsafe)")
4. Click "Allow" to grant calendar access
5. Return to the terminal - sync will continue automatically

## Troubleshooting

### "Access denied (403)" error

**Cause:** Your email is not added as a test user.

**Fix:** Follow Step 3 above to add your email as a test user.

### "This app isn't verified" warning

**This is normal!** Your app is in "Testing" mode, which is perfect for personal use. You can safely click "Continue" or "Advanced" → "Go to app (unsafe)".

If you want to remove this warning (optional):
1. Go to OAuth consent screen
2. Click "PUBLISH APP"
3. Submit for verification (takes 1-2 weeks)
4. Or keep it in Testing mode - works perfectly fine!

### Port 3000 is in use

**Fix:** Close any other applications using port 3000, or the tool will automatically show an error with instructions.

## OAuth Credentials

Your OAuth credentials are already saved in:
```
credentials/client_secret.json
```

This file is **safe to commit** to git (it's a public client ID for desktop apps, not a secret).

## After First Authorization

After your first successful authorization:
- Your personal token is saved in `~/.kpi-calendar/token.json`
- Future runs won't require browser authorization
- Token automatically refreshes when needed
- You can use the tool on any schedule without re-authenticating

## Re-authenticate

If you need to switch Google accounts:

```bash
pnpm reauth
```

Then run sync again with the new account (make sure the new account is also added as a test user).

---

**Ready?** Add yourself as a test user (Step 3 above), then run:

```bash
pnpm sync 482eb988-e88c-47dc-8246-7cc7daa7c752
```
