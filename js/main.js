(() => {
  const body = document.body;
  const html = document.documentElement;
  const OWNER_MODE_KEY = 'tetice-owner-mode';
  const LANG_KEY = 'tetice-site-lang';
  const ATTR_TRANSLATIONS = ['aria-label', 'title', 'placeholder', 'content'];

  const menuToggle = document.querySelector('[data-menu-toggle]');
  const menuPanel = document.querySelector('[data-menu-panel]');
  const tocButton = document.querySelector('[data-toc-toggle]');
  const tocDrawer = document.querySelector('[data-toc-drawer]');
  const tocClose = document.querySelector('[data-toc-close]');
  const tocPanel = document.querySelector('.toc-panel.has-content');
  const backToTop = document.getElementById('back-to-top');
  const languageButtons = [...document.querySelectorAll('[data-set-lang]')];

  const normalizeLang = value => String(value || '').toLowerCase().startsWith('en') ? 'en' : 'zh-CN';
  const defaultLang = normalizeLang(body.dataset.defaultLang || 'zh-CN');
  const supportedLangs = (body.dataset.supportedLangs || 'zh-CN,en')
    .split(',')
    .map(item => normalizeLang(item.trim()))
    .filter(Boolean);

  const syncOwnerMode = enabled => {
    body.classList.toggle('owner-mode', enabled);
  };

  const resolveLangValue = (zh, en, lang) => (
    lang === 'en'
      ? (en || zh || '')
      : (zh || en || '')
  );

  const applyLanguage = lang => {
    const nextLang = supportedLangs.includes(normalizeLang(lang))
      ? normalizeLang(lang)
      : defaultLang;

    body.dataset.siteLang = nextLang;
    html.lang = nextLang;

    document.querySelectorAll('[data-l10n-zh], [data-l10n-en]').forEach(node => {
      const zh = node.getAttribute('data-l10n-zh');
      const en = node.getAttribute('data-l10n-en');
      node.textContent = resolveLangValue(zh, en, nextLang);
    });

    ATTR_TRANSLATIONS.forEach(attr => {
      document
        .querySelectorAll(`[data-l10n-${attr}-zh], [data-l10n-${attr}-en]`)
        .forEach(node => {
          const zh = node.getAttribute(`data-l10n-${attr}-zh`);
          const en = node.getAttribute(`data-l10n-${attr}-en`);
          const value = resolveLangValue(zh, en, nextLang);

          if (value) {
            node.setAttribute(attr, value);
          }
        });
    });

    languageButtons.forEach(button => {
      const active = normalizeLang(button.dataset.setLang) === nextLang;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    try {
      localStorage.setItem(LANG_KEY, nextLang);
    } catch (_) {
      // Ignore storage failures.
    }
  };

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('owner') === 'on') {
      localStorage.setItem(OWNER_MODE_KEY, '1');
    }
    if (params.get('owner') === 'off') {
      localStorage.removeItem(OWNER_MODE_KEY);
    }
    syncOwnerMode(localStorage.getItem(OWNER_MODE_KEY) === '1');

    const langFromQuery = params.get('lang');
    const langFromStorage = localStorage.getItem(LANG_KEY);
    applyLanguage(langFromQuery || langFromStorage || defaultLang);
  } catch (_) {
    syncOwnerMode(false);
    applyLanguage(defaultLang);
  }

  languageButtons.forEach(button => {
    button.addEventListener('click', () => {
      applyLanguage(button.dataset.setLang);
    });
  });

  const setMenuOpen = open => {
    body.classList.toggle('menu-open', open);
    if (menuToggle) menuToggle.setAttribute('aria-expanded', String(open));
  };

  if (menuToggle && menuPanel) {
    menuToggle.addEventListener('click', () => {
      const nextState = !body.classList.contains('menu-open');
      setMenuOpen(nextState);
    });

    menuPanel.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => setMenuOpen(false));
    });
  }

  const setTocOpen = open => {
    body.classList.toggle('toc-open', open);
    if (tocButton) tocButton.setAttribute('aria-expanded', String(open));
  };

  if (!tocPanel || !tocDrawer) {
    if (tocButton) tocButton.style.display = 'none';
  } else {
    if (tocButton) {
      tocButton.addEventListener('click', () => {
        const nextState = !body.classList.contains('toc-open');
        setTocOpen(nextState);
      });
    }

    if (tocClose) {
      tocClose.addEventListener('click', () => setTocOpen(false));
    }

    tocDrawer.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', () => setTocOpen(false));
    });
  }

  if (backToTop) {
    const syncBackToTop = () => {
      backToTop.classList.toggle('is-visible', window.scrollY > 360);
    };

    window.addEventListener('scroll', syncBackToTop, { passive: true });
    syncBackToTop();

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const tocLinks = [...document.querySelectorAll('.toc-link, .toc-link-child')];
  const tocTargets = tocLinks
    .map(link => {
      const href = link.getAttribute('href') || '';
      if (!href.startsWith('#')) return null;
      const id = decodeURIComponent(href.slice(1));
      const target = document.getElementById(id);
      if (!target) return null;
      return { link, item: link.closest('li'), target };
    })
    .filter(Boolean);

  if (tocTargets.length) {
    const activate = currentId => {
      tocTargets.forEach(({ link, item, target }) => {
        const active = target.id === currentId;
        link.classList.toggle('is-active', active);
        if (item) item.classList.toggle('is-active', active);
      });
    };

    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];

      if (visible) activate(visible.target.id);
    }, {
      rootMargin: '-18% 0px -58% 0px',
      threshold: [0, 0.1, 0.4, 1]
    });

    tocTargets.forEach(({ target }) => observer.observe(target));
    activate(tocTargets[0].target.id);
  }

  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = lightbox?.querySelector('.lightbox-close');
  const lightboxPrev = lightbox?.querySelector('.lightbox-nav.is-prev');
  const lightboxNext = lightbox?.querySelector('.lightbox-nav.is-next');
  const lightboxLinks = [...document.querySelectorAll('[data-lightbox]')];
  const lightboxGroups = new Map();
  let activeGroup = [];
  let activeIndex = 0;

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    body.classList.remove('lightbox-open');
  };

  const renderLightbox = index => {
    if (!lightboxImage || !lightboxCaption || !activeGroup.length) return;
    activeIndex = (index + activeGroup.length) % activeGroup.length;
    const node = activeGroup[activeIndex];
    const lang = normalizeLang(body.dataset.siteLang || defaultLang);
    const caption = lang === 'en'
      ? (node.dataset.captionEn || node.dataset.caption || '')
      : (node.dataset.caption || node.dataset.captionEn || '');

    lightboxImage.src = node.href;
    lightboxImage.alt = node.querySelector('img')?.alt || caption || '';
    lightboxCaption.textContent = caption;
  };

  const openLightbox = (groupKey, clickedNode) => {
    if (!lightbox) return;
    activeGroup = lightboxGroups.get(groupKey) || [clickedNode];
    activeIndex = activeGroup.indexOf(clickedNode);
    renderLightbox(activeIndex);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    body.classList.add('lightbox-open');
  };

  if (lightboxLinks.length && lightbox) {
    lightboxLinks.forEach(node => {
      const groupKey = node.dataset.group || 'default';
      const list = lightboxGroups.get(groupKey) || [];
      list.push(node);
      lightboxGroups.set(groupKey, list);

      node.addEventListener('click', event => {
        event.preventDefault();
        openLightbox(groupKey, node);
      });
    });

    lightboxClose?.addEventListener('click', closeLightbox);
    lightboxPrev?.addEventListener('click', () => renderLightbox(activeIndex - 1));
    lightboxNext?.addEventListener('click', () => renderLightbox(activeIndex + 1));

    lightbox.addEventListener('click', event => {
      if (event.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', event => {
      if (!lightbox.classList.contains('is-open')) return;
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') renderLightbox(activeIndex - 1);
      if (event.key === 'ArrowRight') renderLightbox(activeIndex + 1);
    });
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) setMenuOpen(false);
  });
})();
