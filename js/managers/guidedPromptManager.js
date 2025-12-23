// guidedPromptManager.js
// Manages guided writing prompts for journal entries
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This module provides a step-by-step writing prompt overlay for
// journal entries. Features include:
// - Sequential prompt display with "Next" button
// - Dynamic spacer creation based on typed content height
// - Textarea padding adjustment to keep prompts visible
// - Support for template-based prompt arrays
//
// VISUAL BEHAVIOR:
// - Prompts appear as overlay boxes above the textarea
// - Spacers match the height of user's typed responses
// - Each prompt scrolls into view when displayed
//
// DEPENDENCIES:
// - DOM APIs for overlay positioning

/**
 * Manages guided writing prompts for journal entries.
 * Displays sequential prompts as overlays above the textarea.
 * 
 * @class GuidedPromptManager
 */
export class GuidedPromptManager {
  /**
   * Creates GuidedPromptManager and displays first prompt.
   * 
   * @param {HTMLElement} panel - Entry panel containing textarea
   * @param {Object} template - Template with prompts array
   * @constructor
   */
  constructor(panel, template) {
    /** @type {HTMLElement} Entry panel element */
    this.panel = panel;
    /** @type {HTMLTextAreaElement} Content textarea */
    this.textarea = panel.querySelector('textarea.entry-content');
    /** @type {string[]} Array of prompt questions */
    this.prompts = (template.prompts || []).slice();
    /** @type {number} Current prompt index */
    this.currentIdx = 0;
    /** @type {number} Last recorded textarea content height */
    this.lastContentHeight = 0;
    if (this.prompts.length === 0) return;

    this.buildContainer();
    this.createPromptBox(this.prompts[this.currentIdx], true);
    this.lastContentHeight = this.textarea.scrollHeight;
    this.updateTextareaPadding();
  }

  /**
   * Builds the container element for prompt boxes.
   * @private
   */
  buildContainer() {
    const contentParent = this.textarea.parentElement;
    this.container = document.createElement('div');
    this.container.className = 'guided-prompt-container';

    /*
     * Make sure the parent (panel-content) is a positioning context so the
     * prompt container can be absolutely anchored inside it.
     */
    if (contentParent && window.getComputedStyle(contentParent).position === 'static') {
      contentParent.style.position = 'relative';
    }

    // Insert as the *last* sibling so it sits on top of the textarea (overlay)
    if (contentParent) {
      contentParent.appendChild(this.container);
    } else {
      // Fallback – shouldn't normally happen
      this.panel.appendChild(this.container);
    }
  }

  /**
   * Creates a visual prompt box element.
   * 
   * @param {string} text - Prompt question text
   * @param {boolean} isActive - Whether to include Next button
   * @private
   */
  createPromptBox(text, isActive) {
    const box = document.createElement('div');
    box.className = 'guided-prompt-box';

    const questionEl = document.createElement('div');
    questionEl.textContent = text;
    box.appendChild(questionEl);

    if (isActive) {
      const nextBtn = document.createElement('button');
      nextBtn.className = 'guided-prompt-btn';
      nextBtn.textContent = 'Next';
      box.appendChild(nextBtn);
      nextBtn.addEventListener('click', () => this.handleNext(box));
    }

    this.container.appendChild(box);

    // Ensure new box is visible in view
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Handles Next button click - advances to next prompt.
   * 
   * @param {HTMLElement} currentBox - The current prompt box element
   * @private
   */
  handleNext(currentBox) {
    const btn = currentBox.querySelector('.guided-prompt-btn');
    if (btn) btn.remove();

    // Measure how much new content the user has typed since the last prompt was shown.
    const currentContentHeight = this.textarea.scrollHeight;
    let typedDelta = currentContentHeight - this.lastContentHeight;
    if (typedDelta < 0) typedDelta = 0; // safety guard

    // Create a spacer that takes up exactly the space of the user's typed answer so the next prompt appears beneath it.
    if (typedDelta > 0) {
      const spacer = document.createElement('div');
      spacer.style.height = typedDelta + 'px';
      spacer.style.pointerEvents = 'none';
      this.container.appendChild(spacer);
    }

    // Update the stored height for the next cycle.
    this.lastContentHeight = currentContentHeight;

    this.currentIdx++;

    if (this.currentIdx < this.prompts.length) {
      this.createPromptBox(this.prompts[this.currentIdx], true);
      this.updateTextareaPadding();
    } else {
      // No more prompts – clean up padding but keep boxes visible
      this.textarea.style.paddingTop = '';
    }
  }

  /**
   * Adjusts textarea padding so input starts below prompt boxes.
   * @private
   */
  updateTextareaPadding() {
    if (!this.container) return;
    // Wait a frame so layout updates are reflected
    requestAnimationFrame(() => {
      const extra = this.container.offsetHeight + 16; // 16px spacing
      this.textarea.style.paddingTop = extra + 'px';
    });
  }

  /**
   * Cleans up all prompt UI elements.
   */
  destroy() {
    if (this.container) this.container.remove();
    if (this.textarea) this.textarea.style.paddingTop = '';
  }
} 