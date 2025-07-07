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
}
