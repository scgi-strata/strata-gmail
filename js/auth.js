import { CONFIG } from './config.js';
import { showToast } from './utils.js';

let tokenClient = null;
let gapiReady = false;
let gsiReady = false;
let onSignedIn = null;

export function initAuth(signedInCallback) {
  onSignedIn = signedInCallback;
  waitForGapi();
  waitForGsi();
}

function waitForGapi() {
  if (typeof gapi === 'undefined') { setTimeout(waitForGapi, 100); return; }
  gapi.load('client', async () => {
    try {
      await gapi.client.init({
        discoveryDocs: [
          'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
          'https://www.googleapis.com/discovery/v1/apis/sheets/v4/rest',
        ],
      });
      gapiReady = true;
      maybeReady();
    } catch {
      showToast('Failed to load Google APIs. Please refresh.', 'error');
    }
  });
}

function waitForGsi() {
  if (typeof google === 'undefined') { setTimeout(waitForGsi, 100); return; }
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID,
    scope: CONFIG.SCOPES,
    callback: (response) => {
      if (response.error) {
        showToast('Sign-in failed: ' + response.error, 'error');
        showAuthScreen();
        return;
      }
      gapi.client.setToken(response);
      showAppShell();
      if (onSignedIn) onSignedIn();
    },
  });
  gsiReady = true;
  maybeReady();
}

function maybeReady() {
  if (!gapiReady || !gsiReady) return;
  const btn = document.getElementById('sign-in-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

export function signOut() {
  const token = gapi.client.getToken();
  if (token) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken(null);
  }
  showAuthScreen();
}

function showAppShell() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
}

function showAuthScreen() {
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
}
