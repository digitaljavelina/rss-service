# Phase 3: Feed Management - Research

**Researched:** 2026-02-17
**Domain:** Dashboard CRUD UI, File Import/Export, Vanilla JavaScript
**Confidence:** HIGH

## Summary

This phase implements a feed management dashboard where users can view, edit, delete, and import/export their RSS feeds. The research focuses on extending the existing codebase patterns (vanilla JS, daisyUI components, Supabase operations) rather than introducing new technologies.

The existing codebase already demonstrates the correct patterns: vanilla JS with IIFE modules, safe DOM manipulation using textContent, daisyUI card/form components, and Supabase CRUD operations. Phase 3 extends these patterns to add list views, edit forms, delete confirmations, and JSON-based import/export.

Key insight: No new libraries are needed. The standard Web APIs (FileReader, Blob, URL.createObjectURL) combined with existing daisyUI components (table, modal, badge) provide everything required. The native HTML dialog element is the modern, accessible approach for confirmation modals.

**Primary recommendation:** Follow existing codebase patterns exactly. Use daisyUI table with status badges for the dashboard, native dialog for edit/delete modals, and Web File API for import/export.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| daisyUI | ^5.5.18 | UI components (table, modal, badge, alert) | Already in use, provides dashboard components |
| Tailwind CSS | ^4.1.18 | Utility styling | Already in use |
| @supabase/supabase-js | ^2.95.3 | Database operations (update, delete) | Already in use |

### Supporting (Web APIs - No Install Needed)
| API | Purpose | When to Use |
|-----|---------|-------------|
| FileReader | Read uploaded JSON files | Import configuration |
| Blob | Create downloadable files | Export configuration |
| URL.createObjectURL | Generate download URLs | Trigger JSON download |
| HTMLDialogElement | Native modal dialogs | Edit/delete confirmations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native dialog | Custom modal with backdrop | Native has better accessibility, keyboard support built-in |
| Blob/createObjectURL | Server-side export endpoint | Client-side is simpler for JSON, no server round-trip |
| daisyUI table | Custom card grid | Table better for data with multiple columns (status, counts, dates) |

**Installation:**
No new packages needed. All functionality available via existing stack and Web APIs.

## Architecture Patterns

### Recommended Project Structure
```
public/js/
  app.js              # Existing - theme toggle
  create-feed.js      # Existing - create feed form
  dashboard.js        # NEW - feed list, refresh, delete
  edit-feed.js        # NEW - edit feed form

src/templates.ts      # Add dashboard page template
src/routes/api/feeds.ts  # Add PUT/:id, DELETE/:id endpoints
src/routes/ui.ts      # Add /feeds, /feeds/:id/edit routes
```

### Pattern 1: Dashboard List with Status
**What:** Table-based feed list showing name, URL, status, item count, and actions
**When to use:** Primary view for managing multiple feeds
**Example:**
```html
<!-- Source: daisyUI docs https://daisyui.com/components/table/ -->
<div class="overflow-x-auto">
  <table class="table">
    <thead>
      <tr>
        <th>Feed</th>
        <th>Status</th>
        <th>Items</th>
        <th>Last Updated</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="feed-list">
      <!-- Rows populated by JavaScript -->
    </tbody>
  </table>
</div>
```

### Pattern 2: Native Dialog for Confirmations
**What:** Use HTML dialog element for delete confirmations
**When to use:** Any destructive action requiring user confirmation
**Example:**
```html
<!-- Source: daisyUI docs https://daisyui.com/components/modal/ -->
<dialog id="delete-modal" class="modal">
  <div class="modal-box">
    <h3 class="font-bold text-lg">Delete Feed</h3>
    <p class="py-4">Are you sure you want to delete "<span id="delete-feed-name"></span>"?</p>
    <div class="modal-action">
      <form method="dialog">
        <button class="btn">Cancel</button>
        <button id="confirm-delete" class="btn btn-error">Delete</button>
      </form>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
```

### Pattern 3: Status Badges
**What:** Visual indicators for feed health (OK, Error, Stale)
**When to use:** Dashboard rows to quickly communicate feed status
**Example:**
```javascript
// Source: daisyUI docs https://daisyui.com/components/badge/
function getStatusBadge(feed) {
  const hoursSinceUpdate = (Date.now() - new Date(feed.updatedAt)) / (1000 * 60 * 60);

  if (feed.error) {
    return createBadge('Error', 'badge-error');
  }
  if (hoursSinceUpdate > 24) {
    return createBadge('Stale', 'badge-warning');
  }
  return createBadge('OK', 'badge-success');
}

function createBadge(text, className) {
  const span = document.createElement('span');
  span.className = 'badge ' + className;
  span.textContent = text;
  return span;
}
```

### Pattern 4: Supabase Update/Delete Operations
**What:** Standard patterns for modifying database records
**When to use:** Edit and delete feed operations
**Example:**
```typescript
// Source: Supabase docs https://supabase.com/docs/reference/javascript/update
// Update feed
const { data, error } = await supabase
  .from('feeds')
  .update({ name: newName, url: newUrl, selectors: JSON.stringify(selectors) })
  .eq('id', feedId)
  .select()
  .single();

// Source: Supabase docs https://supabase.com/docs/reference/javascript/delete
// Delete feed (cascades to items via foreign key)
const { error } = await supabase
  .from('feeds')
  .delete()
  .eq('id', feedId);
```

### Anti-Patterns to Avoid
- **Using innerHTML with user data:** Always use textContent or safe DOM construction (existing pattern in codebase)
- **Using blocking confirm():** Use native dialog instead of window.confirm() for consistent UI
- **Client-side only validation:** Always validate on server too (existing pattern)
- **Deleting without confirmation:** Always confirm destructive actions
- **Forgetting cascade:** Delete relies on database CASCADE - verify items are deleted too

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal dialogs | Custom overlay + backdrop | daisyUI modal + native dialog | Accessibility, keyboard trap, focus management |
| File download | Form submission to server | Blob + createObjectURL | Simpler, no server round-trip for JSON |
| File upload parsing | Manual string parsing | FileReader + JSON.parse | Handles encoding, async properly |
| Status indicators | Custom colored divs | daisyUI badge classes | Consistent theming, accessible |
| Loading states | Custom spinner CSS | daisyUI loading classes | Already styled, themed correctly |
| Table layouts | Custom grid | daisyUI table classes | Responsive, zebra striping, sizing |

**Key insight:** The existing codebase patterns (create-feed.js) show exactly how to handle forms, loading states, and errors. Follow these patterns for consistency.

## Common Pitfalls

### Pitfall 1: Memory Leaks with Object URLs
**What goes wrong:** Creating blob URLs without revoking them leaks memory
**Why it happens:** URL.createObjectURL creates persistent references
**How to avoid:** Always call URL.revokeObjectURL after download completes
**Warning signs:** Memory usage grows with repeated exports

```javascript
// CORRECT pattern
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = filename;
a.click();
URL.revokeObjectURL(url); // Clean up immediately after click
```

### Pitfall 2: Dialog Form Submission
**What goes wrong:** Form inside dialog submits and reloads page
**Why it happens:** Default form behavior
**How to avoid:** Use method="dialog" on forms inside dialog, or preventDefault
**Warning signs:** Page reloads when clicking modal buttons

### Pitfall 3: Stale Closure in Event Handlers
**What goes wrong:** Delete button deletes wrong feed
**Why it happens:** Closure captures variable by reference in loop
**How to avoid:** Use data attributes or closure-safe patterns
**Warning signs:** Actions affect wrong row, especially first/last

```javascript
// WRONG - stale closure
feeds.forEach(feed => {
  btn.onclick = () => deleteFeed(feed.id); // feed.id may be wrong
});

// CORRECT - use data attribute
btn.dataset.feedId = feed.id;
btn.onclick = (e) => deleteFeed(e.target.dataset.feedId);
```

### Pitfall 4: JSON Import Validation
**What goes wrong:** Importing malformed JSON crashes or corrupts data
**Why it happens:** Trusting user-provided file content
**How to avoid:** Validate JSON structure before inserting
**Warning signs:** Database errors on import, missing required fields

```javascript
// Validate structure before import
function validateFeedConfig(config) {
  if (!config.name || typeof config.name !== 'string') return false;
  if (!config.url || typeof config.url !== 'string') return false;
  try { new URL(config.url); } catch { return false; }
  return true;
}
```

### Pitfall 5: Race Conditions on Rapid Actions
**What goes wrong:** Double-clicking delete deletes twice, errors on second
**Why it happens:** No debouncing or disable during async operation
**How to avoid:** Disable button during operation (existing pattern in create-feed.js)
**Warning signs:** Console errors, duplicate operations

## Code Examples

Verified patterns from official sources and existing codebase:

### JSON Export (Client-Side Download)
```javascript
// Source: Web API docs, verified pattern
function exportFeedConfig(feed) {
  const config = {
    name: feed.name,
    url: feed.url,
    selectors: feed.selectors,
    exportedAt: new Date().toISOString()
  };

  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = feed.slug + '-config.json';
  a.click();

  URL.revokeObjectURL(url);
}
```

### JSON Import (Client-Side Upload)
```javascript
// Source: https://gomakethings.com/how-to-upload-and-process-a-json-file-with-vanilla-js/
function setupImport() {
  const input = document.getElementById('import-file');

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const config = JSON.parse(event.target.result);
        if (!validateFeedConfig(config)) {
          showError('Invalid feed configuration file');
          return;
        }
        await createFeedFromConfig(config);
        showSuccess('Feed imported successfully');
      } catch (err) {
        showError('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
  });
}
```

### Safe DOM Row Construction (Following Existing Pattern)
```javascript
// Source: Existing pattern from create-feed.js
function createFeedRow(feed) {
  const tr = document.createElement('tr');
  tr.dataset.feedId = feed.id;

  // Name cell
  const nameCell = document.createElement('td');
  const nameLink = document.createElement('a');
  nameLink.href = '/feeds/' + feed.slug + '/edit';
  nameLink.className = 'link link-primary font-medium';
  nameLink.textContent = feed.name; // Safe: textContent not unsafe methods
  nameCell.appendChild(nameLink);
  tr.appendChild(nameCell);

  // Status cell - using safe badge creation
  const statusCell = document.createElement('td');
  statusCell.appendChild(getStatusBadge(feed));
  tr.appendChild(statusCell);

  // Item count cell
  const countCell = document.createElement('td');
  countCell.textContent = feed.itemCount.toString();
  tr.appendChild(countCell);

  // Updated cell
  const updatedCell = document.createElement('td');
  updatedCell.textContent = formatDate(feed.updatedAt);
  tr.appendChild(updatedCell);

  // Actions cell
  const actionsCell = document.createElement('td');
  actionsCell.className = 'flex gap-2';

  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'btn btn-ghost btn-xs';
  refreshBtn.textContent = 'Refresh';
  refreshBtn.dataset.feedId = feed.id;
  refreshBtn.dataset.action = 'refresh';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn btn-ghost btn-xs text-error';
  deleteBtn.textContent = 'Delete';
  deleteBtn.dataset.feedId = feed.id;
  deleteBtn.dataset.feedName = feed.name;
  deleteBtn.dataset.action = 'delete';

  actionsCell.appendChild(refreshBtn);
  actionsCell.appendChild(deleteBtn);
  tr.appendChild(actionsCell);

  return tr;
}
```

### Delete with Confirmation Dialog
```javascript
// Source: daisyUI modal + native dialog API
function setupDeleteHandlers() {
  const modal = document.getElementById('delete-modal');
  const feedNameSpan = document.getElementById('delete-feed-name');
  const confirmBtn = document.getElementById('confirm-delete');
  let pendingDeleteId = null;

  // Handle delete button clicks using event delegation
  document.addEventListener('click', (e) => {
    if (e.target.dataset.action === 'delete') {
      pendingDeleteId = e.target.dataset.feedId;
      feedNameSpan.textContent = e.target.dataset.feedName;
      modal.showModal();
    }
  });

  // Handle confirmation
  confirmBtn.onclick = async () => {
    if (!pendingDeleteId) return;

    confirmBtn.disabled = true;
    try {
      const response = await fetch('/api/feeds/' + pendingDeleteId, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Delete failed');

      // Remove row from DOM
      const row = document.querySelector('tr[data-feed-id="' + pendingDeleteId + '"]');
      if (row) row.remove();

      modal.close();
    } catch (err) {
      showError('Failed to delete feed');
    } finally {
      confirmBtn.disabled = false;
      pendingDeleteId = null;
    }
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| window.confirm() | Native dialog element | 2022+ | Better UX, styling, accessibility |
| Form POST for downloads | Blob + createObjectURL | Standard since 2015 | No server round-trip for JSON |
| jQuery AJAX | fetch() + async/await | ES2017+ | Native, cleaner syntax |
| data-binding frameworks | Safe DOM manipulation | Always valid | Better for small apps, no bundle |

**Deprecated/outdated:**
- window.confirm()/alert(): Blocks thread, unstyled, inconsistent across browsers
- synchronous FileReader methods: Use async readAsText instead

## Open Questions

Things that couldn't be fully resolved:

1. **Bulk operations (select all, delete multiple)**
   - What we know: daisyUI table supports checkboxes
   - What's unclear: Is this needed for Phase 3 or future enhancement?
   - Recommendation: Start with single-item operations, add bulk in Phase 4+ if needed

2. **Feed status tracking (error vs stale)**
   - What we know: Can track updated_at timestamp for staleness
   - What's unclear: Should we store last_error message in feeds table?
   - Recommendation: Add error_message column to feeds table to display in UI

3. **Export format (single vs multiple feeds)**
   - What we know: MGMT-06/07 mention "feed configurations" (plural possible)
   - What's unclear: Export one feed at a time or support bulk export?
   - Recommendation: Start with single feed export, add "Export All" as enhancement

## Sources

### Primary (HIGH confidence)
- daisyUI official docs - table, modal, badge, alert components
  - https://daisyui.com/components/table/
  - https://daisyui.com/components/modal/
  - https://daisyui.com/components/badge/
  - https://daisyui.com/components/alert/
- Supabase official docs - update, delete operations
  - https://supabase.com/docs/reference/javascript/update
  - https://supabase.com/docs/reference/javascript/delete
- MDN Web Docs - Blob, FileReader, URL.createObjectURL
  - https://developer.mozilla.org/en-US/docs/Web/API/Blob
  - https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static

### Secondary (MEDIUM confidence)
- Go Make Things - JSON file upload pattern (verified with MDN)
  - https://gomakethings.com/how-to-upload-and-process-a-json-file-with-vanilla-js/
- James L. Milner - JSON download pattern (verified with MDN)
  - https://www.jameslmilner.com/posts/downloading-a-file-with-javascript/

### Tertiary (LOW confidence)
- None - all patterns verified with official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - using existing project stack, verified with official docs
- Architecture: HIGH - extending existing patterns from create-feed.js
- Pitfalls: HIGH - common issues well-documented across multiple sources
- Code examples: HIGH - verified against official daisyUI/Supabase/MDN docs

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (30 days - stable patterns, no fast-moving APIs)
