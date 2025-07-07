export class GuidedPromptManager {
  constructor(panel, template) {
    this.panel = panel;
    this.textarea = panel.querySelector('textarea.entry-content');
    this.prompts = (template.prompts || []).slice();
    this.currentIdx = 0;
    // Track textarea height after each prompt so we can insert spacer divs that match the amount of text typed for the previous question.
    this.lastContentHeight = 0;
    if (this.prompts.length === 0) return;

    this.buildContainer();
    this.createPromptBox(this.prompts[this.currentIdx], true);
    // At start there is no user text yet, so lastContentHeight is current scrollHeight (likely minimal but capture it).
    this.lastContentHeight = this.textarea.scrollHeight;
    this.updateTextareaPadding();
  }

  /* Build a container that will hold all prompt boxes */
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

  /* Create a visual prompt box. If active, it contains the Next button */
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

  handleNext(currentBox) {
    // Remove the Next button from the current box so users can't trigger again
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

  /* Adjust textarea padding so user input starts below the prompt boxes */
  updateTextareaPadding() {
    if (!this.container) return;
    // Wait a frame so layout updates are reflected
    requestAnimationFrame(() => {
      const extra = this.container.offsetHeight + 16; // 16px spacing
      this.textarea.style.paddingTop = extra + 'px';
    });
  }

  /* Called externally to clean everything up */
  destroy() {
    if (this.container) this.container.remove();
    if (this.textarea) this.textarea.style.paddingTop = '';
  }
} 