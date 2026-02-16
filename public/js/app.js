// Theme toggle - vanilla JS

// Get current theme
function getTheme() {
  return localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

// Apply theme to document
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('theme', theme);
  updateButton(theme);
}

// Update button text and icon
function updateButton(theme) {
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;

  var sunIcon = btn.querySelector('.sun-icon');
  var moonIcon = btn.querySelector('.moon-icon');
  var label = btn.querySelector('.theme-label');

  if (sunIcon) sunIcon.style.display = theme === 'dark' ? 'block' : 'none';
  if (moonIcon) moonIcon.style.display = theme === 'light' ? 'block' : 'none';
  if (label) label.textContent = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
}

// Toggle theme
function toggleTheme() {
  var current = getTheme();
  var next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

// Initialize
var btn = document.getElementById('theme-toggle');
if (btn) {
  btn.onclick = toggleTheme;
}
updateButton(getTheme());
