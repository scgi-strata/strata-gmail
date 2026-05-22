export const CONFIG = {
  CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID_HERE',
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',
  SCOPES: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/spreadsheets',
  ].join(' '),
};
