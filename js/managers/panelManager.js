// panelManager.js
export class PanelManager {
    /**
     * Simple elegant fade transition between panels
     * @param {HTMLElement} hidePanel - Panel to hide
     * @param {HTMLElement} showPanel - Panel to show
     * @param {Object} options - Animation options
     */
  static smoothEntrance(hidePanel, showPanel, options = {}) {
      const { fadeDuration = 300 } = options;

      return new Promise((resolve) => {
        // Ensure any stray custom panels are hidden before transitioning
        PanelManager.hideOtherPanels([hidePanel, showPanel]);

        // Fade out current panel
        hidePanel.style.transition = `opacity ${fadeDuration}ms ease-out`;
        hidePanel.style.opacity = '0';

        setTimeout(() => {
          hidePanel.style.display = 'none';
          hidePanel.style.transition = '';
          
          // Prepare incoming panel
          showPanel.style.opacity = '0';
          showPanel.style.display = 'block';
          void showPanel.offsetWidth;
          
          // Fade in new panel
          showPanel.style.transition = `opacity ${fadeDuration}ms ease-in`;
          showPanel.style.opacity = '1';

          setTimeout(() => {
            showPanel.style.transition = '';
            resolve();
          }, fadeDuration);
        }, fadeDuration);
      });
    }

    /**
     * Hide any custom panels not part of the current transition.
     * @param {HTMLElement[]} keepPanels
     */
    static hideOtherPanels(keepPanels = []) {
      const keepSet = new Set(keepPanels.filter(Boolean));
      document.querySelectorAll('.custom-panel').forEach(panel => {
        if (!keepSet.has(panel)) {
          panel.style.display = 'none';
          panel.style.opacity = '0';
        }
      });
    }

    /**
     * Simple elegant fade transition (same as smoothEntrance, kept for compatibility)
     */
    static smoothExit(hidePanel, showPanel, options = {}) {
      return PanelManager.smoothEntrance(hidePanel, showPanel, options);
    }

    /**
     * Legacy method - redirects to smoothEntrance
     */
    static transitionPanels(hidePanel, showPanel, duration = 300) {
      return PanelManager.smoothEntrance(hidePanel, showPanel, { fadeDuration: duration });
    }
}
