// Settings Page Handler

(function() {
  'use strict';

  const ytApiKey = document.getElementById('yt-api-key');
  const ytStatus = document.getElementById('yt-status');
  const btnToggle = document.getElementById('btn-toggle-yt-key');
  const btnSave = document.getElementById('btn-save-yt-key');
  const btnTest = document.getElementById('btn-test-yt-key');
  const btnRemove = document.getElementById('btn-remove-yt-key');
  const successEl = document.getElementById('settings-success');
  const successText = document.getElementById('settings-success-text');
  const errorEl = document.getElementById('settings-error');
  const errorText = document.getElementById('settings-error-text');

  let isConfigured = false;

  function setLoading(btn, loading) {
    var spinner = btn.querySelector('.loading');
    if (spinner) {
      if (loading) {
        spinner.classList.remove('hidden');
        btn.disabled = true;
      } else {
        spinner.classList.add('hidden');
        btn.disabled = false;
      }
    }
  }

  function showSuccess(msg) {
    successText.textContent = msg;
    successEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
    setTimeout(function() { successEl.classList.add('hidden'); }, 4000);
  }

  function showError(msg) {
    errorText.textContent = msg;
    errorEl.classList.remove('hidden');
    successEl.classList.add('hidden');
  }

  function hideMessages() {
    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');
  }

  function updateStatus(configured) {
    isConfigured = configured;
    if (configured) {
      ytStatus.textContent = 'Configured';
      ytStatus.className = 'badge badge-success badge-sm';
      btnRemove.classList.remove('hidden');
    } else {
      ytStatus.textContent = 'Not configured';
      ytStatus.className = 'badge badge-ghost text-xs';
      btnRemove.classList.add('hidden');
    }
  }

  // Load current settings
  async function loadSettings() {
    try {
      var response = await fetch('/api/settings');
      var settings = await response.json();

      if (Array.isArray(settings)) {
        var ytSetting = settings.find(function(s) { return s.key === 'youtube_api_key'; });
        if (ytSetting && ytSetting.configured) {
          ytApiKey.placeholder = ytSetting.value; // Shows masked value like ****abcd
          updateStatus(true);
        }
      }
    } catch (e) {
      // Settings not loaded, leave as defaults
    }
  }

  // Toggle key visibility
  btnToggle.onclick = function() {
    if (ytApiKey.type === 'password') {
      ytApiKey.type = 'text';
    } else {
      ytApiKey.type = 'password';
    }
  };

  // Save YouTube API key
  btnSave.onclick = async function() {
    hideMessages();
    var key = ytApiKey.value.trim();

    if (!key) {
      showError('Please enter an API key.');
      return;
    }

    setLoading(btnSave, true);

    try {
      var response = await fetch('/api/settings/youtube_api_key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: key })
      });

      var result = await response.json();

      if (!response.ok) {
        throw new Error(result.errors ? result.errors.join('. ') : 'Failed to save');
      }

      ytApiKey.value = '';
      ytApiKey.placeholder = result.value; // Masked value
      updateStatus(true);
      showSuccess('YouTube API key saved successfully.');
    } catch (error) {
      showError(error.message || 'Failed to save API key.');
    } finally {
      setLoading(btnSave, false);
    }
  };

  // Test YouTube API key
  btnTest.onclick = async function() {
    hideMessages();

    // Use the input value if provided, otherwise test the stored key
    var key = ytApiKey.value.trim();

    setLoading(btnTest, true);

    try {
      if (key) {
        // Test with the provided key directly via YouTube API
        var testUrl = 'https://www.googleapis.com/youtube/v3/channels?part=id&id=UC_x5XG1OV2P6uZZ5FSM9Ttw&key=' + encodeURIComponent(key);
        var testResponse = await fetch(testUrl);
        var testData = await testResponse.json();

        if (!testResponse.ok) {
          throw new Error(testData.error ? testData.error.message : 'Invalid API key');
        }

        showSuccess('API key is valid! (Tested with YouTube API)');
      } else if (isConfigured) {
        // Test by trying to preview a known YouTube channel
        var previewResponse = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'https://www.youtube.com/@Google' })
        });

        var previewData = await previewResponse.json();

        if (previewData.success && previewData.items && previewData.items.length > 0) {
          showSuccess('API key is working! Found ' + previewData.items.length + ' videos.');
        } else {
          throw new Error(previewData.errors ? previewData.errors.join('. ') : 'Key test failed');
        }
      } else {
        showError('Enter an API key first, then click Test.');
      }
    } catch (error) {
      showError('Key test failed: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(btnTest, false);
    }
  };

  // Remove YouTube API key
  btnRemove.onclick = async function() {
    hideMessages();

    if (!confirm('Remove YouTube API key? YouTube feeds will stop refreshing.')) return;

    try {
      var response = await fetch('/api/settings/youtube_api_key', { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to remove key');
      }

      ytApiKey.value = '';
      ytApiKey.placeholder = 'AIzaSy...';
      updateStatus(false);
      showSuccess('YouTube API key removed.');
    } catch (error) {
      showError(error.message || 'Failed to remove key.');
    }
  };

  // Load settings on page load
  loadSettings();
})();
