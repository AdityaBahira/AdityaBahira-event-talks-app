import os
import time
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import re
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Constants
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_TTL = 600  # 10 minutes cache duration in seconds

# Simple In-Memory Cache
feed_cache = {
    "data": None,
    "last_updated": 0
}

def clean_text(html_content):
    """
    Cleans up HTML into readable plain text for Twitter/X.
    Converts links into absolute URLs and appends them in brackets.
    """
    if not html_content:
        return ""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Process links to be absolute and readable
    for a in soup.find_all('a'):
        href = a.get('href', '')
        if href:
            if not href.startswith('http'):
                # Handle relative paths from google cloud docs
                if href.startswith('/'):
                    href = "https://cloud.google.com" + href
                else:
                    href = "https://cloud.google.com/bigquery/docs/" + href
            a.replace_with(f"{a.text} ({href})")
            
    # Process code snippets to make them readable
    for code in soup.find_all('code'):
        code.replace_with(f"`{code.text}`")

    # Get plain text and normalize whitespace
    text = soup.get_text()
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_release_notes():
    """
    Fetches the XML release notes and parses them.
    Splits multi-item day entries into individual, single-topic updates.
    """
    response = requests.get(FEED_URL, timeout=15)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch BigQuery feed. Status code: {response.status_code}")
        
    root = ET.fromstring(response.content)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = root.findall('atom:entry', ns)
    
    parsed_items = []
    
    for entry in entries:
        date_str = entry.find('atom:title', ns).text
        updated_str = entry.find('atom:updated', ns).text
        entry_id = entry.find('atom:id', ns).text
        
        # Link resolution
        link_elem = entry.find("atom:link[@rel='alternate']", ns)
        if link_elem is None:
            link_elem = entry.find("atom:link", ns)
            
        link_url = link_elem.get('href', 'https://cloud.google.com/bigquery/docs/release-notes') if link_elem is not None else 'https://cloud.google.com/bigquery/docs/release-notes'
        
        # Add the date anchor to link if it's there
        if '#' not in link_url and '#' in entry_id:
            anchor = entry_id.split('#')[-1]
            link_url = f"{link_url}#{anchor}"
            
        content_elem = entry.find('atom:content', ns)
        if content_elem is None or not content_elem.text:
            continue
            
        content_html = content_elem.text
        soup = BeautifulSoup(content_html, 'html.parser')
        
        # Split contents by <h3> tags
        h3_tags = soup.find_all('h3')
        
        if not h3_tags:
            # Fallback if no h3 sections
            text_desc = clean_text(content_html)
            parsed_items.append({
                'id': f"{entry_id}_0",
                'date': date_str,
                'updated': updated_str,
                'type': 'Update',
                'description_html': content_html,
                'description_text': text_desc,
                'link': link_url
            })
            continue
            
        for idx, h3 in enumerate(h3_tags):
            update_type = h3.text.strip()
            
            # Extract description siblings between this h3 and the next h3
            description_parts = []
            sibling = h3.next_sibling
            while sibling and sibling.name != 'h3':
                description_parts.append(str(sibling))
                sibling = sibling.next_sibling
                
            description_html = "".join(description_parts).strip()
            description_text = clean_text(description_html)
            
            # Create a clean item dictionary
            parsed_items.append({
                'id': f"{entry_id}_{idx}",
                'date': date_str,
                'updated': updated_str,
                'type': update_type,
                'description_html': description_html,
                'description_text': description_text,
                'link': link_url
            })
            
    return parsed_items

@app.route('/')
def index():
    """Serves the main application page."""
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    """
    Returns the parsed release notes as JSON.
    Supports cache control via ?refresh=true.
    """
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    # Check cache validity
    if force_refresh or not feed_cache["data"] or (current_time - feed_cache["last_updated"] > CACHE_TTL):
        try:
            releases = parse_release_notes()
            feed_cache["data"] = releases
            feed_cache["last_updated"] = current_time
        except Exception as e:
            # If fetch fails and we have cached data, fallback to cache instead of returning error
            if feed_cache["data"]:
                return jsonify({
                    "releases": feed_cache["data"],
                    "source": "cache_fallback",
                    "error": str(e),
                    "last_updated": feed_cache["last_updated"]
                })
            return jsonify({"error": str(e)}), 500
            
    return jsonify({
        "releases": feed_cache["data"],
        "source": "live" if force_refresh else "cache",
        "last_updated": feed_cache["last_updated"]
    })

if __name__ == '__main__':
    # Run locally
    app.run(debug=True, host='127.0.0.1', port=5000)
