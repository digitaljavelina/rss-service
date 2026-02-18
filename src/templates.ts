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

  feeds: `<div class="max-w-6xl mx-auto">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold">My Feeds</h1>
      <p class="text-base-content/70 mt-1">Manage your RSS feeds</p>
    </div>
    <a href="/create" class="btn btn-primary">Create New Feed</a>
  </div>

  <!-- Import Section -->
  <div class="flex items-center gap-3 mb-4">
    <button id="import-btn" class="btn btn-outline btn-sm">Import Feed</button>
    <input type="file" id="import-file" accept=".json" class="hidden" />
    <div id="import-error" class="alert alert-error py-2 px-4 text-sm hidden" role="alert"></div>
    <div id="import-success" class="alert alert-success py-2 px-4 text-sm hidden" role="alert"></div>
  </div>

  <!-- Feed Table -->
  <div class="card bg-base-200">
    <div class="card-body p-0">
      <div class="overflow-x-auto">
        <table class="table table-zebra w-full">
          <thead>
            <tr>
              <th>Feed Name</th>
              <th>Items</th>
              <th>Last Updated</th>
              <th>Next Refresh</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="feed-list">
            <tr id="loading-row">
              <td colspan="6" class="text-center py-8 text-base-content/60">Loading feeds...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <dialog id="delete-modal" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg">Delete Feed</h3>
      <p class="py-4">Are you sure you want to delete <strong><span id="delete-feed-name"></span></strong>? This action cannot be undone.</p>
      <div class="modal-action">
        <form method="dialog">
          <button class="btn btn-ghost">Cancel</button>
        </form>
        <button id="confirm-delete" class="btn btn-error">Delete</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</div>
<script src="/js/dashboard.js"></script>`,

  editFeed: `<div class="max-w-2xl mx-auto">
  <div class="flex items-center justify-between mb-2">
    <h1 class="text-3xl font-bold">Edit Feed</h1>
    <a href="/feeds" class="btn btn-ghost btn-sm">Back to Dashboard</a>
  </div>
  <p class="text-base-content/70 mb-8">Update your feed configuration.</p>

  <!-- Error display -->
  <div id="edit-errors" class="alert alert-warning mb-6 hidden">
    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
    <span id="edit-error-text"></span>
  </div>

  <!-- Success display -->
  <div id="edit-success" class="alert alert-success mb-6 hidden">
    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span id="edit-success-text"></span>
  </div>

  <!-- Edit Form Card -->
  <div class="card bg-base-200">
    <div class="card-body">
      <!-- Hidden feed id -->
      <input type="hidden" id="feed-id" />

      <div class="form-control">
        <label class="label">
          <span class="label-text">Feed name</span>
        </label>
        <input type="text" id="feed-name" class="input input-bordered" maxlength="100" required />
      </div>

      <div class="form-control mt-4">
        <label class="label">
          <span class="label-text">Source URL</span>
        </label>
        <input type="url" id="source-url" class="input input-bordered" required />
        <label class="label">
          <span class="label-text-alt text-base-content/60">Changing the URL will re-detect selectors automatically</span>
        </label>
      </div>

      <div class="form-control mt-4">
        <label class="label">
          <span class="label-text">RSS Feed URL</span>
        </label>
        <div class="flex gap-2">
          <input type="text" id="feed-url-display" class="input input-bordered flex-1 opacity-70" readonly />
          <button id="btn-copy-url" class="btn btn-ghost btn-square" type="button" title="Copy feed URL">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      <div class="form-control mt-4">
        <label class="label">
          <span class="label-text">Item limit</span>
        </label>
        <input type="number" id="item-limit" class="input input-bordered" min="1" max="1000" value="100" />
      </div>

      <div class="form-control mt-4">
        <label class="label">
          <span class="label-text">Auto-refresh interval</span>
        </label>
        <select id="refresh-interval" class="select select-bordered">
          <option value="">Manual only</option>
          <option value="15">Every 15 minutes</option>
          <option value="30">Every 30 minutes</option>
          <option value="60">Every hour</option>
          <option value="360">Every 6 hours</option>
          <option value="1440">Daily</option>
        </select>
      </div>

      <!-- Actions -->
      <div class="flex gap-4 mt-6">
        <button id="btn-save" class="btn btn-primary flex-1">
          <span class="loading loading-spinner loading-sm hidden"></span>
          Save Changes
        </button>
        <a href="/feeds" class="btn btn-ghost flex-1">Cancel</a>
      </div>
    </div>
  </div>
</div>
<script src="/js/edit-feed.js"></script>`,

  create: `<div class="max-w-2xl mx-auto">
  <h1 class="text-3xl font-bold mb-2">Create New Feed</h1>
  <p class="text-base-content/70 mb-8">Enter a URL and we'll automatically detect the content.</p>

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
      <h3 class="font-bold">Feed Created!</h3>
      <div class="text-sm">Your feed is ready. <a id="feed-url-link" href="#" target="_blank" class="link link-primary">Open RSS Feed</a></div>
    </div>
  </div>

  <!-- Simple Form Card -->
  <div class="card bg-base-200">
    <div class="card-body">
      <div class="form-control">
        <label class="label">
          <span class="label-text">URL to create feed from</span>
        </label>
        <input type="url" id="source-url" placeholder="https://news.ycombinator.com" class="input input-bordered" required autofocus />
      </div>

      <div class="form-control mt-4">
        <label class="label">
          <span class="label-text">Feed name</span>
        </label>
        <input type="text" id="feed-name" placeholder="Hacker News" class="input input-bordered" required />
      </div>

      <div class="form-control mt-4">
        <label class="label">
          <span class="label-text">Auto-refresh interval</span>
        </label>
        <select id="refresh-interval" class="select select-bordered">
          <option value="">Manual only</option>
          <option value="15">Every 15 minutes</option>
          <option value="30">Every 30 minutes</option>
          <option value="60" selected>Every hour</option>
          <option value="360">Every 6 hours</option>
          <option value="1440">Daily</option>
        </select>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-4 mt-6">
        <button id="btn-preview" class="btn btn-outline flex-1">
          <span class="loading loading-spinner loading-sm hidden"></span>
          Preview
        </button>
        <button id="btn-save" class="btn btn-primary flex-1" disabled>
          <span class="loading loading-spinner loading-sm hidden"></span>
          Create Feed
        </button>
      </div>
    </div>
  </div>

  <!-- Preview Section -->
  <div id="preview-section" class="mt-8 hidden">
    <div class="divider">Preview</div>

    <div id="preview-meta" class="text-sm text-base-content/70 mb-4"></div>

    <div id="preview-items" class="space-y-3"></div>

  </div>
</div>
<script src="/js/create-feed.js"></script>`
};
