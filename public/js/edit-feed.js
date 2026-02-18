// Edit Feed Form Handler
// Loads current feed data and handles updates via PUT /api/feeds/:id

(function() {
  'use strict';

  // DOM element references
  const feedIdInput = document.getElementById('feed-id');
  const feedNameInput = document.getElementById('feed-name');
  const sourceUrlInput = document.getElementById('source-url');
  const feedUrlDisplay = document.getElementById('feed-url-display');
  const itemLimitInput = document.getElementById('item-limit');
  const refreshIntervalSelect = document.getElementById('refresh-interval');
  const btnSave = document.getElementById('btn-save');
  const btnCopyUrl = document.getElementById('btn-copy-url');
  const errorSection = document.getElementById('edit-errors');
  const errorText = document.getElementById('edit-error-text');
  const successSection = document.getElementById('edit-success');
  const successText = document.getElementById('edit-success-text');

  // Track original URL to detect changes
  let originalUrl = '';
  let feedId = '';
  let feedType = 'web';

  /**
   * Extract slug from current URL path
   * Pattern: /feeds/{slug}/edit
   */
  function getSlugFromPath() {
    const parts = window.location.pathname.split('/');
    // /feeds/{slug}/edit => ['', 'feeds', '{slug}', 'edit']
    if (parts.length >= 4 && parts[1] === 'feeds' && parts[3] === 'edit') {
      return parts[2];
    }
    return null;
  }

  /**
   * Toggle loading state on a button
   */
  function setLoading(btn, loading) {
    const spinner = btn.querySelector('.loading');
    if (loading) {
      if (spinner) spinner.classList.remove('hidden');
      btn.disabled = true;
    } else {
      if (spinner) spinner.classList.add('hidden');
      btn.disabled = false;
    }
  }

  /**
   * Validate form fields and return array of error strings
   */
  function validateForm() {
    const errors = [];

    const name = feedNameInput.value.trim();
    if (!name) {
      errors.push('Feed name is required');
    } else if (name.length > 100) {
      errors.push('Feed name must be 100 characters or fewer');
    }

    const url = sourceUrlInput.value.trim();
    if (!url) {
      errors.push('Source URL is required');
    } else {
      try {
        new URL(url);
      } catch (e) {
        errors.push('Source URL must be a valid URL');
      }
    }

    const limit = parseInt(itemLimitInput.value, 10);
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      errors.push('Item limit must be a whole number between 1 and 1000');
    }

    return errors;
  }

  /**
   * Show error message, hide success
   */
  function showError(message) {
    errorText.textContent = message;
    errorSection.classList.remove('hidden');
    successSection.classList.add('hidden');
  }

  /**
   * Show success message, hide error
   */
  function showSuccess(message) {
    successText.textContent = message;
    successSection.classList.remove('hidden');
    errorSection.classList.add('hidden');
  }

  /**
   * Hide both error and success sections
   */
  function hideMessages() {
    errorSection.classList.add('hidden');
    successSection.classList.add('hidden');
  }

  /**
   * Load feed data from API and populate form
   */
  async function loadFeed() {
    const slug = getSlugFromPath();
    if (!slug) {
      showError('Invalid page URL - could not determine feed slug.');
      btnSave.disabled = true;
      return;
    }

    try {
      const response = await fetch('/api/feeds/' + slug);

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.errors ? result.errors.join('. ') : 'Feed not found');
      }

      const feed = await response.json();

      // Populate form fields
      feedId = feed.id;
      feedIdInput.value = feed.id;
      feedNameInput.value = feed.name || '';
      sourceUrlInput.value = feed.url || '';
      itemLimitInput.value = feed.itemLimit !== undefined ? feed.itemLimit : 100;
      feedUrlDisplay.value = feed.feedUrl || '';

      // Populate refresh interval dropdown with current value
      if (refreshIntervalSelect) {
        const currentInterval = feed.refreshIntervalMinutes != null ? String(feed.refreshIntervalMinutes) : '';
        refreshIntervalSelect.value = currentInterval;
      }

      // Store original URL for change detection
      originalUrl = feed.url || '';

      // Display feed type indicator for platform feeds
      feedType = feed.feedType || 'web';
      if (feedType !== 'web') {
        var typeLabel = feedType === 'youtube' ? 'YouTube' : feedType === 'reddit' ? 'Reddit' : feedType;
        var badge = document.createElement('span');
        badge.className = feedType === 'youtube' ? 'badge badge-error badge-sm' : 'badge badge-warning badge-sm';
        badge.textContent = typeLabel;
        // Insert badge after the page heading
        var heading = document.querySelector('h1');
        if (heading) heading.appendChild(document.createTextNode(' ')), heading.appendChild(badge);

        // Make source URL read-only for platform feeds (URL is tied to the channel/subreddit)
        sourceUrlInput.readOnly = true;
        sourceUrlInput.classList.add('opacity-60');
        var urlHint = sourceUrlInput.parentElement.querySelector('.label-text-alt');
        if (urlHint) urlHint.textContent = typeLabel + ' feed — source URL cannot be changed';
      }

    } catch (error) {
      showError('Failed to load feed: ' + (error.message || 'Unknown error'));
      btnSave.disabled = true;
    }
  }

  /**
   * Handle copy feed URL button click
   */
  btnCopyUrl.onclick = function() {
    const url = feedUrlDisplay.value;
    if (!url) return;

    navigator.clipboard.writeText(url).then(function() {
      const originalTitle = btnCopyUrl.title;
      btnCopyUrl.title = 'Copied!';

      // Show brief visual feedback
      const svg = btnCopyUrl.querySelector('svg');
      if (svg) {
        svg.style.color = 'var(--color-success, #16a34a)';
        setTimeout(function() {
          svg.style.color = '';
          btnCopyUrl.title = originalTitle;
        }, 1500);
      }
    }).catch(function() {
      // Fallback: select the text
      feedUrlDisplay.select();
    });
  };

  /**
   * Handle save button click
   */
  btnSave.onclick = async function() {
    hideMessages();

    const errors = validateForm();
    if (errors.length > 0) {
      showError(errors.join('. '));
      return;
    }

    if (!feedId) {
      showError('Feed not loaded. Please refresh the page.');
      return;
    }

    const name = feedNameInput.value.trim();
    const url = sourceUrlInput.value.trim();
    const itemLimit = parseInt(itemLimitInput.value, 10);
    // Parse refresh interval (empty string = manual only = null)
    const intervalValue = refreshIntervalSelect ? refreshIntervalSelect.value : '';
    const refreshIntervalMinutes = intervalValue ? parseInt(intervalValue, 10) : null;

    setLoading(btnSave, true);

    try {
      const response = await fetch('/api/feeds/' + feedId, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, url, itemLimit, refresh_interval_minutes: refreshIntervalMinutes }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.errors ? result.errors.join('. ') : 'Failed to update feed');
      }

      // Update originalUrl to new URL
      originalUrl = url;

      // Update feed URL display if it changed
      if (result.feedUrl) {
        feedUrlDisplay.value = result.feedUrl;
      }

      if (result.urlChanged) {
        showSuccess('Feed updated. URL changed - selectors re-detected automatically.');
      } else {
        showSuccess('Feed updated successfully.');
      }

    } catch (error) {
      showError(error.message || 'Failed to save changes. Please try again.');
    } finally {
      setLoading(btnSave, false);
    }
  };

  // Load feed data when DOM is ready
  document.addEventListener('DOMContentLoaded', loadFeed);

  // If DOM is already loaded (script at end of body), load immediately
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    loadFeed();
  }

})();
