/**
 * Anemone Magazine - Dependency-free Raw JS Docx Blog Parser
 * Unpacks .docx ZIP archives using native browser APIs (DecompressionStream + DOMParser)
 * Extracts the first line of word/document.xml as the Title, and remaining text as Body.
 */

async function parseDocxFile(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  let offset = 0;
  
  let xmlText = null;

  // Search for PK ZIP entries
  while (offset < bytes.length - 30) {
    // Check PK\x03\x04 signature
    if (bytes[offset] === 0x50 && bytes[offset+1] === 0x4b && bytes[offset+2] === 0x03 && bytes[offset+3] === 0x04) {
      const compressionMethod = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const fileNameLen = view.getUint16(offset + 26, true);
      const extraLen = view.getUint16(offset + 28, true);
      
      const fileNameBytes = bytes.subarray(offset + 30, offset + 30 + fileNameLen);
      const fileName = new TextDecoder().decode(fileNameBytes);
      
      const dataStart = offset + 30 + fileNameLen + extraLen;
      
      if (fileName === 'word/document.xml') {
        const compressedData = bytes.subarray(dataStart, dataStart + compressedSize);
        
        if (compressionMethod === 8) { // Deflated
          try {
            const blob = new Blob([compressedData]);
            const decompressedStream = blob.stream().pipeThrough(new DecompressionStream('deflate-raw'));
            const decompressedResponse = new Response(decompressedStream);
            xmlText = await decompressedResponse.text();
          } catch (err) {
            console.error("Decompression failed:", err);
          }
        } else if (compressionMethod === 0) { // Uncompressed
          xmlText = new TextDecoder().decode(compressedData);
        }
        break;
      }
      
      offset = dataStart + compressedSize;
    } else {
      offset++;
    }
  }

  if (!xmlText) {
    throw new Error("Could not find word/document.xml in docx package.");
  }

  // Parse XML text with DOMParser
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  
  const paragraphElements = xmlDoc.getElementsByTagName("w:p");
  const paragraphs = [];

  for (let i = 0; i < paragraphElements.length; i++) {
    const textNodes = paragraphElements[i].getElementsByTagName("w:t");
    let pText = "";
    for (let j = 0; j < textNodes.length; j++) {
      pText += textNodes[j].textContent;
    }
    if (pText.trim().length > 0) {
      paragraphs.push(pText.trim());
    }
  }

  const title = paragraphs.length > 0 ? paragraphs[0] : "Untitled Docx Post";
  const bodyParagraphs = paragraphs.length > 1 ? paragraphs.slice(1) : [];

  return {
    title: title,
    body: bodyParagraphs,
    fullParagraphs: paragraphs
  };
}

// Function to load and render docx blogs
async function loadDocxBlogs(docxFilesList) {
  const container = document.getElementById('docx-blog-container');
  const viewer = document.getElementById('docx-viewer');
  const listContainer = document.getElementById('docx-blog-list');

  if (!container || !listContainer) return;

  listContainer.innerHTML = '<p style="color: var(--muted-color);">Loading and parsing .docx entries...</p>';

  const posts = [];

  for (const fileUrl of docxFilesList) {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) continue;
      const buffer = await response.arrayBuffer();
      const parsed = await parseDocxFile(buffer);
      posts.push({
        url: fileUrl,
        filename: fileUrl.split('/').pop(),
        title: parsed.title,
        body: parsed.body,
        fullParagraphs: parsed.fullParagraphs
      });
    } catch (e) {
      console.warn(`Failed to parse docx at ${fileUrl}:`, e);
    }
  }

  if (posts.length === 0) {
    listContainer.innerHTML = '<p>No .docx blog posts found in folder.</p>';
    return;
  }

  listContainer.innerHTML = '';
  posts.forEach((post, index) => {
    const card = document.createElement('div');
    card.className = 'docx-item';
    
    const snippet = post.body.length > 0 ? post.body[0].substring(0, 140) + '...' : 'Click to read entry...';

    card.innerHTML = `
      <div class="docx-item-title">${escapeHtml(post.title)}</div>
      <div class="docx-item-snippet">${escapeHtml(snippet)}</div>
      <div style="margin-top: 0.8rem; font-size: 0.8rem; color: var(--muted-color);">Source: ${escapeHtml(post.filename)}</div>
    `;

    card.addEventListener('click', () => {
      renderDocxPost(post);
    });

    listContainer.appendChild(card);
  });
}

function renderDocxPost(post) {
  const viewer = document.getElementById('docx-viewer');
  const listContainer = document.getElementById('docx-blog-list');
  const contentArea = document.getElementById('docx-post-content');

  if (!viewer || !contentArea) return;

  let html = `<h1 class="blog-post-title">${escapeHtml(post.title)}</h1>`;
  html += `<div class="blog-post-meta" style="margin-bottom: 2rem;">Parsed Docx Blog Entry &bull; ${escapeHtml(post.filename)}</div>`;

  post.body.forEach(p => {
    html += `<p style="margin-bottom: 1.5rem; text-align: left;">${escapeHtml(p)}</p>`;
  });

  contentArea.innerHTML = html;
  listContainer.style.display = 'none';
  viewer.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeDocxViewer() {
  const viewer = document.getElementById('docx-viewer');
  const listContainer = document.getElementById('docx-blog-list');
  if (viewer && listContainer) {
    viewer.style.display = 'none';
    listContainer.style.display = 'flex';
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
