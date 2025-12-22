// panelManager.js
export class PanelManager {
    static transitionPanels(hidePanel, showPanel, duration = 600) {
      return new Promise((resolve) => {
        // Fade out the currently visible panel
        hidePanel.classList.remove('fade-in');
        hidePanel.classList.add('fade-out');
  
        setTimeout(() => {
          hidePanel.style.display = 'none';
          hidePanel.classList.remove('fade-out');
  
          // Fade in the new panel
          showPanel.style.display = 'block';
          // Force reflow
          void showPanel.offsetWidth;
          showPanel.classList.add('fade-in');
  
          setTimeout(() => {
            resolve();
          }, duration);
        }, duration);
      });
    }

    /**
     * Smooth panel entrance with slide-up + fade + scale animation using CSS classes
     * @param {HTMLElement} hidePanel - Panel to hide
     * @param {HTMLElement} showPanel - Panel to show
     * @param {Object} options - Animation options
     */
    static smoothEntrance(hidePanel, showPanel, options = {}) {
      const {
        hideDuration = 350,
        showDuration = 550
      } = options;

      return new Promise((resolve) => {
        // Clean up any previous animation classes
        hidePanel.classList.remove('panel-entering', 'panel-exiting', 'panel-fade-out');
        showPanel.classList.remove('panel-entering', 'panel-exiting', 'panel-fade-out');

        // Fade out the currently visible panel
        hidePanel.classList.add('panel-fade-out');

        setTimeout(() => {
          hidePanel.style.display = 'none';
          hidePanel.classList.remove('panel-fade-out');

          // Prepare the incoming panel
          showPanel.style.display = 'block';
          
          // Force reflow before adding animation class
          void showPanel.offsetWidth;
          
          // Add entrance animation class
          showPanel.classList.add('panel-entering');

          setTimeout(() => {
            // Clean up animation class after completion
            showPanel.classList.remove('panel-entering');
            resolve();
          }, showDuration);
        }, hideDuration);
      });
    }

    /**
     * Smooth panel exit with slide + fade animation using CSS classes
     * @param {HTMLElement} hidePanel - Panel to hide
     * @param {HTMLElement} showPanel - Panel to show
     * @param {Object} options - Animation options
     */
    static smoothExit(hidePanel, showPanel, options = {}) {
      const {
        hideDuration = 400,
        showDuration = 350
      } = options;

      return new Promise((resolve) => {
        // Clean up any previous animation classes
        hidePanel.classList.remove('panel-entering', 'panel-exiting', 'panel-fade-out');
        showPanel.classList.remove('panel-entering', 'panel-exiting', 'panel-fade-out');

        // Animate out the current panel with slide-down
        hidePanel.classList.add('panel-exiting');

        setTimeout(() => {
          hidePanel.style.display = 'none';
          hidePanel.classList.remove('panel-exiting');

          // Fade in the main panel
          showPanel.style.display = 'block';
          showPanel.style.opacity = '0';
          void showPanel.offsetWidth;
          
          showPanel.style.transition = `opacity ${showDuration}ms cubic-bezier(0.16, 1, 0.3, 1)`;
          showPanel.style.opacity = '1';

          setTimeout(() => {
            showPanel.style.transition = '';
            resolve();
          }, showDuration);
        }, hideDuration);
      });
    }
}
