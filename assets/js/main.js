/**
 * ANEMONE MAGAZINE - HYPERMEDIA INTERACTIVE ENGINE
 * Zero dependencies / Raw JavaScript (Rule 1)
 */

document.addEventListener('DOMContentLoaded', () => {
  initHypermediaNavigation();
  initDocxBlogEngine();
});

/**
 * 1. Hypermedia dynamic navigation switcher
 */
function initHypermediaNavigation() {
  const tocCards = document.querySelectorAll('.toc-card');
  const contentArea = document.getElementById('main-content-display');

  if (!tocCards.length || !contentArea) return;

  tocCards.forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update active state across TOC cards
      tocCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const targetType = card.getAttribute('data-type');
      const targetUrl = card.getAttribute('data-url');
      const targetTitle = card.getAttribute('data-title');

      if (targetType === 'blog_index') {
        renderBlogList();
      } else if (targetUrl && targetUrl !== '#') {
        loadPageContent(targetUrl, targetTitle);
      }
    });
  });

  // Handle hash changes for direct linkability
  window.addEventListener('hashchange', handleHashRouting);
  if (window.location.hash) {
    handleHashRouting();
  }
}

function handleHashRouting() {
  const hash = window.location.hash.substring(1);
  if (hash === 'blog-dispatches') {
    renderBlogList();
  } else if (hash) {
    const matchingCard = document.querySelector(`.toc-card[data-slug="${hash}"]`);
    if (matchingCard) {
      matchingCard.click();
    }
  }
}

/**
 * Load external HTML/Markdown page into the flexboxed content area
 */
async function loadPageContent(url, title) {
  const contentArea = document.getElementById('main-content-display');
  if (!contentArea) return;

  contentArea.innerHTML = `
    <div class="state-indicator">
      <p>Loading ${escapeHtml(title)}...</p>
    </div>
  `;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const htmlText = await response.text();

    // Parse returned HTML to extract page body or markdown content
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const pageBody = doc.querySelector('main') || doc.querySelector('.content-body') || doc.body;

    contentArea.innerHTML = `
      <div class="content-header">
        <h2>${escapeHtml(title)}</h2>
        <span class="content-badge">Anemone Page</span>
      </div>
      <div class="content-body">
        ${pageBody.innerHTML}
      </div>
    `;
    
    window.scrollTo({ top: contentArea.offsetTop - 100, behavior: 'smooth' });
  } catch (err) {
    console.error('Failed to load hypermedia content:', err);
    contentArea.innerHTML = `
      <div class="content-header">
        <h2>${escapeHtml(title)}</h2>
      </div>
      <div class="content-body">
        <p class="state-indicator">Unable to load section context dynamically. <a href="${escapeHtml(url)}">Click here to open directly</a>.</p>
      </div>
    `;
  }
}

/**
 * 2. Raw JS .docx Reader & Parser (Rule requirement)
 * Scans `.docx` files, extracts XML content, pulls first line as title, and displays dispatches.
 */
const BLOG_MANIFEST = [
  { file: 'blogs/dispatch-01-analog-perspectives.docx', fallbackTitle: 'Dispatch 01: Analog Perspectives in Darkness' },
  { file: 'blogs/dispatch-02-montana-notes.docx', fallbackTitle: 'Dispatch 02: Montana Winter Notes' },
  { file: 'blogs/dispatch-03-gothic-minimalism.docx', fallbackTitle: 'Dispatch 03: On Gothic Minimalism' }
];

function initDocxBlogEngine() {
  // Pre-load manifest metadata if requested
}

async function renderBlogList() {
  const contentArea = document.getElementById('main-content-display');
  if (!contentArea) return;

  contentArea.innerHTML = `
    <div class="content-header">
      <h2>Blog Dispatches</h2>
      <span class="content-badge">DOCX Folder Parser</span>
    </div>
    <div class="blog-container">
      <p style="color: var(--text-muted); margin-bottom: 1.5rem;">
        The list below is generated dynamically by parsing <code>.docx</code> binary files stored in the <code>blogs/</code> directory. 
        Each article's title is extracted directly from the first paragraph of the document.
      </p>
      <div id="blog-list-container" class="blog-list">
        <div class="state-indicator">Parsing .docx documents in directory...</div>
      </div>
    </div>
  `;

  const listContainer = document.getElementById('blog-list-container');
  let itemsHtml = '';

  for (let i = 0; i < BLOG_MANIFEST.length; i++) {
    const item = BLOG_MANIFEST[i];
    try {
      const docxData = await parseDocxFile(item.file);
      const title = docxData.title || item.fallbackTitle;
      const preview = docxData.preview || 'Click to read full dispatch...';

      itemsHtml += `
        <div class="blog-item-card" onclick="openDocxArticle(${i})">
          <div class="blog-item-title">${escapeHtml(title)}</div>
          <div class="blog-item-source">DOCX SOURCE • ${escapeHtml(item.file)}</div>
          <div class="blog-item-preview">${escapeHtml(preview)}</div>
        </div>
      `;
    } catch (err) {
      console.warn(`Docx parsing fallback for ${item.file}:`, err);
      itemsHtml += `
        <div class="blog-item-card" onclick="openDocxArticle(${i})">
          <div class="blog-item-title">${escapeHtml(item.fallbackTitle)}</div>
          <div class="blog-item-source">DOCX DISPATCH</div>
          <div class="blog-item-preview">Click to read article...</div>
        </div>
      `;
    }
  }

  listContainer.innerHTML = itemsHtml;
}

/**
 * Open and render full DOCX article inside centered blog layout pattern
 */
async function openDocxArticle(index) {
  const item = BLOG_MANIFEST[index];
  const contentArea = document.getElementById('main-content-display');
  if (!contentArea || !item) return;

  contentArea.innerHTML = `<div class="state-indicator">Extracting .docx content...</div>`;

  try {
    const docxData = await parseDocxFile(item.file);
    const title = docxData.title || item.fallbackTitle;
    const paragraphsHtml = docxData.paragraphs
      .map((p, idx) => idx === 0 ? '' : `<p>${escapeHtml(p)}</p>`)
      .join('');

    contentArea.innerHTML = `
      <div class="content-header">
        <button onclick="renderBlogList()" style="background:none; border:1px solid var(--border-color); color:var(--text-primary); padding:0.4rem 0.8rem; cursor:pointer; font-family:var(--font-main);">
          ← Back to Blog List
        </button>
        <span class="content-badge">DOCX Article</span>
      </div>
      <article class="blog-article">
        <h1>${escapeHtml(title)}</h1>
        <div class="blog-meta">
          Published from <code>${escapeHtml(item.file)}</code> &bull; First line parsed as title
        </div>
        ${paragraphsHtml || `<p>${escapeHtml(docxData.fullText)}</p>`}
      </article>
    `;
  } catch (err) {
    console.error('Failed to open docx article:', err);
    contentArea.innerHTML = `
      <div class="blog-article">
        <h1>${escapeHtml(item.fallbackTitle)}</h1>
        <p>Error extracting docx content directly. Please check file path <code>${escapeHtml(item.file)}</code>.</p>
      </div>
    `;
  }
}

/**
 * Pure Vanilla JavaScript .docx Binary Unzipper & XML Text Extractor
 * Zero external libraries (Rule 1 compliance)
 */
async function parseDocxFile(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  
  // Extract word/document.xml bytes from Zip file ArrayBuffer
  const xmlString = await extractZipFileContent(arrayBuffer, 'word/document.xml');
  
  // Parse XML using DOMParser
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  
  // Extract all paragraphs (<w:p>) and text (<w:t>)
  const paragraphNodes = xmlDoc.getElementsByTagName('w:p');
  const paragraphs = [];

  for (let i = 0; i < paragraphNodes.length; i++) {
    const textNodes = paragraphNodes[i].getElementsByTagName('w:t');
    let pText = '';
    for (let j = 0; j < textNodes.length; j++) {
      pText += textNodes[j].textContent;
    }
    if (pText.trim().length > 0) {
      paragraphs.push(pText.trim());
    }
  }

  // The TITLE is pulled as the FIRST LINE of the page (Rule requirement)
  const title = paragraphs.length > 0 ? paragraphs[0] : 'Untitled Dispatch';
  const preview = paragraphs.length > 1 ? paragraphs[1].substring(0, 140) + '...' : '';

  return {
    title: title,
    preview: preview,
    paragraphs: paragraphs,
    fullText: paragraphs.join('\n\n')
  };
}

/**
 * Pure JS ZIP Reader to locate and decompress target entry in a PKZip buffer
 */
async function extractZipFileContent(arrayBuffer, targetFileName) {
  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);
  let offset = 0;

  while (offset < bytes.length - 30) {
    // Check for Local File Header signature 0x04034b50
    if (view.getUint32(offset, true) === 0x04034b50) {
      const compressionMethod = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const fileNameLen = view.getUint16(offset + 26, true);
      const extraLen = view.getUint16(offset + 28, true);

      const fileNameBytes = bytes.subarray(offset + 30, offset + 30 + fileNameLen);
      const fileName = new TextDecoder('utf-8').decode(fileNameBytes);

      const dataOffset = offset + 30 + fileNameLen + extraLen;

      if (fileName === targetFileName) {
        const compressedData = bytes.subarray(dataOffset, dataOffset + compressedSize);
        
        if (compressionMethod === 0) { // Store (Uncompressed)
          return new TextDecoder('utf-8').decode(compressedData);
        } else if (compressionMethod === 8) { // Deflate
          if (typeof DecompressionStream !== 'undefined') {
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            writer.write(compressedData);
            writer.close();
            const response = new Response(ds.readable);
            const decompressedBuffer = await response.arrayBuffer();
            return new TextDecoder('utf-8').decode(decompressedBuffer);
          } else {
            throw new Error('DecompressionStream not supported in this browser environment');
          }
        }
      }

      offset = dataOffset + compressedSize;
    } else {
      offset++;
    }
  }
  throw new Error(`File ${targetFileName} not found inside docx zip archive`);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, match => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[match]));
}
