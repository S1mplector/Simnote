// typingEffect.js
export function typeText(element, text, speed = 40, cursor = true) {
  const el = (typeof element === 'string') ? document.getElementById(element) : element;
  if (!el) return;
  el.textContent = '';
  let idx = 0;

  if (cursor) {
    el.classList.add('typing-cursor');
  }

  const interval = setInterval(() => {
    el.textContent += text[idx];
    idx++;
    if (idx === text.length) {
      clearInterval(interval);
      if (cursor) el.classList.remove('typing-cursor');
    }
  }, speed);
} 