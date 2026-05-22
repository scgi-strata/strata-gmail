# Gmail CRM

A Gmail-connected CRM hosted on GitHub Pages. Priority inbox, follow-up tracking, contact history, and private notes — no server, no monthly cost.

## Features

- **Dashboard** — stat cards (Overdue / Due Today / Unread) + priority inbox sorted by urgency tier
- **Follow-ups** — all tracked threads with due dates, color-coded by urgency (Overdue / Today / This Week / Upcoming)
- **Contacts** — searchable list with editable notes and full email history per contact
- **Thread panel** — full email thread + CRM fields (status, follow-up date, notes) with 400ms auto-save
- **Search** — full Gmail search from the nav bar (press Enter)
- **Light/dark theme** — toggle with 🌙/☀️, persisted across sessions

## Setup

### 1. Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project: **Gmail CRM**
3. Enable: **Gmail API** and **Google Sheets API** (APIs & Services → Library)
4. APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application)
   - Authorized JavaScript origins: `https://<username>.github.io`
   - Authorized redirect URIs: `https://<username>.github.io/gmail-crm/`
5. Copy the **Client ID**

### 2. Google Spreadsheet

1. Create a new blank spreadsheet at [sheets.google.com](https://sheets.google.com)
2. Rename Sheet1 → `Contacts`, add a second sheet: `Threads`
3. `Contacts` headers (row 1): `email`, `name`, `company`, `notes`, `last_contacted`
4. `Threads` headers (row 1): `thread_id`, `contact_email`, `subject`, `status`, `follow_up_date`, `notes`, `updated_at`
5. Copy the **Spreadsheet ID** from the URL

### 3. Configure the App

Edit `js/config.js`:

```js
export const CONFIG = {
  CLIENT_ID: 'your-client-id.apps.googleusercontent.com',
  SPREADSHEET_ID: 'your-spreadsheet-id',
  ...
};
```

### 4. Deploy to GitHub Pages

1. Push all files to the `main` branch of your GitHub repo
2. Settings → Pages → Source: **Deploy from branch** → `main`, `/root`
3. Wait 1–2 minutes — your app is live at `https://<username>.github.io/gmail-crm/`

> After deployment, add `https://<username>.github.io` to your OAuth authorized JavaScript origins and `https://<username>.github.io/gmail-crm/` to authorized redirect URIs in Google Cloud Console.

## Local Development

```bash
python -m http.server 8000
# Open http://localhost:8000
```

Add `http://localhost:8000` and `http://localhost:8000/` to your OAuth authorized origins and redirect URIs.

## Architecture

| Layer | Technology |
|---|---|
| Hosting | GitHub Pages (free) |
| Frontend | Vanilla HTML + CSS + JS (ES modules, no build step) |
| Email data | Gmail API v1 (read-only) |
| CRM storage | Google Sheets API v4 |
| Auth | Google OAuth 2.0 via Google Identity Services |
| Theme | Light/dark, persisted in localStorage |

## Status Tags

| Tag | Meaning |
|---|---|
| Urgent | Needs immediate action |
| Pending | Waiting on your response |
| Waiting | Waiting on someone else |
| Closed | Resolved |
