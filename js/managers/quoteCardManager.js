const QUOTE_API_URL = 'https://api.api-ninjas.com/v1/quotes';
const QUOTE_LOCAL_URL = 'resources/quotes.json';
const QUOTE_API_KEY_STORAGE = 'simnote_quote_api_key';
const QUOTE_CATEGORY_STORAGE = 'simnote_quote_category';
const FAVORITES_KEY = 'simnote_quote_favorites';
const LAST_QUOTE_KEY = 'simnote_quote_last';

class QuoteCardManager {
  constructor() {
    this.card = document.getElementById('quote-card');
    this.overlay = document.getElementById('quote-overlay');
    this.panel = document.getElementById('quote-panel');
    this.textEl = document.getElementById('quote-panel-text');
    this.authorEl = document.getElementById('quote-panel-author');
    this.statusEl = document.getElementById('quote-panel-status');
    this.prevBtn = document.getElementById('quote-panel-prev');
    this.nextBtn = document.getElementById('quote-panel-next');
    this.favoriteBtn = document.getElementById('quote-panel-favorite');
    this.journalBtn = document.getElementById('quote-panel-journal');
    this.closeBtn = document.getElementById('quote-panel-close');

    if (!this.card) return;

    this.history = [];
    this.index = -1;
    this.isOpen = false;
    this.isLoading = false;
    this.favorites = this.loadFavorites();
    this.localQuotes = [];
    this.localLoadPromise = null;

    this.bindEvents();
    void this.loadInitialQuote();
  }

  bindEvents() {
    this.card.addEventListener('click', () => {
      if (!this.isOpen) this.open();
    });

    this.card.addEventListener('keydown', (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && !this.isOpen) {
        event.preventDefault();
        this.open();
      }
    });

    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.close());
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        this.close();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        this.nextQuote();
      });
    }

    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        this.prevQuote();
      });
    }

    if (this.favoriteBtn) {
      this.favoriteBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        this.toggleFavorite();
      });
    }

    if (this.journalBtn) {
      this.journalBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        this.journalQuote();
      });
    }

    document.addEventListener('keydown', (event) => {
      if (this.isOpen && event.key === 'Escape') {
        this.close();
      }
    });
  }

  open() {
    this.isOpen = true;
    document.body.classList.add('quote-overlay-open');
    this.card.setAttribute('aria-expanded', 'true');
    if (this.overlay) this.overlay.setAttribute('aria-hidden', 'false');
    if (this.panel) this.panel.setAttribute('aria-hidden', 'false');
  }

  close() {
    this.isOpen = false;
    document.body.classList.remove('quote-overlay-open');
    this.card.setAttribute('aria-expanded', 'false');
    if (this.overlay) this.overlay.setAttribute('aria-hidden', 'true');
    if (this.panel) this.panel.setAttribute('aria-hidden', 'true');
    this.setStatus('');
  }

  async loadInitialQuote() {
    const last = this.loadLastQuote();
    if (last) {
      this.history = [last];
      this.index = 0;
      this.renderQuote();
      return;
    }
    await this.nextQuote();
  }

  get currentQuote() {
    if (this.index < 0 || this.index >= this.history.length) return null;
    return this.history[this.index];
  }

  setLoading(isLoading) {
    this.isLoading = isLoading;
    if (this.nextBtn) this.nextBtn.disabled = isLoading;
    if (this.prevBtn) this.prevBtn.disabled = isLoading || this.index <= 0;
    if (this.favoriteBtn) this.favoriteBtn.disabled = isLoading;
    if (this.journalBtn) this.journalBtn.disabled = isLoading;
    if (isLoading) {
      if (this.textEl) this.textEl.textContent = 'Finding a quote...';
      if (this.authorEl) this.authorEl.textContent = '';
    }
  }

  renderQuote() {
    const quote = this.currentQuote;
    if (!quote) return;
    if (this.textEl) this.textEl.textContent = quote.text;
    if (this.authorEl) {
      this.authorEl.textContent = quote.author ? `- ${quote.author}` : '';
    }
    this.updateFavoriteState();
    this.updateControls();
    this.saveLastQuote(quote);
  }

  updateControls() {
    if (this.prevBtn) this.prevBtn.disabled = this.index <= 0 || this.isLoading;
    if (this.nextBtn) this.nextBtn.disabled = this.isLoading;
  }

  async nextQuote() {
    if (this.isLoading) return;
    if (this.index < this.history.length - 1) {
      this.index += 1;
      this.renderQuote();
      return;
    }
    this.setLoading(true);
    const quote = await this.fetchQuote();
    this.setLoading(false);
    if (!quote) {
      this.setStatus('Unable to load a quote right now.');
      this.updateControls();
      return;
    }
    this.history.push(quote);
    this.index = this.history.length - 1;
    this.renderQuote();
  }

  prevQuote() {
    if (this.isLoading || this.index <= 0) return;
    this.index -= 1;
    this.renderQuote();
  }

  getApiKey() {
    return (typeof window !== 'undefined' && window.QUOTE_API_NINJAS_KEY)
      || localStorage.getItem(QUOTE_API_KEY_STORAGE)
      || '';
  }

  getCategory() {
    return localStorage.getItem(QUOTE_CATEGORY_STORAGE) || '';
  }

  async ensureLocalQuotesLoaded() {
    if (this.localLoadPromise) {
      await this.localLoadPromise;
      return;
    }
    this.localLoadPromise = this.loadLocalQuotes();
    await this.localLoadPromise;
  }

  async loadLocalQuotes() {
    try {
      const response = await fetch(QUOTE_LOCAL_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error('Local quotes fetch failed');
      const data = await response.json();
      this.localQuotes = this.normalizeLocalQuotes(data?.quotes);
    } catch (err) {
      this.localQuotes = [];
    }
  }

  normalizeLocalQuotes(quotes) {
    if (!Array.isArray(quotes)) return [];
    return quotes
      .map((entry) => ({
        text: entry?.quote || entry?.text || '',
        author: entry?.author || 'Unknown'
      }))
      .filter((entry) => entry.text);
  }

  getLocalQuote() {
    if (!this.localQuotes.length) return null;
    const pick = this.localQuotes[Math.floor(Math.random() * this.localQuotes.length)];
    return { text: pick.text, author: pick.author };
  }

  async fetchApiQuote(apiKey, category) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const url = category
        ? `${QUOTE_API_URL}?category=${encodeURIComponent(category)}`
        : QUOTE_API_URL;
      const response = await fetch(url, {
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'X-Api-Key': apiKey
        }
      });
      if (!response.ok) throw new Error('Quote API failed');
      const data = await response.json();
      const payload = Array.isArray(data) ? data[0] : data;
      const text = payload?.quote || payload?.text || payload?.content || '';
      const author = payload?.author || 'Unknown';
      if (!text) throw new Error('Invalid quote payload');
      return { text, author };
    } catch (err) {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  async fetchQuote() {
    const apiKey = this.getApiKey();
    const category = this.getCategory();
    if (apiKey) {
      const apiQuote = await this.fetchApiQuote(apiKey, category);
      if (apiQuote) {
        return apiQuote;
      }
    }

    await this.ensureLocalQuotesLoaded();
    const localQuote = this.getLocalQuote();
    if (!localQuote) return null;
    return localQuote;
  }

  quoteKey(quote) {
    return `${quote.text}||${quote.author || ''}`.toLowerCase();
  }

  isFavorite(quote) {
    const key = this.quoteKey(quote);
    return this.favorites.some((fav) => this.quoteKey(fav) === key);
  }

  toggleFavorite() {
    const quote = this.currentQuote;
    if (!quote) return;
    const key = this.quoteKey(quote);
    const idx = this.favorites.findIndex((fav) => this.quoteKey(fav) === key);
    if (idx >= 0) {
      this.favorites.splice(idx, 1);
      this.setStatus('Removed from favorites.');
    } else {
      this.favorites.unshift(quote);
      this.setStatus('Saved to favorites.');
    }
    this.saveFavorites();
    this.updateFavoriteState();
  }

  updateFavoriteState() {
    const quote = this.currentQuote;
    if (!quote || !this.favoriteBtn) return;
    const favored = this.isFavorite(quote);
    this.favoriteBtn.classList.toggle('is-favorite', favored);
    this.favoriteBtn.setAttribute('aria-pressed', favored ? 'true' : 'false');
    this.favoriteBtn.textContent = favored ? 'Saved' : 'Fav';
  }

  journalQuote() {
    const quote = this.currentQuote;
    if (!quote) return;
    if (typeof window.queueQuoteForEntry === 'function') {
      window.queueQuoteForEntry(quote);
    } else {
      window.pendingQuoteEntry = quote;
    }
    this.close();
    const newEntryBtn = document.getElementById('new-entry-btn');
    if (newEntryBtn) newEntryBtn.click();
  }

  loadFavorites() {
    try {
      const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY));
      return Array.isArray(stored) ? stored : [];
    } catch (err) {
      return [];
    }
  }

  saveFavorites() {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(this.favorites));
  }

  loadLastQuote() {
    try {
      const stored = JSON.parse(localStorage.getItem(LAST_QUOTE_KEY));
      if (!stored || !stored.text) return null;
      return { text: stored.text, author: stored.author || 'Unknown' };
    } catch (err) {
      return null;
    }
  }

  saveLastQuote(quote) {
    if (!quote) return;
    localStorage.setItem(LAST_QUOTE_KEY, JSON.stringify({
      text: quote.text,
      author: quote.author || 'Unknown'
    }));
  }

  setStatus(message) {
    if (this.statusEl) this.statusEl.textContent = message;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new QuoteCardManager();
});
