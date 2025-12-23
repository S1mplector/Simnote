const LANGUAGE_KEY = 'simnote_language';
const DEFAULT_LANGUAGE = 'en';

const translations = {
  en: {
    meta: {
      description: 'Simnote - A beautiful journaling app for capturing your thoughts, tracking your moods, and reflecting on your journey.'
    },
    aria: {
      quickControls: 'Quick Controls',
      manual: 'Manual',
      settings: 'Settings',
      editorSettings: 'Editor Settings',
      languageSelect: 'Language'
    },
    common: {
      menu: 'Menu',
      back: 'Back',
      close: 'Close',
      save: 'Save',
      write: 'Write',
      continue: 'Continue',
      cancel: 'Cancel',
      delete: 'Delete',
      done: 'Done',
      skip: 'Skip',
      next: 'Next',
      search: 'Search',
      export: 'Export',
      import: 'Import',
      clear: 'Clear',
      clearAll: 'Clear All',
      startWriting: 'Start Writing',
      begin: 'Begin'
    },
    nav: {
      backToMenu: 'Back to Menu'
    },
    manual: {
      title: 'Simnote Manual',
      intro: 'Simnote is your calm journaling space. Notes save as you type, so you can focus on writing.',
      tip1: 'Start a new entry from the first drawer, or open past entries from the second drawer.',
      tip2: 'Everything autosaves while you type. Press Esc to return to the main menu.',
      tip3: 'Look at your mood data anytime from the third drawer.',
      tip4: 'Customize themes, fonts, and preferences in Settings.',
      refresher: 'Want a refresher? Run the quick tour anytime.',
      startTour: 'Start Tour'
    },
    theme: {
      title: 'Theme',
      dark: 'Dark'
    },
    storage: {
      title: 'Data & Storage',
      entries: 'entries',
      images: 'images',
      fileStorage: 'File Storage',
      fileStorageHint: 'Your entries are saved as .simnote files for backup & portability',
      clickToOpenFolder: 'Click to open folder',
      clickToOpenPath: 'Click to open: {path}',
      active: 'File storage active',
      notConfigured: 'Not configured',
      selectFolder: 'Click to select a folder',
      notEnabled: 'File storage not enabled',
      customFolder: 'Custom folder',
      folderSelected: 'File storage folder selected!'
    },
    preferences: {
      title: 'Preferences',
      dailyMoodCheckin: 'Daily mood check-in',
      showPreviews: 'Show entry previews',
      compactList: 'Compact list view',
      language: 'Language'
    },
    language: {
      english: 'English',
      turkish: 'Türkçe'
    },
    drawer: {
      journal: 'Journal',
      entries: 'Entries',
      moods: 'Moods'
    },
    quote: {
      label: 'Quotes',
      open: 'Open quotes',
      previousTitle: 'Previous quote (←)',
      previous: 'Previous quote',
      nextTitle: 'Next quote (→)',
      next: 'Next quote',
      favorite: 'Favorite quote',
      loading: 'Loading quote...',
      journal: 'Journal',
      journalTitle: 'Journal about this quote',
      putDown: 'Put down',
      finding: 'Finding a quote...',
      unavailable: 'Unable to load a quote right now.',
      saved: 'Saved to favorites.',
      removed: 'Removed from favorites.'
    },
    journal: {
      title: 'Entries',
      searchPlaceholder: 'Search...',
      sortNewest: 'Newest First',
      sortOldest: 'Oldest First',
      sortAz: 'A → Z',
      sortMood: 'By Mood',
      filterByDate: 'Filter by date'
    },
    stats: {
      title: 'Mood Tracking',
      dayStreak: 'Day Streak',
      bestStreak: 'Best Streak',
      totalEntries: 'Total Entries',
      wordsWritten: 'Words Written',
      activityCalendar: 'Activity Calendar',
      less: 'Less',
      more: 'More',
      moodDistribution: 'Mood Distribution',
      writingStatistics: 'Writing Statistics',
      avgWords: 'Average words per entry',
      favoriteEntries: 'Favorite entries',
      topTags: 'Most used tags',
      noMoodData: 'No mood data yet. Start journaling to see your mood trends!',
      noTags: 'No tags yet'
    },
    chat: {
      placeholder: 'Type a message...',
      newChat: 'New Chat',
      newMessages: 'New messages ↓',
      intro1: "Hello, I'm Serenity – your calming companion here in Simnote. I specialize in relaxing conversation and gentle CBT-style guidance. How can I support you today?",
      intro2: "Your privacy matters: our chat isn't stored anywhere once you close Simnote. Serenity only knows what you share during this session.",
      breathPrompt: 'I can guide you through a one-minute breathing exercise.',
      showEarlier: 'Show earlier messages',
      showEarlierCount: 'Show {count} earlier messages'
    },
    entry: {
      titlePlaceholder: 'Title',
      contentPlaceholder: 'Start writing...',
      untitled: 'Untitled',
      saved: 'Entry saved!',
      nothingToSave: 'Nothing to save yet.',
      noEntries: 'No entries saved.',
      noMatching: 'No matching entries.',
      noMood: 'No Mood'
    },
    mood: {
      heading: 'How are you feeling right now?',
      headingToday: 'How are you feeling today?',
      prompt: "I'm feeling...",
      startWriting: 'Start Writing'
    },
    attributes: {
      title: "What's making you feel this way?",
      subtitle: 'Tap to select • Hold to edit or reorder',
      add: 'Add',
      addTitle: 'Add Attribute',
      emoji: 'Emoji',
      name: 'Name',
      namePlaceholder: 'e.g. Travel',
      delete: 'Delete {name}'
    },
    templates: {
      title: 'Choose a Template',
      blank: {
        name: 'Blank',
        desc: 'Start with an empty page—perfect when you already know what you want to write.'
      },
      gratitude: {
        name: 'Gratitude',
        desc: 'Great for ending the day on a positive note. List three things you appreciate.',
        prompts: [
          'List three things you are grateful for today.',
          'Why does each make you feel grateful?'
        ]
      },
      reflect: {
        name: 'Reflection',
        desc: 'Ideal for a balanced daily review: celebrate wins and spot areas to grow.',
        prompts: [
          'What went well today?',
          'What could be improved?',
          'What is one thing you learned?'
        ]
      },
      meeting: {
        name: 'Meeting Notes',
        desc: 'Capture important discussions and follow-ups quickly during meetings.',
        prompts: [
          'What is the meeting topic?',
          'Who attended?',
          'Summarize key discussion points.',
          'List action items.'
        ]
      },
      dream: {
        name: 'Dream Log',
        desc: 'Jot down dreams first thing in the morning to improve recall and spot patterns.',
        prompts: [
          'Describe your dream.',
          'How did it make you feel?',
          'Any symbols or themes you noticed?'
        ]
      }
    },
    settings: {
      title: 'Settings',
      fontSize: 'Font Size',
      lineHeight: 'Line Height',
      fontFamily: 'Font Family',
      textWidth: 'Text Width',
      widthNarrow: 'Narrow',
      widthComfortable: 'Comfortable',
      widthFull: 'Full',
      showToolbar: 'Show formatting toolbar',
      showWordCount: 'Show word count',
      spellcheck: 'Spellcheck'
    },
    exportImport: {
      entriesExported: 'Entries exported successfully!',
      entriesImported: '{count} entries imported!',
      dataExported: 'Data exported successfully!',
      dataCleared: 'All data cleared',
      clearTitle: 'Clear All Data?',
      clearBody: 'This will permanently delete all your journal entries. This action cannot be undone.',
      clearConfirm: 'Delete Everything',
      clearCancel: 'Cancel'
    },
    editor: {
      bold: 'Bold (Ctrl+B)',
      italic: 'Italic (Ctrl+I)',
      underline: 'Underline (Ctrl+U)',
      heading: 'Heading',
      quote: 'Quote',
      bullets: 'Bullet List',
      numbered: 'Numbered List',
      insertLink: 'Insert Link',
      insertImage: 'Insert Image',
      recordAudio: 'Record Audio',
      linkDialogTitle: 'Insert Link',
      linkDialogPlaceholder: 'https://example.com',
      linkDialogInsert: 'Insert',
      linkDialogCancel: 'Cancel'
    },
    keyboard: {
      title: 'Keyboard Shortcuts',
      hint: 'Press Shift + ? to toggle this help',
      close: 'Close',
      shortcuts: {
        newEntry: 'New Entry',
        viewEntries: 'View Entries',
        viewInsights: 'View Insights',
        saveEntry: 'Save Entry',
        goBack: 'Go Back',
        searchEntries: 'Search Entries',
        settings: 'Settings',
        showShortcuts: 'Show Shortcuts'
      }
    },
    audio: {
      label: 'SIMNOTE AUDIO',
      close: 'Close',
      record: 'Record',
      reRecord: 'Re-record',
      save: 'Save',
      micError: 'Could not access microphone. Please ensure microphone permissions are granted.'
    },
    guidedPrompt: {
      next: 'Next'
    },
    breathing: {
      inhale: 'Inhale',
      hold: 'Hold',
      exhale: 'Exhale',
      round: 'Round {current} / {total}'
    },
    greeting: {
      hello: 'Hello',
      morning: 'Good Morning',
      afternoon: 'Good Afternoon',
      evening: 'Good Evening',
      night: 'Good Night'
    },
    word: {
      one: 'word',
      other: 'words'
    },
    entryCount: {
      one: 'entry',
      other: 'entries'
    },
    tags: {
      addPlaceholder: 'Add tag...'
    },
    favorites: {
      filterTitle: 'Show favorites only'
    },
    misc: {
      applyingTheme: 'Applying theme...'
    }
  },
  tr: {
    meta: {
      description: 'Simnote - Düşüncelerini yazmak, duygularını takip etmek ve yolculuğunu yansıtmak için zarif bir günlük uygulaması.'
    },
    aria: {
      quickControls: 'Hızlı Kontroller',
      manual: 'Kılavuz',
      settings: 'Ayarlar',
      editorSettings: 'Düzenleyici Ayarları',
      languageSelect: 'Dil'
    },
    common: {
      menu: 'Menü',
      back: 'Geri',
      close: 'Kapat',
      save: 'Kaydet',
      write: 'Yaz',
      continue: 'Devam',
      cancel: 'İptal',
      delete: 'Sil',
      done: 'Bitti',
      skip: 'Atla',
      next: 'İleri',
      search: 'Ara',
      export: 'Dışa Aktar',
      import: 'İçe Aktar',
      clear: 'Temizle',
      clearAll: 'Tümünü Temizle',
      startWriting: 'Yazmaya Başla',
      begin: 'Başla'
    },
    nav: {
      backToMenu: 'Menüye Dön'
    },
    manual: {
      title: 'Simnote Kılavuzu',
      intro: 'Simnote, sakin bir günlük alanın. Notlar yazdıkça kaydolur, böylece yazmaya odaklanırsın.',
      tip1: 'İlk çekmeceden yeni bir kayıt başlatabilir veya ikinci çekmeceden geçmiş kayıtları açabilirsin.',
      tip2: 'Yazarken her şey otomatik kaydolur. Ana menüye dönmek için Esc tuşuna bas.',
      tip3: 'Üçüncü çekmeceden istediğin zaman duygu verilerine bak.',
      tip4: 'Ayarlar’dan temaları, yazı tiplerini ve tercihleri özelleştir.',
      refresher: 'Hatırlatmaya mı ihtiyacın var? Hızlı turu istediğin zaman başlat.',
      startTour: 'Turu Başlat'
    },
    theme: {
      title: 'Tema',
      dark: 'Koyu'
    },
    storage: {
      title: 'Veri ve Depolama',
      entries: 'kayıt',
      images: 'görsel',
      fileStorage: 'Dosya Depolama',
      fileStorageHint: 'Kayıtların yedekleme ve taşınabilirlik için .simnote dosyaları olarak saklanır',
      clickToOpenFolder: 'Klasörü açmak için tıkla',
      clickToOpenPath: 'Açmak için tıkla: {path}',
      active: 'Dosya depolama etkin',
      notConfigured: 'Yapılandırılmadı',
      selectFolder: 'Bir klasör seçmek için tıkla',
      notEnabled: 'Dosya depolama etkin değil',
      customFolder: 'Özel klasör',
      folderSelected: 'Dosya depolama klasörü seçildi!'
    },
    preferences: {
      title: 'Tercihler',
      dailyMoodCheckin: 'Günlük duygu yoklaması',
      showPreviews: 'Kayıt önizlemelerini göster',
      compactList: 'Kompakt liste görünümü',
      language: 'Dil'
    },
    language: {
      english: 'İngilizce',
      turkish: 'Türkçe'
    },
    drawer: {
      journal: 'Günlük',
      entries: 'Kayıtlar',
      moods: 'Duygular'
    },
    quote: {
      label: 'Alıntılar',
      open: 'Alıntıları aç',
      previousTitle: 'Önceki alıntı (←)',
      previous: 'Önceki alıntı',
      nextTitle: 'Sonraki alıntı (→)',
      next: 'Sonraki alıntı',
      favorite: 'Alıntıyı favorile',
      loading: 'Alıntı yükleniyor...',
      journal: 'Yaz',
      journalTitle: 'Bu alıntı hakkında yaz',
      putDown: 'Bırak',
      finding: 'Alıntı aranıyor...',
      unavailable: 'Şu anda alıntı yüklenemiyor.',
      saved: 'Favorilere eklendi.',
      removed: 'Favorilerden çıkarıldı.'
    },
    journal: {
      title: 'Kayıtlar',
      searchPlaceholder: 'Ara...',
      sortNewest: 'En Yeni',
      sortOldest: 'En Eski',
      sortAz: 'A → Z',
      sortMood: 'Duyguya Göre',
      filterByDate: 'Tarihe göre filtrele'
    },
    stats: {
      title: 'Duygu Takibi',
      dayStreak: 'Gün Serisi',
      bestStreak: 'En İyi Seri',
      totalEntries: 'Toplam Kayıt',
      wordsWritten: 'Yazılan Kelime',
      activityCalendar: 'Aktivite Takvimi',
      less: 'Az',
      more: 'Çok',
      moodDistribution: 'Duygu Dağılımı',
      writingStatistics: 'Yazım İstatistikleri',
      avgWords: 'Kayıt başına ortalama kelime',
      favoriteEntries: 'Favori kayıtlar',
      topTags: 'En çok kullanılan etiketler',
      noMoodData: 'Henüz duygu verisi yok. Duygu trendlerini görmek için yazmaya başla!',
      noTags: 'Henüz etiket yok'
    },
    chat: {
      placeholder: 'Bir mesaj yaz...',
      newChat: 'Yeni Sohbet',
      newMessages: 'Yeni mesajlar ↓',
      intro1: 'Merhaba, ben Serenity – Simnote’taki sakinleştirici yol arkadaşın. Rahatlatıcı sohbet ve nazik CBT tarzı yönlendirmelerde uzmanım. Sana bugün nasıl destek olabilirim?',
      intro2: 'Gizliliğin önemli: Simnote’u kapattığında sohbetimiz saklanmaz. Serenity yalnızca bu oturumda paylaştıklarını bilir.',
      breathPrompt: 'Bir dakikalık nefes egzersizinde sana rehberlik edebilirim.',
      showEarlier: 'Önceki mesajları göster',
      showEarlierCount: 'Önceki {count} mesajı göster'
    },
    entry: {
      titlePlaceholder: 'Başlık',
      contentPlaceholder: 'Yazmaya başla...',
      untitled: 'Başlıksız',
      saved: 'Kayıt kaydedildi!',
      nothingToSave: 'Henüz kaydedilecek bir şey yok.',
      noEntries: 'Henüz kayıt yok.',
      noMatching: 'Eşleşen kayıt bulunamadı.',
      noMood: 'Duygu Yok'
    },
    mood: {
      heading: 'Şu anda nasıl hissediyorsun?',
      headingToday: 'Bugün nasıl hissediyorsun?',
      prompt: 'Şu an kendimi...',
      startWriting: 'Yazmaya Başla'
    },
    attributes: {
      title: 'Böyle hissetmene ne sebep oluyor?',
      subtitle: 'Seçmek için dokun • Düzenlemek veya yeniden sıralamak için basılı tut',
      add: 'Ekle',
      addTitle: 'Özellik Ekle',
      emoji: 'Emoji',
      name: 'Ad',
      namePlaceholder: 'ör. Seyahat',
      delete: '{name} sil'
    },
    templates: {
      title: 'Şablon Seç',
      blank: {
        name: 'Boş',
        desc: 'Boş bir sayfayla başla—ne yazmak istediğini biliyorsan ideal.'
      },
      gratitude: {
        name: 'Şükür',
        desc: 'Günü olumlu kapatmak için harika. Şükrettiğin üç şeyi listele.',
        prompts: [
          'Bugün şükrettiğin üç şeyi yaz.',
          'Her biri sana neden iyi hissettiriyor?'
        ]
      },
      reflect: {
        name: 'Yansıtma',
        desc: 'Dengeli bir günlük değerlendirme için ideal: başarıları kutla, gelişim alanlarını gör.',
        prompts: [
          'Bugün neler iyi gitti?',
          'Neler daha iyi olabilirdi?',
          'Bugün öğrendiğin bir şey neydi?'
        ]
      },
      meeting: {
        name: 'Toplantı Notları',
        desc: 'Toplantılarda önemli konuşmaları ve takipleri hızlıca kaydet.',
        prompts: [
          'Toplantının konusu neydi?',
          'Kimler katıldı?',
          'Ana görüşme noktalarını özetle.',
          'Aksiyon maddelerini listele.'
        ]
      },
      dream: {
        name: 'Rüya Günlüğü',
        desc: 'Rüyaları sabah ilk iş yazmak hatırlamayı artırır ve kalıpları görmeyi sağlar.',
        prompts: [
          'Rüyanı anlat.',
          'Sana nasıl hissettirdi?',
          'Fark ettiğin semboller veya temalar var mı?'
        ]
      }
    },
    settings: {
      title: 'Ayarlar',
      fontSize: 'Yazı Boyutu',
      lineHeight: 'Satır Aralığı',
      fontFamily: 'Yazı Tipi',
      textWidth: 'Metin Genişliği',
      widthNarrow: 'Dar',
      widthComfortable: 'Rahat',
      widthFull: 'Tam',
      showToolbar: 'Biçimlendirme araç çubuğunu göster',
      showWordCount: 'Kelime sayısını göster',
      spellcheck: 'Yazım denetimi'
    },
    exportImport: {
      entriesExported: 'Kayıtlar dışa aktarıldı!',
      entriesImported: '{count} kayıt içe aktarıldı!',
      dataExported: 'Veriler dışa aktarıldı!',
      dataCleared: 'Tüm veriler temizlendi',
      clearTitle: 'Tüm Veriler Silinsin mi?',
      clearBody: 'Tüm günlük kayıtların kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      clearConfirm: 'Her Şeyi Sil',
      clearCancel: 'İptal'
    },
    editor: {
      bold: 'Kalın (Ctrl+B)',
      italic: 'İtalik (Ctrl+I)',
      underline: 'Altı çizili (Ctrl+U)',
      heading: 'Başlık',
      quote: 'Alıntı',
      bullets: 'Madde İşaretli Liste',
      numbered: 'Numaralı Liste',
      insertLink: 'Bağlantı Ekle',
      insertImage: 'Görsel Ekle',
      recordAudio: 'Ses Kaydet',
      linkDialogTitle: 'Bağlantı Ekle',
      linkDialogPlaceholder: 'https://ornek.com',
      linkDialogInsert: 'Ekle',
      linkDialogCancel: 'İptal'
    },
    keyboard: {
      title: 'Klavye Kısayolları',
      hint: 'Bu yardımı aç/kapatmak için Shift + ? tuşlarına bas',
      close: 'Kapat',
      shortcuts: {
        newEntry: 'Yeni Kayıt',
        viewEntries: 'Kayıtları Gör',
        viewInsights: 'İstatistikleri Gör',
        saveEntry: 'Kaydı Kaydet',
        goBack: 'Geri Dön',
        searchEntries: 'Kayıtları Ara',
        settings: 'Ayarlar',
        showShortcuts: 'Kısayolları Göster'
      }
    },
    audio: {
      label: 'SIMNOTE SES',
      close: 'Kapat',
      record: 'Kayda Al',
      reRecord: 'Yeniden Kaydet',
      save: 'Kaydet',
      micError: 'Mikrofona erişilemedi. Lütfen mikrofon izinlerini kontrol edin.'
    },
    guidedPrompt: {
      next: 'İleri'
    },
    breathing: {
      inhale: 'Nefes al',
      hold: 'Tut',
      exhale: 'Nefes ver',
      round: 'Tur {current} / {total}'
    },
    greeting: {
      hello: 'Merhaba',
      morning: 'Günaydın',
      afternoon: 'Tünaydın',
      evening: 'İyi Akşamlar',
      night: 'İyi Geceler'
    },
    word: {
      one: 'kelime',
      other: 'kelime'
    },
    entryCount: {
      one: 'kayıt',
      other: 'kayıt'
    },
    tags: {
      addPlaceholder: 'Etiket ekle...'
    },
    favorites: {
      filterTitle: 'Yalnızca favorileri göster'
    },
    misc: {
      applyingTheme: 'Tema uygulanıyor...'
    }
  }
};

const localeMap = {
  en: 'en-US',
  tr: 'tr-TR'
};

let currentLanguage = DEFAULT_LANGUAGE;

const getNestedValue = (obj, path) => {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
};

const interpolate = (value, params = {}) => {
  if (typeof value !== 'string') return value;
  return value.replace(/\{(\w+)\}/g, (_, key) => (params[key] !== undefined ? params[key] : ''));
};

const resolveTranslation = (key, lang = currentLanguage) => {
  const localized = getNestedValue(translations[lang], key);
  if (localized !== undefined) return localized;
  return getNestedValue(translations[DEFAULT_LANGUAGE], key);
};

export const getLanguage = () => currentLanguage;

export const getLocale = () => localeMap[currentLanguage] || currentLanguage;

export const t = (key, params = {}) => {
  const value = resolveTranslation(key);
  if (typeof value === 'string') return interpolate(value, params);
  return value !== undefined ? value : key;
};

export const tPlural = (key, count, params = {}) => {
  const value = resolveTranslation(key);
  if (!value || typeof value !== 'object') {
    return interpolate(String(value || ''), { count, ...params });
  }
  const rules = new Intl.PluralRules(getLocale());
  const form = rules.select(count);
  const template = value[form] || value.other || value.one || '';
  return interpolate(template, { count, ...params });
};

export const applyTranslations = (root = document) => {
  if (!root || typeof root.querySelectorAll !== 'function') return;

  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });

  root.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.dataset.i18nHtml;
    if (key) el.innerHTML = t(key);
  });

  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (!key) return;
    const value = t(key);
    if (el.hasAttribute('placeholder')) {
      el.setAttribute('placeholder', value);
    }
    if (el.hasAttribute('data-placeholder')) {
      el.setAttribute('data-placeholder', value);
    }
  });

  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.dataset.i18nTitle;
    if (key) el.setAttribute('title', t(key));
  });

  root.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    const key = el.dataset.i18nAriaLabel;
    if (key) el.setAttribute('aria-label', t(key));
  });

  root.querySelectorAll('[data-i18n-content]').forEach(el => {
    const key = el.dataset.i18nContent;
    if (key) el.setAttribute('content', t(key));
  });
};

const detectLanguage = () => {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;
  const base = (navigator.language || DEFAULT_LANGUAGE).split('-')[0];
  return translations[base] ? base : DEFAULT_LANGUAGE;
};

export const setLanguage = (lang, { persist = true } = {}) => {
  if (!translations[lang]) lang = DEFAULT_LANGUAGE;
  currentLanguage = lang;
  if (persist && typeof localStorage !== 'undefined') {
    localStorage.setItem(LANGUAGE_KEY, lang);
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    applyTranslations();
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  }
};

export const initI18n = () => {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(LANGUAGE_KEY) : null;
  const initial = stored || detectLanguage();
  setLanguage(initial, { persist: Boolean(stored) });
};
