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
</div>`,

  create: `<div class="max-w-4xl mx-auto">
  <h1 class="text-3xl font-bold mb-8">Create New Feed</h1>

  <!-- Error display -->
  <div id="preview-errors" class="alert alert-warning mb-6 hidden">
    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
    <span id="preview-error-text"></span>
  </div>

  <!-- Success section -->
  <div id="success-section" class="alert alert-success mb-6 hidden">
    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div>
      <h3 class="font-bold">Feed Created Successfully!</h3>
      <div class="text-sm">Your feed is ready. <a id="feed-url-link" href="#" target="_blank" class="link link-primary">Open RSS Feed</a></div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Feed Details Card -->
    <div class="card bg-base-200">
      <div class="card-body">
        <h2 class="card-title">Feed Details</h2>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Feed Name</span>
          </label>
          <input type="text" id="feed-name" placeholder="My News Feed" class="input input-bordered" required />
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Source URL</span>
          </label>
          <input type="url" id="source-url" placeholder="https://example.com/news" class="input input-bordered" required />
        </div>
      </div>
    </div>

    <!-- CSS Selectors Card -->
    <div class="card bg-base-200">
      <div class="card-body">
        <h2 class="card-title">CSS Selectors</h2>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Item Container</span>
          </label>
          <input type="text" id="selector-item" placeholder=".article, .post" class="input input-bordered font-mono" required />
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Title Selector</span>
          </label>
          <input type="text" id="selector-title" placeholder="h2, .title" class="input input-bordered font-mono" required />
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Link Selector (optional)</span>
          </label>
          <input type="text" id="selector-link" placeholder="a" class="input input-bordered font-mono" />
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Description Selector (optional)</span>
          </label>
          <input type="text" id="selector-description" placeholder=".summary, p" class="input input-bordered font-mono" />
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Date Selector (optional)</span>
          </label>
          <input type="text" id="selector-date" placeholder=".date, time" class="input input-bordered font-mono" />
        </div>
      </div>
    </div>
  </div>

  <!-- Action Buttons -->
  <div class="flex gap-4 mt-6">
    <button id="btn-preview" class="btn btn-outline">
      <span class="loading loading-spinner loading-sm hidden"></span>
      Preview
    </button>
    <button id="btn-save" class="btn btn-primary" disabled>
      <span class="loading loading-spinner loading-sm hidden"></span>
      Save Feed
    </button>
  </div>

  <!-- Preview Section -->
  <div id="preview-section" class="mt-8 hidden">
    <div class="divider">Preview Results</div>

    <div id="preview-meta" class="text-sm text-base-content/70 mb-4"></div>

    <div id="preview-items" class="space-y-4"></div>
  </div>
</div>
<script src="/js/create-feed.js"></script>`
};
