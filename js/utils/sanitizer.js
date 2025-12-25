// sanitizer.js
// HTML sanitization utility for safe innerHTML usage
// 
// This module provides sanitization for user-generated content
// to prevent XSS attacks when using innerHTML.

/**
 * Allowed HTML tags for rich text content (journal entries).
 */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'u', 's', 'em', 'strong', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'a', 'img', 'hr', 'sub', 'sup', 'mark'
]);

/**
 * Allowed attributes for HTML elements.
 */
const ALLOWED_ATTRS = new Set([
  'href', 'src', 'alt', 'title', 'class', 'id', 'style',
  'target', 'rel', 'width', 'height', 'data-*'
]);

/**
 * URL protocols allowed in href/src attributes.
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'data:', 'blob:'];

/**
 * Escapes HTML special characters to prevent XSS.
 * Use this for plain text that should not contain HTML.
 * @param {string} str - The string to escape
 * @returns {string} - Escaped string safe for innerHTML
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Checks if a URL has an allowed protocol.
 * @param {string} url - The URL to check
 * @returns {boolean} - True if protocol is allowed
 */
function isAllowedUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url, window.location.href);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitizes an HTML string by removing disallowed tags and attributes.
 * Use this for rich text content that may contain formatting.
 * @param {string} html - The HTML string to sanitize
 * @returns {string} - Sanitized HTML string
 */
function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';
  if (!html.trim()) return '';

  // Create a temporary container
  const template = document.createElement('template');
  template.innerHTML = html;
  
  const fragment = template.content;
  sanitizeNode(fragment);
  
  return template.innerHTML;
}

/**
 * Recursively sanitizes a DOM node and its children.
 * @param {Node} node - The node to sanitize
 */
function sanitizeNode(node) {
  const nodesToRemove = [];
  
  for (const child of node.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const tagName = child.tagName.toLowerCase();
      
      // Remove disallowed tags entirely
      if (!ALLOWED_TAGS.has(tagName)) {
        nodesToRemove.push(child);
        continue;
      }
      
      // Remove disallowed attributes
      const attrsToRemove = [];
      for (const attr of child.attributes) {
        const attrName = attr.name.toLowerCase();
        
        // Check if attribute is allowed
        const isDataAttr = attrName.startsWith('data-');
        if (!ALLOWED_ATTRS.has(attrName) && !isDataAttr) {
          attrsToRemove.push(attr.name);
          continue;
        }
        
        // Validate URLs in href/src
        if ((attrName === 'href' || attrName === 'src') && !isAllowedUrl(attr.value)) {
          attrsToRemove.push(attr.name);
          continue;
        }
        
        // Remove javascript: in any attribute
        if (attr.value.toLowerCase().includes('javascript:')) {
          attrsToRemove.push(attr.name);
          continue;
        }
        
        // Remove event handlers (onclick, onerror, etc.)
        if (attrName.startsWith('on')) {
          attrsToRemove.push(attr.name);
          continue;
        }
      }
      
      // Remove dangerous attributes
      for (const attrName of attrsToRemove) {
        child.removeAttribute(attrName);
      }
      
      // Add security attributes to links
      if (tagName === 'a') {
        child.setAttribute('rel', 'noopener noreferrer');
      }
      
      // Recursively sanitize children
      sanitizeNode(child);
    }
  }
  
  // Remove disallowed nodes
  for (const nodeToRemove of nodesToRemove) {
    // Keep text content of removed nodes
    const textContent = nodeToRemove.textContent;
    if (textContent) {
      const textNode = document.createTextNode(textContent);
      node.replaceChild(textNode, nodeToRemove);
    } else {
      node.removeChild(nodeToRemove);
    }
  }
}

/**
 * Sets innerHTML safely by sanitizing the content first.
 * @param {HTMLElement} element - The element to set innerHTML on
 * @param {string} html - The HTML content to set
 */
function safeSetInnerHTML(element, html) {
  if (!(element instanceof HTMLElement)) {
    console.warn('safeSetInnerHTML: Invalid element');
    return;
  }
  element.innerHTML = sanitizeHtml(html);
}

/**
 * Sets textContent safely (no HTML parsing).
 * @param {HTMLElement} element - The element to set text on
 * @param {string} text - The text content to set
 */
function safeSetText(element, text) {
  if (!(element instanceof HTMLElement)) {
    console.warn('safeSetText: Invalid element');
    return;
  }
  element.textContent = text;
}

// Export for use in modules or attach to window for global access
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { escapeHtml, sanitizeHtml, safeSetInnerHTML, safeSetText, isAllowedUrl };
} else {
  window.Sanitizer = { escapeHtml, sanitizeHtml, safeSetInnerHTML, safeSetText, isAllowedUrl };
}
