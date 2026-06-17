// --------------------------------------------------
// STATE MANAGEMENT
// --------------------------------------------------
let releases = [];
let filteredReleases = [];
let currentTypeFilter = 'all';
let searchQuery = '';
let activeTweetDraft = null; // Stores the release item currently being composed
let selectedTextContext = {
    text: '',
    cardId: null
};

// --------------------------------------------------
// DOM ELEMENTS
// --------------------------------------------------
const elements = {
    refreshBtn: document.getElementById('refresh-btn'),
    refreshIcon: document.querySelector('#refresh-btn .sync-icon'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    searchInput: document.getElementById('search-input'),
    filtersContainer: document.getElementById('filters-container'),
    releasesGrid: document.getElementById('releases-grid'),
    
    // Stats elements
    statTotal: document.getElementById('stat-total'),
    statFeatures: document.getElementById('stat-features'),
    statAnnouncements: document.getElementById('stat-announcements'),
    statIssues: document.getElementById('stat-issues'),
    
    // View containers
    loadingView: document.getElementById('loading-view'),
    errorView: document.getElementById('error-view'),
    errorMsg: document.getElementById('error-msg'),
    retryBtn: document.getElementById('retry-btn'),
    emptyView: document.getElementById('empty-view'),
    
    // Modal elements
    tweetModal: document.getElementById('tweet-modal'),
    modalClose: document.getElementById('modal-close'),
    modalUpdateType: document.getElementById('modal-update-type'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCount: document.getElementById('char-count'),
    progressIndicator: document.getElementById('progress-indicator'),
    progressSvg: document.querySelector('.circular-progress'),
    charWarning: document.getElementById('modal-char-warning'),
    btnCopyDraft: document.getElementById('btn-copy-draft'),
    btnPostTweet: document.getElementById('btn-post-tweet'),
    
    // Floating Selection Elements
    floatingTweetBtn: document.getElementById('floating-tweet-btn'),
    
    // Toast notifications
    toastContainer: document.getElementById('toast-container')
};

// --------------------------------------------------
// DATA INITIALIZATION & FETCHING
// --------------------------------------------------
async function fetchReleases(forceRefresh = false) {
    try {
        // UI Feedback: Start spinner and disable buttons
        elements.refreshIcon.classList.add('spinning');
        elements.refreshBtn.disabled = true;
        
        // Show loading screen, hide content/errors
        elements.loadingView.classList.remove('hidden');
        elements.releasesGrid.classList.add('hidden');
        elements.errorView.classList.add('hidden');
        elements.emptyView.classList.add('hidden');
        
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP server error: status ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        releases = data.releases || [];
        
        // Populate stats, apply active filters, and display cards
        updateStats();
        applyFilters();
        
        elements.releasesGrid.classList.remove('hidden');
        
        if (forceRefresh) {
            showToast("Successfully refreshed and synced release notes!");
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        elements.errorMsg.textContent = error.message || "Failed to load Google Cloud feed. Please check connectivity.";
        elements.errorView.classList.remove('hidden');
    } finally {
        // UI Feedback: Stop spinner and enable buttons
        elements.refreshIcon.classList.remove('spinning');
        elements.refreshBtn.disabled = false;
        elements.loadingView.classList.add('hidden');
    }
}

// --------------------------------------------------
// DASHBOARD STATS MANAGEMENT
// --------------------------------------------------
function updateStats() {
    if (!releases.length) {
        elements.statTotal.textContent = "0";
        elements.statFeatures.textContent = "0";
        elements.statAnnouncements.textContent = "0";
        elements.statIssues.textContent = "0";
        return;
    }
    
    const totals = {
        total: releases.length,
        features: 0,
        announcements: 0,
        issues: 0
    };
    
    releases.forEach(item => {
        const type = item.type.toLowerCase();
        if (type.includes('feature')) {
            totals.features++;
        } else if (type.includes('announcement')) {
            totals.announcements++;
        } else if (type.includes('issue') || type.includes('fix') || type.includes('resolve')) {
            totals.issues++;
        }
    });
    
    // Animate stats numbering
    animateValue(elements.statTotal, 0, totals.total, 800);
    animateValue(elements.statFeatures, 0, totals.features, 800);
    animateValue(elements.statAnnouncements, 0, totals.announcements, 800);
    animateValue(elements.statIssues, 0, totals.issues, 800);
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// --------------------------------------------------
// FILTERING & SEARCH SEARCH LOGIC
// --------------------------------------------------
function applyFilters() {
    const query = elements.searchInput.value.toLowerCase().trim();
    
    filteredReleases = releases.filter(item => {
        // 1. Filter by category
        const type = item.type.toLowerCase();
        let matchesType = true;
        
        if (currentTypeFilter !== 'all') {
            if (currentTypeFilter === 'deprecated') {
                matchesType = type.includes('deprecated') || type.includes('change');
            } else {
                matchesType = type.includes(currentTypeFilter);
            }
        }
        
        // 2. Filter by search query
        let matchesSearch = true;
        if (query) {
            matchesSearch = item.date.toLowerCase().includes(query) ||
                            item.type.toLowerCase().includes(query) ||
                            item.description_text.toLowerCase().includes(query);
        }
        
        return matchesType && matchesSearch;
    });
    
    renderGrid();
}

// --------------------------------------------------
// RENDER RELEASE CARDS TO GRID
// --------------------------------------------------
function renderGrid() {
    elements.releasesGrid.innerHTML = '';
    
    if (filteredReleases.length === 0) {
        elements.emptyView.classList.remove('hidden');
        elements.releasesGrid.classList.add('hidden');
        return;
    }
    
    elements.emptyView.classList.add('hidden');
    elements.releasesGrid.classList.remove('hidden');
    
    filteredReleases.forEach(item => {
        const typeLower = item.type.toLowerCase();
        
        // Determine type specific styling variables
        let catClass = 'category-update';
        let badgeClass = 'badge-update';
        
        if (typeLower.includes('feature')) {
            catClass = 'category-feature';
            badgeClass = 'badge-feature';
        } else if (typeLower.includes('announcement')) {
            catClass = 'category-announcement';
            badgeClass = 'badge-announcement';
        } else if (typeLower.includes('fix')) {
            catClass = 'category-fix';
            badgeClass = 'badge-fix';
        } else if (typeLower.includes('issue')) {
            catClass = 'category-issue';
            badgeClass = 'badge-issue';
        } else if (typeLower.includes('deprecated') || typeLower.includes('change')) {
            catClass = 'category-deprecated';
            badgeClass = 'badge-deprecated';
        }
        
        const card = document.createElement('article');
        card.className = `release-card ${catClass}`;
        card.setAttribute('data-id', item.id);
        
        card.innerHTML = `
            <div class="card-header">
                <span class="badge-tag ${badgeClass}">${item.type}</span>
                <span class="card-date">${item.date}</span>
            </div>
            <div class="card-body">
                ${item.description_html}
            </div>
            <div class="card-footer">
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="card-permalink" title="View in Google Cloud Release Notes">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    <span>Full Docs</span>
                </a>
                <div class="card-actions">
                    <button class="action-btn btn-copy-card" title="Copy plain text to clipboard">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <button class="action-btn btn-tweet-action" title="Tweet this update">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        // Attach card actions click events
        card.querySelector('.btn-copy-card').addEventListener('click', (e) => {
            e.stopPropagation();
            const textToCopy = `[BigQuery Release Notes] ${item.type} (${item.date}):\n${item.description_text}\n\nRead details: ${item.link}`;
            copyToClipboard(textToCopy, "Release details copied to clipboard!");
        });
        
        card.querySelector('.btn-tweet-action').addEventListener('click', (e) => {
            e.stopPropagation();
            openTweetComposer(item);
        });
        
        elements.releasesGrid.appendChild(card);
    });
}

// --------------------------------------------------
// CLIPBOARD & TOAST SYSTEM
// --------------------------------------------------
function copyToClipboard(text, successMessage) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => showToast(successMessage))
            .catch(err => console.error("Clipboard Error:", err));
    } else {
        // Fallback for non-https or older browser compatibility
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed"; // prevent scrolling to bottom
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            document.execCommand('copy');
            showToast(successMessage);
        } catch (err) {
            console.error('Fallback Clipboard Error:', err);
        }
        document.body.removeChild(textarea);
    }
}

function exportToCSV() {
    const dataToExport = filteredReleases.length ? filteredReleases : releases;
    
    if (!dataToExport.length) {
        showToast("No data available to export.");
        return;
    }
    
    // CSV Header row
    const headers = ["Date", "Update Type", "Description", "Documentation Link"];
    
    // Convert rows
    const rows = dataToExport.map(item => {
        return [
            item.date,
            item.type,
            item.description_text,
            item.link
        ].map(value => {
            // Escape double quotes by doubling them and wrapping the value in double quotes
            const escaped = String(value).replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\r\n');
    
    try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        // Formulate a nice filename with the current category type and search query if any
        let filename = "bigquery_release_notes";
        if (currentTypeFilter !== 'all') {
            filename += `_${currentTypeFilter}`;
        }
        filename += ".csv";
        
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Exported ${dataToExport.length} updates to CSV!`);
    } catch (err) {
        console.error("CSV Export Error:", err);
        showToast("Failed to export CSV file.");
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Automatically remove toast element from DOM once it fades out
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// --------------------------------------------------
// TWEET COMPOSER MODAL MANAGEMENT
// --------------------------------------------------
function openTweetComposer(item, highlightedText = null) {
    activeTweetDraft = item;
    
    // Show modal container
    elements.tweetModal.classList.remove('hidden');
    elements.modalUpdateType.textContent = item.type;
    
    // Set appropriate badge style matching category type
    elements.modalUpdateType.className = 'meta-badge';
    const typeLower = item.type.toLowerCase();
    if (typeLower.includes('feature')) elements.modalUpdateType.classList.add('badge-feature');
    else if (typeLower.includes('announcement')) elements.modalUpdateType.classList.add('badge-announcement');
    else if (typeLower.includes('fix')) elements.modalUpdateType.classList.add('badge-fix');
    else if (typeLower.includes('issue')) elements.modalUpdateType.classList.add('badge-issue');
    else if (typeLower.includes('deprecated') || typeLower.includes('change')) elements.modalUpdateType.classList.add('badge-deprecated');
    else elements.modalUpdateType.classList.add('badge-update');

    // Compose default draft text
    let initialText = "";
    const prefix = `🚀 BigQuery [${item.type}] (${item.date}): `;
    const linkSuffix = `\n\nDocs: ${item.link}`;
    
    if (highlightedText) {
        // If selection based sharing
        // Clean highlight text (remove dual line breaks, clean spacing)
        const cleanSelect = highlightedText.trim().replace(/\s+/g, ' ');
        initialText = `${prefix}"${cleanSelect}"${linkSuffix}`;
    } else {
        // Standard card sharing
        // Compute available space for the description text (Total 280 - prefix - suffix)
        const placeholderDraft = `${prefix}${linkSuffix}`;
        const charLimit = 280;
        const availableChars = charLimit - placeholderDraft.length;
        
        let bodyText = item.description_text;
        if (bodyText.length > availableChars) {
            // Truncate to fit perfectly
            bodyText = bodyText.substring(0, availableChars - 5) + "...";
        }
        
        initialText = `${prefix}${bodyText}${linkSuffix}`;
    }
    
    elements.tweetTextarea.value = initialText;
    elements.tweetTextarea.focus();
    updateCharCounter();
}

function closeTweetComposer() {
    elements.tweetModal.classList.add('hidden');
    activeTweetDraft = null;
    selectedTextContext = { text: '', cardId: null };
}

function updateCharCounter() {
    const text = elements.tweetTextarea.value;
    const length = text.length;
    const limit = 280;
    
    elements.charCount.textContent = `${length} / ${limit}`;
    
    // Calculate SVG circular stroke offset
    const percentage = Math.min(100, (length / limit) * 100);
    elements.progressIndicator.setAttribute('stroke-dasharray', `${percentage}, 100`);
    
    // Apply styling alerts based on remaining characters
    elements.progressSvg.className = 'circular-progress';
    elements.charCount.style.color = 'var(--text-muted)';
    elements.charWarning.classList.add('hidden');
    
    if (length >= limit) {
        elements.progressSvg.classList.add('danger');
        elements.charCount.style.color = 'var(--color-issue)';
        elements.charWarning.classList.remove('hidden');
    } else if (length >= limit - 30) {
        elements.progressSvg.classList.add('warning');
        elements.charCount.style.color = 'var(--color-announcement)';
    }
}

// --------------------------------------------------
// TEXT SELECTION SHARING FLOW
// --------------------------------------------------
function handleSelectionCheck(e) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // Check if selection is large enough
    if (selectedText.length < 4) {
        elements.floatingTweetBtn.classList.add('hidden');
        return;
    }
    
    // Check if highlight sits within a card body
    const range = selection.getRangeAt(0);
    const bodyAncestor = findAncestorWithClass(range.commonAncestorContainer, 'card-body');
    
    if (!bodyAncestor) {
        elements.floatingTweetBtn.classList.add('hidden');
        return;
    }
    
    // Get the parent card ID
    const cardParent = bodyAncestor.closest('.release-card');
    if (!cardParent) {
        elements.floatingTweetBtn.classList.add('hidden');
        return;
    }
    
    const cardId = cardParent.getAttribute('data-id');
    selectedTextContext = {
        text: selectedText,
        cardId: cardId
    };
    
    // Get location coordinates to position tooltip just above selection
    const rects = range.getClientRects();
    if (rects.length > 0) {
        // Use first line rect for positioning above highlight or combine
        const rect = rects[0];
        elements.floatingTweetBtn.style.top = `${rect.top + window.scrollY - 8}px`;
        elements.floatingTweetBtn.style.left = `${rect.left + (rect.width / 2) + window.scrollX}px`;
        elements.floatingTweetBtn.classList.remove('hidden');
    }
}

function findAncestorWithClass(node, className) {
    let curr = node;
    while (curr && curr !== document.body) {
        if (curr.nodeType === Node.ELEMENT_NODE && curr.classList.contains(className)) {
            return curr;
        }
        curr = curr.parentNode;
    }
    return null;
}

// --------------------------------------------------
// EVENT LISTENERS & ROUTERS
// --------------------------------------------------
function setupEventListeners() {
    // 1. Sync / Refresh Feed Click
    elements.refreshBtn.addEventListener('click', () => {
        fetchReleases(true);
    });
    
    // Export to CSV Click
    elements.exportCsvBtn.addEventListener('click', () => {
        exportToCSV();
    });
    
    // 2. Retry Fetch Button Click (from Error screen)
    elements.retryBtn.addEventListener('click', () => {
        fetchReleases(true);
    });
    
    // 3. Search Keyup Event
    elements.searchInput.addEventListener('input', () => {
        applyFilters();
    });
    
    // 4. Type Pills Filtering
    elements.filtersContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.pill-btn');
        if (!btn) return;
        
        // Toggle active states
        document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        currentTypeFilter = btn.getAttribute('data-type');
        applyFilters();
    });
    
    // 5. Modal Composers Closed
    elements.modalClose.addEventListener('click', closeTweetComposer);
    
    // Close modal if user clicks on backdrop overlay
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) {
            closeTweetComposer();
        }
    });
    
    // Esc Key Closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeTweetComposer();
            elements.floatingTweetBtn.classList.add('hidden');
        }
    });
    
    // 6. Text Area character counter listeners
    elements.tweetTextarea.addEventListener('input', updateCharCounter);
    
    // 7. Composer actions
    elements.btnCopyDraft.addEventListener('click', () => {
        copyToClipboard(elements.tweetTextarea.value, "Tweet draft copied to clipboard!");
    });
    
    elements.btnPostTweet.addEventListener('click', () => {
        const text = elements.tweetTextarea.value;
        const xIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(xIntentUrl, '_blank', 'noopener,noreferrer,width=550,height=420');
        closeTweetComposer();
    });
    
    // 8. Highlight selection listener
    document.addEventListener('mouseup', handleSelectionCheck);
    document.addEventListener('keyup', handleSelectionCheck);
    
    // Click outside selection clears floating button
    document.addEventListener('mousedown', (e) => {
        if (e.target !== elements.floatingTweetBtn && !elements.floatingTweetBtn.contains(e.target)) {
            // Keep it hidden unless we start a new select
            setTimeout(() => {
                const sel = window.getSelection();
                if (sel.toString().trim() === "") {
                    elements.floatingTweetBtn.classList.add('hidden');
                }
            }, 10);
        }
    });
    
    // 9. Floating button action click
    elements.floatingTweetBtn.addEventListener('click', () => {
        if (!selectedTextContext.text || !selectedTextContext.cardId) return;
        
        const matchedItem = releases.find(item => item.id === selectedTextContext.cardId);
        if (matchedItem) {
            openTweetComposer(matchedItem, selectedTextContext.text);
        }
        
        // Hide tooltip after trigger
        elements.floatingTweetBtn.classList.add('hidden');
        window.getSelection().removeAllRanges(); // clear highlight selection
    });
}

// --------------------------------------------------
// APP INIT
// --------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    fetchReleases(false); // First load feeds (serve from cache)
});
