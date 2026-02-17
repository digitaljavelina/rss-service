// Create Feed Form Handler
// Vanilla JavaScript - no dependencies

(function() {
  'use strict';

  // DOM element references
  const feedName = document.getElementById('feed-name');
  const sourceUrl = document.getElementById('source-url');
  const selectorItem = document.getElementById('selector-item');
  const selectorTitle = document.getElementById('selector-title');
  const selectorLink = document.getElementById('selector-link');
  const selectorDescription = document.getElementById('selector-description');
  const selectorDate = document.getElementById('selector-date');
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
   * Get form data as object
   */
  function getFormData() {
    return {
      name: feedName.value.trim(),
      url: sourceUrl.value.trim(),
      selectors: {
        item: selectorItem.value.trim(),
        title: selectorTitle.value.trim(),
        link: selectorLink.value.trim() || undefined,
        description: selectorDescription.value.trim() || undefined,
        date: selectorDate.value.trim() || undefined
      }
    };
  }

  /**
   * Validate form and return array of error strings
   */
  function validateForm() {
    const errors = [];
    const data = getFormData();

    if (!data.name) {
      errors.push('Feed name is required');
    }

    if (!data.url) {
      errors.push('Source URL is required');
    } else {
      try {
        new URL(data.url);
      } catch (e) {
        errors.push('Invalid URL format');
      }
    }

    if (!data.selectors.item) {
      errors.push('Item container selector is required');
    }

    if (!data.selectors.title) {
      errors.push('Title selector is required');
    }

    return errors;
  }

  /**
   * Escape HTML to prevent XSS - creates safe text node
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.textContent;
  }

  /**
   * Clear all child elements from a container (safe alternative to innerHTML = '')
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
      noItems.textContent = 'No items found with the specified selectors. Try adjusting your CSS selectors.';
      previewItems.appendChild(noItems);
      return;
    }

    // Render items (limit to 10)
    const itemsToShow = data.items.slice(0, 10);
    itemsToShow.forEach(function(item, index) {
      const card = document.createElement('div');
      card.className = 'card bg-base-200';

      const cardBody = document.createElement('div');
      cardBody.className = 'card-body py-3';

      // Title - use textContent for safety
      const title = document.createElement('h3');
      title.className = 'card-title text-base';
      title.textContent = item.title || '(No title)';
      cardBody.appendChild(title);

      // Link
      if (item.link) {
        const link = document.createElement('a');
        link.href = item.link;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'text-sm link link-primary truncate block';
        link.textContent = item.link;
        cardBody.appendChild(link);
      }

      // Description - use textContent for safety
      if (item.description) {
        const desc = document.createElement('p');
        desc.className = 'text-sm text-base-content/70 line-clamp-2';
        desc.textContent = item.description;
        cardBody.appendChild(desc);
      }

      // Date - use textContent for safety
      if (item.date) {
        const date = document.createElement('span');
        date.className = 'text-xs text-base-content/50';
        date.textContent = item.date;
        cardBody.appendChild(date);
      }

      card.appendChild(cardBody);
      previewItems.appendChild(card);
    });

    // Show "and N more" if applicable
    if (data.items.length > 10) {
      const more = document.createElement('div');
      more.className = 'text-center text-sm text-base-content/60 py-2';
      more.textContent = '... and ' + (data.items.length - 10) + ' more items';
      previewItems.appendChild(more);
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
    selectorItem.disabled = true;
    selectorTitle.disabled = true;
    selectorLink.disabled = true;
    selectorDescription.disabled = true;
    selectorDate.disabled = true;
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

    const data = getFormData();
    setLoading(btnPreview, true);

    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: data.url,
          selectors: data.selectors
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Preview failed');
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
      showPreviewError(error.message || 'Failed to preview. Please try again.');
      lastPreviewData = null;
      btnSave.disabled = true;
    } finally {
      setLoading(btnPreview, false);
    }
  };

  // Save button click handler
  btnSave.onclick = async function() {
    hideErrors();

    // Validate form
    const errors = validateForm();
    if (errors.length > 0) {
      showPreviewError(errors.join('. '));
      return;
    }

    // Require preview first
    if (!lastPreviewData || !lastPreviewData.items || lastPreviewData.items.length === 0) {
      showPreviewError('Please preview the feed first to ensure selectors work correctly.');
      return;
    }

    const data = getFormData();
    setLoading(btnSave, true);

    try {
      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: data.name,
          url: data.url,
          selectors: data.selectors
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create feed');
      }

      // Show success
      successSection.classList.remove('hidden');

      // Set feed URL link
      const feedUrl = window.location.origin + '/feed/' + result.slug + '.xml';
      feedUrlLink.href = feedUrl;
      feedUrlLink.textContent = feedUrl;

      // Disable form
      disableForm();

      // Hide preview section
      previewSection.classList.add('hidden');

    } catch (error) {
      showPreviewError(error.message || 'Failed to save feed. Please try again.');
    } finally {
      setLoading(btnSave, false);
    }
  };

})();
