// sw-register.js
// Registers the service worker when running in a browser context.

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;
const canUseServiceWorker = location.protocol === 'https:' || location.protocol === 'http:';

if (!isElectron && canUseServiceWorker && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}
