// Dashboard Feed Management
// Handles loading, refreshing, deleting, exporting, and importing feeds on the /feeds page

(function() {
  'use strict';

  // DOM references
  const feedList = document.getElementById('feed-list');
  const deleteModal = document.getElementById('delete-modal');
  const deleteFeedName = document.getElementById('delete-feed-name');
  const confirmDeleteBtn = document.getElementById('confirm-delete');
  const importFileInput = document.getElementById('import-file');
  const importBtn = document.getElementById('import-btn');
  const importError = document.getElementById('import-error');
  const importSuccess = document.getElementById('import-success');

  // State
  let pendingDeleteId = null;

  /**
   * Format a date string as relative time or absolute date
   */
  function formatDate(dateString) {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown';

    const now = new Date();
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return diffMinutes + ' min' + (diffMinutes !== 1 ? 's' : '') + ' ago';
    if (diffHours < 24) return diffHours + ' hour' + (diffHours !== 1 ? 's' : '') + ' ago';
    if (diffDays < 7) return diffDays + ' day' + (diffDays !== 1 ? 's' : '') + ' ago';

    // Older than a week: show date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /**
   * Get status badge element based on feed's updatedAt timestamp
   */
  function getStatusBadge(feed) {
    const badge = document.createElement('span');
    badge.className = 'badge';

    if (!feed.updatedAt) {
      badge.classList.add('badge-warning');
      badge.textContent = 'No data';
      return badge;
    }

    const updatedAt = new Date(feed.updatedAt);
    const now = new Date();
    const diffHours = (now - updatedAt) / (1000 * 60 * 60);

    if (diffHours < 24) {
      badge.classList.add('badge-success');
      badge.textContent = 'OK';
    } else {
      badge.classList.add('badge-warning');
      badge.textContent = 'Stale';
    }

    return badge;
  }

  /**
   * Create a table row element for a feed
   */
  function createFeedRow(feed) {
    const tr = document.createElement('tr');
    tr.setAttribute('data-feed-id', feed.id);

    // Name cell - link to edit page
    const nameTd = document.createElement('td');
    const nameLink = document.createElement('a');
    nameLink.href = '/feeds/' + feed.slug + '/edit';
    nameLink.className = 'link link-primary font-medium';
    nameLink.textContent = feed.name;
    nameTd.appendChild(nameLink);
    tr.appendChild(nameTd);

    // Status cell
    const statusTd = document.createElement('td');
    statusTd.appendChild(getStatusBadge(feed));
    tr.appendChild(statusTd);

    // Items cell
    const itemsTd = document.createElement('td');
    itemsTd.textContent = feed.itemCount !== undefined ? String(feed.itemCount) : '0';
    tr.appendChild(itemsTd);

    // Last updated cell
    const updatedTd = document.createElement('td');
    updatedTd.className = 'text-sm text-base-content/70';
    updatedTd.textContent = formatDate(feed.updatedAt);
    tr.appendChild(updatedTd);

    // Actions cell
    const actionsTd = document.createElement('td');
    actionsTd.className = 'flex gap-2 items-center';

    // Refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'btn btn-ghost btn-xs';
    refreshBtn.setAttribute('data-action', 'refresh');
    refreshBtn.setAttribute('data-feed-id', feed.id);
    refreshBtn.textContent = 'Refresh';
    actionsTd.appendChild(refreshBtn);

    // Export button
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-ghost btn-xs';
    exportBtn.setAttribute('data-action', 'export');
    exportBtn.setAttribute('data-feed-id', feed.id);
    exportBtn.setAttribute('data-feed-slug', feed.slug);
    exportBtn.setAttribute('data-feed-name', feed.name);
    exportBtn.textContent = 'Export';
    actionsTd.appendChild(exportBtn);

    // Edit link
    const editLink = document.createElement('a');
    editLink.href = '/feeds/' + feed.slug + '/edit';
    editLink.className = 'btn btn-ghost btn-xs';
    editLink.textContent = 'Edit';
    actionsTd.appendChild(editLink);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-ghost btn-xs text-error';
    deleteBtn.setAttribute('data-action', 'delete');
    deleteBtn.setAttribute('data-feed-id', feed.id);
    deleteBtn.setAttribute('data-feed-name', feed.name);
    deleteBtn.textContent = 'Delete';
    actionsTd.appendChild(deleteBtn);

    tr.appendChild(actionsTd);
    return tr;
  }

  /**
   * Show empty state when no feeds exist
   */
  function showEmptyState() {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.setAttribute('colspan', '5');
    td.className = 'text-center py-12';

    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col items-center gap-4';

    const message = document.createElement('p');
    message.className = 'text-base-content/60';
    message.textContent = 'No feeds yet.';
    wrapper.appendChild(message);

    const createLink = document.createElement('a');
    createLink.href = '/create';
    createLink.className = 'btn btn-primary btn-sm';
    createLink.textContent = 'Create your first feed';
    wrapper.appendChild(createLink);

    td.appendChild(wrapper);
    tr.appendChild(td);
    feedList.appendChild(tr);
  }

  /**
   * Refresh a feed by ID
   */
  async function refreshFeed(feedId) {
    // Find and disable the refresh button
    const refreshBtn = feedList.querySelector('[data-action="refresh"][data-feed-id="' + feedId + '"]');
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Refreshing...';
    }

    try {
      const response = await fetch('/api/feeds/' + feedId + '/refresh', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Refresh failed');
      }

      // Reload the feed list to show updated data
      await loadFeeds();
    } catch (error) {
      alert('Failed to refresh feed: ' + (error.message || 'Unknown error'));

      // Re-enable button on error
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Refresh';
      }
    }
  }

  /**
   * Export a feed configuration as a JSON file download
   */
  async function exportFeed(slug, name) {
    try {
      const response = await fetch('/api/feeds/' + slug + '?include=items');
      if (!response.ok) {
        throw new Error('Failed to fetch feed details');
      }

      const feed = await response.json();

      const config = {
        name: feed.name,
        url: feed.url,
        selectors: feed.selectors || null,
        itemLimit: feed.itemLimit || null,
        items: feed.items || [],
        exportedAt: new Date().toISOString()
      };

      const json = JSON.stringify(config, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = slug + '-config.json';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      // Clean up object URL immediately to free memory
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to export feed: ' + (error.message || 'Unknown error'));
    }
  }

  /**
   * Validate a feed config object from import
   */
  function validateFeedConfig(config) {
    if (!config || typeof config !== 'object') return false;
    if (!config.name || typeof config.name !== 'string') return false;
    if (!config.url || typeof config.url !== 'string') return false;

    // Validate URL format
    try {
      new URL(config.url);
    } catch (_) {
      return false;
    }

    return true;
  }

  /**
   * Show an import error message
   */
  function showImportError(message) {
    if (!importError) return;
    importError.textContent = message;
    importError.classList.remove('hidden');
    if (importSuccess) importSuccess.classList.add('hidden');
  }

  /**
   * Hide the import error message
   */
  function hideImportError() {
    if (!importError) return;
    importError.classList.add('hidden');
  }

  /**
   * Show an import success message
   */
  function showImportSuccess(message) {
    if (!importSuccess) return;
    importSuccess.textContent = message;
    importSuccess.classList.remove('hidden');
    if (importError) importError.classList.add('hidden');

    // Auto-hide after 4 seconds
    setTimeout(function() {
      if (importSuccess) importSuccess.classList.add('hidden');
    }, 4000);
  }

  /**
   * Import a feed configuration by posting to the API
   */
  async function importFeed(config) {
    const body = {
      name: config.name,
      url: config.url
    };

    if (config.selectors) {
      body.selectors = config.selectors;
    }

    if (config.items && config.items.length > 0) {
      body.items = config.items;
    }

    const response = await fetch('/api/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMsg = result.errors ? result.errors.join(', ') : (result.error || 'Import failed');
      throw new Error(errorMsg);
    }

    return result;
  }

  /**
   * Load all feeds and populate the table
   */
  async function loadFeeds() {
    // Clear existing rows
    while (feedList.firstChild) {
      feedList.removeChild(feedList.firstChild);
    }

    // Show loading row
    const loadingTr = document.createElement('tr');
    loadingTr.id = 'loading-row';
    const loadingTd = document.createElement('td');
    loadingTd.setAttribute('colspan', '5');
    loadingTd.className = 'text-center py-8 text-base-content/60';
    loadingTd.textContent = 'Loading feeds...';
    loadingTr.appendChild(loadingTd);
    feedList.appendChild(loadingTr);

    try {
      const response = await fetch('/api/feeds');

      if (!response.ok) {
        throw new Error('Failed to fetch feeds');
      }

      const feeds = await response.json();

      // Clear loading row
      while (feedList.firstChild) {
        feedList.removeChild(feedList.firstChild);
      }

      if (!feeds || feeds.length === 0) {
        showEmptyState();
        return;
      }

      feeds.forEach(function(feed) {
        feedList.appendChild(createFeedRow(feed));
      });
    } catch (error) {
      // Clear loading row and show error
      while (feedList.firstChild) {
        feedList.removeChild(feedList.firstChild);
      }

      const errorTr = document.createElement('tr');
      const errorTd = document.createElement('td');
      errorTd.setAttribute('colspan', '5');
      errorTd.className = 'text-center py-8';

      const errorMsg = document.createElement('div');
      errorMsg.className = 'alert alert-error max-w-md mx-auto';
      errorMsg.textContent = 'Failed to load feeds: ' + (error.message || 'Unknown error');
      errorTd.appendChild(errorMsg);
      errorTr.appendChild(errorTd);
      feedList.appendChild(errorTr);
    }
  }

  // Event delegation for action buttons
  document.addEventListener('click', function(event) {
    const target = event.target;
    if (!target || !target.getAttribute) return;

    const action = target.getAttribute('data-action');
    if (!action) return;

    const feedId = target.getAttribute('data-feed-id');

    if (action === 'refresh') {
      if (!feedId) return;
      refreshFeed(feedId);
    } else if (action === 'export') {
      const feedSlug = target.getAttribute('data-feed-slug');
      const feedName = target.getAttribute('data-feed-name') || '';
      if (!feedSlug) return;
      exportFeed(feedSlug, feedName);
    } else if (action === 'delete') {
      if (!feedId) return;
      const feedName = target.getAttribute('data-feed-name') || 'this feed';
      pendingDeleteId = feedId;
      deleteFeedName.textContent = feedName;
      deleteModal.showModal();
    }
  });

  // Import button - opens file picker
  if (importBtn) {
    importBtn.onclick = function() {
      hideImportError();
      if (importFileInput) importFileInput.click();
    };
  }

  // Import file input - handles file selection and processing
  if (importFileInput) {
    importFileInput.addEventListener('change', function(e) {
      const file = e.target.files && e.target.files[0];

      // Reset input so same file can be selected again
      importFileInput.value = '';

      if (!file) return;

      hideImportError();

      const reader = new FileReader();

      reader.onload = async function(readerEvent) {
        const text = readerEvent.target && readerEvent.target.result;

        // Parse JSON
        let config;
        try {
          config = JSON.parse(text);
        } catch (_) {
          showImportError('Invalid file: could not parse JSON. Please select a valid feed config file.');
          return;
        }

        // Validate config structure
        if (!validateFeedConfig(config)) {
          showImportError('Invalid config: file must contain a valid "name" and "url" field with a valid URL.');
          return;
        }

        // Import the feed
        try {
          await importFeed(config);
          showImportSuccess('Feed "' + config.name + '" imported successfully!');
          await loadFeeds();
        } catch (error) {
          showImportError('Import failed: ' + (error.message || 'Unknown error'));
        }
      };

      reader.onerror = function() {
        showImportError('Failed to read file. Please try again.');
      };

      reader.readAsText(file);
    });
  }

  // Delete confirmation handler
  confirmDeleteBtn.onclick = async function() {
    if (!pendingDeleteId) return;

    const feedIdToDelete = pendingDeleteId;
    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = 'Deleting...';

    try {
      const response = await fetch('/api/feeds/' + feedIdToDelete, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.errors ? result.errors.join(', ') : 'Delete failed');
      }

      // Remove the row from DOM
      const row = feedList.querySelector('[data-feed-id="' + feedIdToDelete + '"]');
      if (row) {
        feedList.removeChild(row);
      }

      // Check if table is now empty
      const remainingRows = feedList.querySelectorAll('tr[data-feed-id]');
      if (remainingRows.length === 0) {
        showEmptyState();
      }

      // Close modal
      deleteModal.close();
    } catch (error) {
      alert('Failed to delete feed: ' + (error.message || 'Unknown error'));
      deleteModal.close();
    } finally {
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.textContent = 'Delete';
      pendingDeleteId = null;
    }
  };

  // Load feeds when DOM is ready
  document.addEventListener('DOMContentLoaded', loadFeeds);

  // If DOM is already loaded (script at end of body), load immediately
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    loadFeeds();
  }

})();
