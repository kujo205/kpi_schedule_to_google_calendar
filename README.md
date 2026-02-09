# KPI Schedule to Google Calendar

Sync your KPI university schedule to Google Calendar automatically.

## Features

- Fetches schedule from KPI Campus API
- Syncs to a dedicated Google Calendar
- OAuth 2.0 authentication (one-time browser authorization)
- Interactive conflict resolution for overlapping lessons
- Automatic duplicate detection
- Full lesson metadata in event details

## Prerequisites

- Node.js 18+ 
- pnpm (or npm)
- Google account
- KPI group ID (UUID format)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd kpi_schedule_to_google_calendar

# Install dependencies
pnpm install
```

## First Time Setup

### Step 1: Run the sync command

```bash
pnpm sync <your-group-id>
```

Example:
```bash
pnpm sync 482eb988-e88c-47dc-8246-7cc7daa7c752
```

### Step 2: Authorize with Google

On first run:
1. Your browser will open automatically
2. Sign in to your Google account
3. Click "Allow" to grant calendar access
4. Return to terminal - sync will continue automatically

Your authorization is saved in `~/.kpi-calendar/token.json` and will work for future runs without requiring browser interaction.

## Usage

### Sync Schedule

```bash
pnpm sync <group-id>
```

The script will:
1. Fetch schedule from KPI API
2. Process lessons from both weeks
3. Prompt you to resolve time conflicts (when multiple lessons are scheduled at the same time)
4. Create events in "KPI Schedule" calendar
5. Skip events that already exist

### Conflict Resolution

When multiple lessons are scheduled at the same time, you'll see:

```
⚠️  Multiple lessons at Monday, Feb 2 08:30:

◯ Комп'ютерна лінгвістика (Лек) - Фіногенов О.Д.
◯ Оптимізація та балансування навантажень у БД (Лек) - Галушко Д.О.
◯ Програмування комп'ютерної графіки (Лек) - Порєв В.М.

(Use space to select, enter to confirm)
```

Use:
- **Space** to select/deselect lessons
- **Enter** to confirm your selection
- You can select multiple or none

### Re-authenticate

If you need to switch Google accounts or re-authorize:

```bash
pnpm reauth
```

Then run sync again:

```bash
pnpm sync <group-id>
```

## Event Format

### Event Title
```
Lesson Name (Type) - Teacher Initials
```
Example: `Комп'ютерна лінгвістика (Лек) - Фіногенов О.Д.`

### Event Details
- **Duration:** 90 minutes
- **Timezone:** Europe/Kiev
- **Description:** Full teacher name, lesson type, room number, lecturer ID
- **Location:** Room number (if available)

### Calendar
All events are created in a dedicated calendar called **"KPI Schedule"**.

## Development

### Build TypeScript

```bash
pnpm build
```

### Run with tsx (development)

```bash
pnpm dev <group-id>
```

### Type Check

```bash
pnpm type-check
```

## Project Structure

```
kpi_schedule_to_google_calendar/
├── src/
│   ├── auth/              # OAuth authentication
│   ├── api/               # KPI API client
│   ├── models/            # TypeScript interfaces
│   ├── services/          # Business logic
│   ├── utils/             # Helper functions
│   └── index.ts           # CLI entry point
├── credentials/           # OAuth credentials (gitignored)
├── dist/                  # Compiled JavaScript
└── package.json
```

## Troubleshooting

### "Credentials file not found"
Make sure `credentials/client_secret.json` exists. This file should be in the repository (it's safe to commit for desktop OAuth apps).

### "Invalid group ID format"
Group IDs must be in UUID format:
```
Example: 482eb988-e88c-47dc-8246-7cc7daa7c752
```

### "Authorization timeout"
If the OAuth callback doesn't complete:
1. Make sure port 3000 is not in use
2. Check if your browser blocked the popup
3. Try copying the URL manually if browser doesn't open

### Token issues
Clear your saved token and re-authenticate:
```bash
pnpm reauth
```

### Events appear at wrong time
All events use Europe/Kiev timezone. If you're in a different timezone, Google Calendar will automatically adjust the display times.

## Finding Your Group ID

1. Go to [KPI Schedule](https://schedule.kpi.ua/)
2. Select your group
3. Look at the URL - the UUID at the end is your group ID
4. Or check the API directly: https://api.campus.kpi.ua/schedule/lessons?groupId=YOUR-UUID

## Privacy & Security

- OAuth credentials (`client_secret.json`) are safe to commit for desktop apps
- Your personal token is stored in `~/.kpi-calendar/token.json` (never committed)
- The app only requests calendar access, no other Google data
- Schedule data is fetched directly from KPI's public API

## License

ISC
