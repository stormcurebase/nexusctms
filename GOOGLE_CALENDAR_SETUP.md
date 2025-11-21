# Google Calendar Integration Setup Guide

This guide will walk you through setting up Google Calendar integration with two-way sync for your CTMS application.

## Prerequisites

- A Google Cloud Platform account
- Admin access to your project
- The application running locally or deployed

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "CTMS Calendar Integration")
5. Click "Create"

## Step 2: Enable Google Calendar API

1. In the Google Cloud Console, navigate to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in required fields:
     - App name: Your CTMS App Name
     - User support email: Your email
     - Developer contact email: Your email
   - Click "Save and Continue"
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Click "Save and Continue"
   - Add test users if in development mode
   - Click "Save and Continue"

4. Back in the Credentials page, create OAuth client ID:
   - Application type: "Web application"
   - Name: "CTMS Calendar Sync"
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for local development)
     - Your production URL (e.g., `https://yourdomain.com`)
   - Authorized redirect URIs:
     - `http://localhost:5173/auth/callback` (for local development)
     - Your production callback URL (e.g., `https://yourdomain.com/auth/callback`)
   - Click "Create"

5. Copy the Client ID and Client Secret

## Step 4: Update Environment Variables

1. Open your `.env` file in the project root
2. Update the following variables:

```env
VITE_GOOGLE_CLIENT_ID=your_actual_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback
```

**Important:** For production, update `VITE_GOOGLE_REDIRECT_URI` to match your production domain.

## Step 5: Restart Your Application

After updating the environment variables, restart your development server:

```bash
npm run dev
```

## Step 6: Connect Your Calendar

1. Navigate to the Settings page in your CTMS application
2. Find the "Integrations" section
3. Click "Connect Account" under Google Calendar
4. You'll be redirected to Google's OAuth consent screen
5. Sign in with your Google account
6. Grant the requested permissions
7. You'll be redirected back to your application
8. Your calendar should now show as connected!

## How It Works

### Two-Way Sync

The integration provides full two-way synchronization:

**CTMS to Google:**
- When you schedule a visit in CTMS, it automatically creates an event in Google Calendar
- Visit details, patient name, and study information are added to the event description
- Updates to visits in CTMS update the corresponding Google Calendar event
- Deleting/cancelling a visit removes it from Google Calendar

**Google to CTMS:**
- External events from your Google Calendar appear on the CTMS calendar view
- Helps prevent scheduling conflicts with personal appointments
- Shows warning when trying to schedule during existing events

### Per-User Authentication

Each user connects their own Google Calendar:
- Tokens are stored securely in Supabase with per-user isolation
- Row Level Security ensures users can only access their own calendar data
- Each user's CTMS visits sync to their own Google Calendar

### Recurring Events

The system supports recurring events from Google Calendar:
- Recurring appointments are properly parsed and displayed
- All instances of recurring events are shown on the calendar
- Conflict detection works with recurring events

## Security Notes

1. **Never commit your `.env` file** - It contains sensitive credentials
2. Tokens are stored encrypted in Supabase
3. Row Level Security policies ensure user data isolation
4. Tokens are automatically refreshed before expiration
5. Users can disconnect and revoke access at any time

## Troubleshooting

### "OAuth error" when connecting

- Verify your Client ID and Client Secret are correct
- Ensure the redirect URI in Google Cloud Console matches exactly
- Check that you've added your email as a test user (if in development mode)

### "No calendar token found" error

- Make sure you've successfully completed the OAuth flow
- Check the browser console for any errors during authentication
- Try disconnecting and reconnecting your calendar

### Events not syncing

- Click the refresh button in the calendar view
- Check the Supabase `calendar_sync_log` table for error messages
- Verify the Google Calendar API is enabled in your project

### Quota/Rate Limiting

Google Calendar API has usage quotas:
- 1,000,000 queries per day
- 10 queries per second per user

For most CTMS use cases, these limits are more than sufficient.

## Support

For issues specific to Google Calendar API, refer to:
- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)

For CTMS-specific issues, check the application logs and Supabase sync logs.
