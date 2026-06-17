# BigQuery Release Notes Explorer 🚀

A premium, modern web application built using Python **Flask** and plain vanilla **HTML, JavaScript, and CSS** to browse, search, and tweet about the Google Cloud BigQuery Release Notes.

---

## ✨ Features

- **Granular Updates**: Automatically parses Google Cloud's Atom RSS feed and splits combined daily release notes by headers (`<h3>` tags) into individual cards (Features, Announcements, Fixes, Issues, Deprecated).
- **Glassmorphic Dark UI**: A sleek modern aesthetic using radial background gradients, animated elements, responsive CSS grid cards, and live indicator animations.
- **Cache-Optimized Backend**: Employs an in-memory cache system (10-minute TTL) to speed up load times and limit calls to Google's feeds.
- **Manual Synchronization**: A spinning header "Sync Feed" button to manually bypass the cache and fetch fresh notes instantly.
- **Fuzzy Search & Filters**: Instantly find updates by type, keywords, or date directly on the client side.
- **Dual Sharing/Tweeting flows**:
  1. **Card Level**: Click the Tweet action button on any card to compose a tweet summarizing the update with details and a permalink.
  2. **Highlight Selection (Wow Factor)**: Highlight any snippet of text on a card with your cursor to reveal a floating **Tweet Selection 🐦** button. Click it to draft a custom tweet quoting your selection.
- **Tweet Length Safeguard**: Composer modal includes a live character counter and an animated circular SVG limit indicator showing warn (250+ chars) and over (280+ chars) states.

---

## 🛠️ Tech Stack

- **Backend**: Python 3, Flask, BeautifulSoup (bs4), Requests
- **Frontend**: HTML5, Vanilla CSS3 (Custom Variables, Flexbox, CSS Grid), Vanilla JavaScript (ES6, Selection API)
- **Deployment & VCS**: Git, GitHub CLI (gh)

---

## 📂 Project Structure

```text
bq-releases-notes/
│
├── static/
│   ├── css/
│   │   └── styles.css       # Visual System, Background Orbs, Tooltips, Custom Scrollbars
│   └── js/
│       └── app.js           # AJAX Fetch, Selection APIs, Dynamic Filtering, Tweet Modal
│
├── templates/
│   └── index.html           # Main Layout, Embed SVGs, Glassmorphic HTML Containers
│
├── app.py                   # Flask App, Feed Parser Splitter, Caching Logic
├── .gitignore               # Ignored Environments, Pycaches, IDEs, and Logs
└── README.md                # Project Guide
```

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
Make sure Python 3 is installed on your machine.

### 2. Install Dependencies
Clone the repository and install the required library packages:
```bash
pip install flask requests beautifulsoup4
```

### 3. Run the Server
Launch the Flask development server:
```bash
python app.py
```
By default, the server runs on [http://127.0.0.1:5000](http://127.0.0.1:5000).

---

## 💻 Usage & Workflows

### Browsing Release Notes
- Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.
- Use the horizontal **Category Pills** (All, Features, Fixes, etc.) to view specific update types.
- Type in the **Search Bar** to dynamically narrow down items based on description content or dates.

### Syncing Fresh Details
- Click **Sync Feed** in the header. The spinner will rotate as the backend fetches the XML directly from the Google API and updates the local memory cache.

### Tweeting an Update
- **Option A (Card Share)**: Click the **X (Twitter) Icon** in the footer of any card. An overlay modal opens showing a pre-formatted tweet with a character gauge. Click **Post to X** to publish via X Web Intents.
- **Option B (Text Selection)**: Highlight any text snippet inside a card body. Click the **Tweet Selection** popup button that emerges above your selection to populate the composer modal with your highlighted quote.
- **Copying Snippets**: Click the **Copy Icon** in a card footer to instantly copy formatted release details with a permalink to your clipboard.

---

## 📄 License
This project is open-source. Feel free to customize and extend it!
