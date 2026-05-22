const STORAGE_KEY = 'gmail_crm_theme';

export function initTheme() {
  applyTheme(localStorage.getItem(STORAGE_KEY) || 'light');
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
}

function applyTheme(theme) {
  document.body.className = `theme-${theme}`;
  document.getElementById('theme-toggle').textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem(STORAGE_KEY, theme);
}

function toggleTheme() {
  applyTheme(localStorage.getItem(STORAGE_KEY) === 'dark' ? 'light' : 'dark');
}
