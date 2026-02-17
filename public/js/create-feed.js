// Create Feed Form Handler
// Simplified - just URL and name, auto-detection handles the rest

(function() {
  'use strict';

  // DOM element references
  const feedName = document.getElementById('feed-name');
  const sourceUrl = document.getElementById('source-url');
  const btnPreview = document.getElementById('btn-preview');
  const btnSave = document.getElementById('btn-save');
  const previewSection = document.getElementById('preview-section');
  const previewMeta = document.getElementById('preview-meta');
  const previewItems = document.getElementById('preview-items');
  const previewErrors = document.getElementById('preview-errors');
  const previewErrorText = document.getElementById('preview-error-text');
  const successSection = document.getElementById('success-section');
  const feedUrlLink = document.getElementById('feed-url-link');

  // Store preview data for save
  let lastPreviewData = null;

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
      return;
    }

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
    btnPreview.disabled = true;
    btnSave.disabled = true;
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

      // Store for save
      lastPreviewData = result;

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

    setLoading(btnSave, true);

    try {
      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, url })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.errors ? result.errors.join('. ') : 'Failed to create feed');
      }

      // Show success
      successSection.classList.remove('hidden');

      // Set feed URL link
      feedUrlLink.href = result.feedUrl;
      feedUrlLink.textContent = result.feedUrl;

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

  // Allow Enter key to trigger preview
  sourceUrl.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      btnPreview.click();
    }
  });

})();
