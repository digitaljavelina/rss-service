// Create Feed Form Handler
// Simplified UI - headless browser and selector detection are automatic

(function() {
  'use strict';

  // DOM element references
  const feedName = document.getElementById('feed-name');
  const sourceUrl = document.getElementById('source-url');
  const refreshInterval = document.getElementById('refresh-interval');
  const btnPreview = document.getElementById('btn-preview');
  const btnSave = document.getElementById('btn-save');
  const previewSection = document.getElementById('preview-section');
  const previewMeta = document.getElementById('preview-meta');
  const previewItems = document.getElementById('preview-items');
  const previewErrors = document.getElementById('preview-errors');
  const previewErrorText = document.getElementById('preview-error-text');
  const successSection = document.getElementById('success-section');
  const feedUrlDisplay = document.getElementById('feed-url-display');
  const btnCopyUrl = document.getElementById('btn-copy-url');

  // Platform tab elements
  const platformTabs = document.getElementById('platform-tabs');
  const platformHint = document.getElementById('platform-hint');
  const urlHelp = document.getElementById('url-help');

  // Store preview data for save
  let lastPreviewData = null;
  let selectedPlatform = 'web';
  let autoSwitching = false;

  // Platform tab config
  var platformConfig = {
    web: { placeholder: 'https://news.ycombinator.com', hint: '', help: 'Any website with articles, blog posts, or listings' },
    youtube: { placeholder: 'https://www.youtube.com/@ChannelName', hint: 'Requires a YouTube API key (configure in Settings)', help: 'Channel URL, @handle, or playlist URL' },
    reddit: { placeholder: 'https://www.reddit.com/r/technology', hint: 'Uses Reddit\'s built-in RSS — no API key needed', help: 'Subreddit URL like /r/name or user URL like /u/name' },
  };

  // Platform tab switching
  if (platformTabs) {
    platformTabs.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-platform]');
      if (!btn) return;
      var platform = btn.getAttribute('data-platform');
      if (!platform || platform === selectedPlatform) return;

      selectedPlatform = platform;

      // Update active tab styles
      var tabs = platformTabs.querySelectorAll('[data-platform]');
      tabs.forEach(function(tab) {
        if (tab.getAttribute('data-platform') === platform) {
          tab.className = 'btn btn-sm btn-active';
          tab.setAttribute('aria-selected', 'true');
        } else {
          tab.className = 'btn btn-sm btn-ghost';
          tab.setAttribute('aria-selected', 'false');
        }
      });

      // Update URL input and hints
      var config = platformConfig[platform] || platformConfig.web;
      sourceUrl.placeholder = config.placeholder;
      if (urlHelp) urlHelp.textContent = config.help;
      if (platformHint) {
        if (config.hint) {
          platformHint.textContent = config.hint;
          platformHint.classList.remove('hidden');
        } else {
          platformHint.classList.add('hidden');
        }
      }

      // Reset preview when user manually switches platforms (not auto-detect)
      if (!autoSwitching) {
        previewSection.classList.add('hidden');
        previewErrors.classList.add('hidden');
        lastPreviewData = null;
        btnSave.disabled = true;
      }
    });
  }

  /**
   * Toggle loading state on a button
   */
  function setLoading(btn, loading) {
    const spinner = btn.querySelector('.loading');
    if (loading) {
      spinner.classList.remove('hidden');
      btn.disabled = true;
    } else {
      spinner.classList.add('hidden');
      btn.disabled = false;
    }
  }

  /**
   * Validate form and return array of error strings
   */
  function validateForm() {
    const errors = [];
    const url = sourceUrl.value.trim();

    if (!url) {
      errors.push('URL is required');
    } else {
      try {
        new URL(url);
      } catch (e) {
        errors.push('Please enter a valid URL');
      }
    }

    return errors;
  }

  /**
   * Clear all child elements from a container
   */
  function clearChildren(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  /**
   * Render preview data
   */
  function renderPreview(data) {
    // Hide errors
    previewErrors.classList.add('hidden');

    // Show preview section
    previewSection.classList.remove('hidden');

    // Update meta info
    const itemCount = data.items ? data.items.length : 0;
    previewMeta.textContent = 'Found ' + itemCount + ' item' + (itemCount !== 1 ? 's' : '');

    // Clear previous items safely
    clearChildren(previewItems);

    if (!data.items || data.items.length === 0) {
      const noItems = document.createElement('div');
      noItems.className = 'alert alert-warning';
      noItems.textContent = 'No content detected on this page. Try a different URL.';
      previewItems.appendChild(noItems);
    } else {
      // Render items (limit to 5 for preview)
      const itemsToShow = data.items.slice(0, 5);
      itemsToShow.forEach(function(item) {
        const card = document.createElement('div');
        card.className = 'card bg-base-100 shadow-sm';

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body py-3 px-4';

        // Title
        const title = document.createElement('h3');
        title.className = 'font-medium';
        title.textContent = item.title || '(No title)';
        cardBody.appendChild(title);

        // Link
        if (item.link) {
          const link = document.createElement('a');
          link.href = item.link;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.className = 'text-xs link link-primary truncate block opacity-60';
          link.textContent = item.link;
          cardBody.appendChild(link);
        }

        card.appendChild(cardBody);
        previewItems.appendChild(card);
      });

      // Show "and N more" if applicable
      if (data.items.length > 5) {
        const more = document.createElement('div');
        more.className = 'text-center text-sm text-base-content/60 py-2';
        more.textContent = '+ ' + (data.items.length - 5) + ' more items';
        previewItems.appendChild(more);
      }
    }

    // Auto-fill feed name from page title if empty
    if (!feedName.value.trim() && data.metadata && data.metadata.pageTitle) {
      feedName.value = data.metadata.pageTitle;
    }
  }

  /**
   * Show error in preview section
   */
  function showPreviewError(message) {
    previewSection.classList.add('hidden');
    previewErrors.classList.remove('hidden');
    previewErrorText.textContent = message;
  }

  /**
   * Hide all errors
   */
  function hideErrors() {
    previewErrors.classList.add('hidden');
  }

  /**
   * Disable all form inputs
   */
  function disableForm() {
    feedName.disabled = true;
    sourceUrl.disabled = true;
    if (refreshInterval) refreshInterval.disabled = true;
    btnPreview.disabled = true;
    btnSave.disabled = true;
  }

  /**
   * Call preview API
   */
  async function callPreviewApi(url) {
    const response = await fetch('/api/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.errors ? result.errors.join('. ') : 'Preview failed');
    }

    return result;
  }

  // Preview button click handler
  btnPreview.onclick = async function() {
    hideErrors();

    // Validate form
    const errors = validateForm();
    if (errors.length > 0) {
      showPreviewError(errors.join('. '));
      return;
    }

    const url = sourceUrl.value.trim();

    setLoading(btnPreview, true);

    try {
      const result = await callPreviewApi(url);

      // Store for save (including whether headless was used)
      lastPreviewData = result;

      // Auto-select platform tab if preview detected a platform
      if (result.platformInfo && result.platformInfo.feedType && platformTabs) {
        var detected = result.platformInfo.feedType;
        if (detected !== selectedPlatform) {
          autoSwitching = true;
          var tabBtn = platformTabs.querySelector('[data-platform="' + detected + '"]');
          if (tabBtn) tabBtn.click();
          autoSwitching = false;
        }
      }

      // Render preview
      renderPreview(result);

      // Enable save button if items found
      if (result.items && result.items.length > 0) {
        btnSave.disabled = false;
      }
    } catch (error) {
      showPreviewError(error.message || 'Failed to preview. Please check the URL and try again.');
      lastPreviewData = null;
      btnSave.disabled = true;
    } finally {
      setLoading(btnPreview, false);
    }
  };

  // Save button click handler
  btnSave.onclick = async function() {
    hideErrors();

    // Require preview first
    if (!lastPreviewData || !lastPreviewData.items || lastPreviewData.items.length === 0) {
      showPreviewError('Please preview the URL first.');
      return;
    }

    const url = sourceUrl.value.trim();
    const name = feedName.value.trim() || lastPreviewData.metadata?.pageTitle || 'Untitled Feed';
    // Pass along whether headless was used during preview
    const usedHeadless = lastPreviewData.usedHeadless === true;
    // Parse refresh interval (empty string = manual only = null)
    const intervalValue = refreshInterval ? refreshInterval.value : '';
    const refreshIntervalMinutes = intervalValue ? parseInt(intervalValue, 10) : null;

    setLoading(btnSave, true);

    try {
      const body = { name, url, useHeadless: usedHeadless, refresh_interval_minutes: refreshIntervalMinutes };

      // Pass platform info from preview response (YouTube/Reddit)
      if (lastPreviewData.platformInfo) {
        body.platformInfo = lastPreviewData.platformInfo;
      }

      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.errors ? result.errors.join('. ') : 'Failed to create feed');
      }

      // Show success
      successSection.classList.remove('hidden');

      // Set feed URL in read-only input
      feedUrlDisplay.value = result.feedUrl;

      // Disable form
      disableForm();

      // Hide preview section
      previewSection.classList.add('hidden');

    } catch (error) {
      showPreviewError(error.message || 'Failed to create feed. Please try again.');
    } finally {
      setLoading(btnSave, false);
    }
  };

  // Allow Enter key to trigger preview from URL or feed name fields
  function handleEnterPreview(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      btnPreview.click();
    }
  }
  sourceUrl.addEventListener('keypress', handleEnterPreview);
  feedName.addEventListener('keypress', handleEnterPreview);

  // Copy feed URL to clipboard
  if (btnCopyUrl) {
    btnCopyUrl.onclick = function() {
      navigator.clipboard.writeText(feedUrlDisplay.value).then(function() {
        btnCopyUrl.classList.add('btn-success');
        setTimeout(function() { btnCopyUrl.classList.remove('btn-success'); }, 1500);
      });
    };
  }

})();
