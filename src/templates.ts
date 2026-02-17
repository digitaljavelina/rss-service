// Embedded templates for serverless compatibility

export const layout = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RSS Service</title>
  <link rel="stylesheet" href="/css/styles.css">
  <script>
    (function() {
      const theme = localStorage.getItem('theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') document.documentElement.classList.add('dark');
    })();
  </script>
</head>
<body class="bg-base-100 flex">
  {{sidebar}}
  <main class="flex-1 p-8">
    {{content}}
  </main>
  <script src="/js/app.js?v=3"></script>
</body>
</html>`;

export const sidebar = `<aside class="w-64 min-h-screen bg-base-200 flex flex-col">
  <div class="p-6">
    <h1 class="text-xl font-bold">RSS Service</h1>
  </div>

  <nav class="flex-1">
    <ul class="menu">
      <li><a href="/" class="active">Dashboard</a></li>
      <li><a href="/feeds">My Feeds</a></li>
      <li><a href="/create">Create Feed</a></li>
      <li><a href="/settings">Settings</a></li>
    </ul>
  </nav>

  <div class="p-4">
    <button
      id="theme-toggle"
      class="btn btn-ghost btn-block gap-2"
      type="button"
    >
      <!-- Sun icon (show in dark mode) -->
      <svg class="sun-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="display: none;">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
      <!-- Moon icon (show in light mode) -->
      <svg class="moon-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
      <span class="theme-label">Dark Mode</span>
    </button>
  </div>
</aside>`;

export const pages: Record<string, string> = {
  home: `<div class="max-w-4xl mx-auto">
  <div class="hero min-h-[60vh]">
    <div class="hero-content text-center">
      <div class="max-w-2xl">
        <h1 class="text-5xl font-bold mb-4">Create RSS feeds from anything</h1>
        <p class="text-xl mb-8">Point at any URL, select what content matters, and get a feed you can subscribe to in your reader.</p>

        <a href="/create" class="btn btn-primary btn-lg">Create Your First Feed</a>
      </div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
    <div class="card bg-base-200">
      <div class="card-body items-center text-center">
        <div class="text-4xl mb-4">1</div>
        <h3 class="card-title text-lg">Enter URL</h3>
        <p class="text-sm">Paste any webpage URL you want to track</p>
      </div>
    </div>

    <div class="card bg-base-200">
      <div class="card-body items-center text-center">
        <div class="text-4xl mb-4">2</div>
        <h3 class="card-title text-lg">Select Content</h3>
        <p class="text-sm">Choose which elements to include in your feed</p>
      </div>
    </div>

    <div class="card bg-base-200">
      <div class="card-body items-center text-center">
        <div class="text-4xl mb-4">3</div>
        <h3 class="card-title text-lg">Subscribe</h3>
        <p class="text-sm">Use the generated feed URL in any RSS reader</p>
      </div>
    </div>
  </div>

  <div class="alert alert-info">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    <div>
      <h3 class="font-bold">Getting Started</h3>
      <div class="text-sm">Ready to create your first feed? Click the button above or use the "Create Feed" link in the sidebar.</div>
    </div>
  </div>
</div>`
};
