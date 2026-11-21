(function () {
  const articles = [...window.FRAMELET_ARTICLES].sort((a, b) => b.date.localeCompare(a.date));
  const homeView = document.querySelector('#home-view');
  const articleView = document.querySelector('#article-view');
  const archive = document.querySelector('#archive');
  const yearNav = document.querySelector('#year-nav');
  const mobileQuery = window.matchMedia('(max-width: 660px)');
  const homeUrl = window.location.pathname + window.location.search;
  const monthsZh = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  let pendingHomeRestore = false;
  let activeMobileLanguage = 'zh';

  function parseDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return { year, month, day };
  }

  function createTextElement(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = value;
    return element;
  }

  function groupByYear(items) {
    return items.reduce((groups, article) => {
      const year = parseDate(article.date).year;
      if (!groups.has(year)) groups.set(year, []);
      groups.get(year).push(article);
      return groups;
    }, new Map());
  }

  function formatDateEn(dateString) {
    const dateParts = parseDate(dateString);
    return monthsEn[dateParts.month - 1] + ' ' + dateParts.day + ', ' + dateParts.year;
  }

  function saveHomeState() {
    sessionStorage.setItem('framelet-home-scroll', String(window.scrollY));
  }

  function openArticle(slug) {
    saveHomeState();
    history.pushState({ view: 'article', slug: slug, fromHome: true }, '', '#/article/' + slug);
    renderArticle(slug);
  }

  function buildArchive() {
    const groups = groupByYear(articles);

    groups.forEach((yearArticles, year) => {
      const navButton = createTextElement('button', 'year-link', String(year));
      navButton.type = 'button';
      navButton.dataset.year = String(year);
      navButton.addEventListener('click', () => {
        document.querySelector('#year-' + year).scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      yearNav.append(navButton);

      const section = document.createElement('section');
      section.className = 'year-section';
      section.id = 'year-' + year;
      section.dataset.year = String(year);
      section.setAttribute('aria-labelledby', 'year-heading-' + year);

      const heading = createTextElement('h2', 'year-heading', String(year));
      heading.id = 'year-heading-' + year;
      section.append(heading);

      yearArticles.forEach((article) => {
        const dateParts = parseDate(article.date);
        const card = document.createElement('article');
        card.className = 'story-card' + (article.image ? ' has-image' : '');

        const dateStamp = document.createElement('time');
        dateStamp.className = 'date-stamp';
        dateStamp.dateTime = article.date;
        dateStamp.append(
          createTextElement('strong', '', String(dateParts.day).padStart(2, '0')),
          createTextElement('span', 'month-zh', monthsZh[dateParts.month - 1]),
          createTextElement('span', 'month-en', monthsEn[dateParts.month - 1])
        );
        card.append(dateStamp);

        if (article.image) {
          const imageWrap = document.createElement('div');
          imageWrap.className = 'story-image';
          const image = document.createElement('img');
          image.src = article.image;
          image.alt = article.imageAlt;
          image.loading = 'lazy';
          imageWrap.append(image);
          card.append(imageWrap);
        }

        const copy = document.createElement('div');
        copy.className = 'story-copy';
        copy.append(
          createTextElement('h3', '', article.titleZh),
          createTextElement('p', 'title-en', article.titleEn)
        );

        if (article.addendumDateZh || article.addendumDateEn) {
          const addendumMeta = document.createElement('p');
          addendumMeta.className = 'addendum-meta';
          addendumMeta.append(
            createTextElement('span', '', article.addendumDateZh || ''),
            createTextElement('span', '', article.addendumDateEn || '')
          );
          copy.append(addendumMeta);
        }

        const readButton = createTextElement('button', 'read-button', '点击阅读全文');
        readButton.type = 'button';
        readButton.textContent = '点击阅读全文 / Read the full piece';
        readButton.setAttribute('aria-label', '阅读全文 / Read the full piece: ' + article.titleZh + ' / ' + article.titleEn);
        readButton.addEventListener('click', () => openArticle(article.slug));
        copy.append(readButton);
        card.append(copy);
        section.append(card);
      });

      archive.append(section);
    });

    const firstYear = String(groups.keys().next().value);
    const firstYearLink = yearNav.querySelector('[data-year="' + firstYear + '"]');
    if (firstYearLink) firstYearLink.classList.add('is-active');

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
        if (!visible) return;
        yearNav.querySelectorAll('.year-link').forEach((link) => {
          link.classList.toggle('is-active', link.dataset.year === visible.target.dataset.year);
        });
      },
      { rootMargin: '-15% 0px -72% 0px', threshold: 0 }
    );

    document.querySelectorAll('.year-section').forEach((section) => observer.observe(section));
  }

  function createParallelCell(language, value, isClosing) {
    const cell = document.createElement('div');
    cell.className = 'parallel-cell ' + (language === 'en' ? 'english-cell' : 'chinese-cell');
    cell.dataset.languagePanel = language;
    const paragraph = createTextElement('p', isClosing ? 'closing-note' : '', value);
    if (language === 'en') paragraph.lang = 'en';
    cell.append(paragraph);
    return cell;
  }

  function renderParallelText(article) {
    const body = document.querySelector('#parallel-body');
    body.replaceChildren();

    article.bodyEn.forEach((englishParagraph, index) => {
      const row = document.createElement('div');
      row.className = 'parallel-row';
      row.append(
        createParallelCell('en', englishParagraph, false),
        createParallelCell('zh', article.bodyZh[index] || '', false)
      );
      body.append(row);
    });

    if (article.closingEn || article.closingZh) {
      const closingRow = document.createElement('div');
      closingRow.className = 'parallel-row closing-row';
      const englishClosing = createParallelCell('en', article.closingEn || '', true);
      closingRow.append(englishClosing, createParallelCell('zh', article.closingZh || '', true));
      body.append(closingRow);
    }

    if ((article.addendumEn && article.addendumEn.length) || (article.addendumZh && article.addendumZh.length)) {
      const headingRow = document.createElement('div');
      headingRow.className = 'parallel-row addendum-heading-row';
      const englishHeading = createParallelCell('en', article.addendumDateEn || 'Addendum', false);
      const chineseHeading = createParallelCell('zh', article.addendumDateZh || '补记', false);
      englishHeading.classList.add('addendum-heading-cell');
      chineseHeading.classList.add('addendum-heading-cell');
      headingRow.append(englishHeading, chineseHeading);
      body.append(headingRow);

      const addendumLength = Math.max(article.addendumEn?.length || 0, article.addendumZh?.length || 0);
      for (let index = 0; index < addendumLength; index += 1) {
        const row = document.createElement('div');
        row.className = 'parallel-row addendum-row';
        row.append(
          createParallelCell('en', article.addendumEn?.[index] || '', false),
          createParallelCell('zh', article.addendumZh?.[index] || '', false)
        );
        body.append(row);
      }
    }
  }

  function setMobileLanguage(language) {
    activeMobileLanguage = language;
    document.querySelectorAll('.mobile-language-tabs button').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.language === language);
    });

    document.querySelectorAll('[data-language-panel]').forEach((panel) => {
      panel.hidden = mobileQuery.matches && panel.dataset.languagePanel !== language;
    });
  }

  function syncResponsiveLanguage() {
    if (mobileQuery.matches) {
      setMobileLanguage(activeMobileLanguage);
    } else {
      document.querySelectorAll('[data-language-panel]').forEach((panel) => {
        panel.hidden = false;
      });
    }
  }

  function renderArticle(slug) {
    const article = articles.find((item) => item.slug === slug);
    if (!article) {
      history.replaceState({ view: 'home' }, '', homeUrl);
      renderHome(false);
      return;
    }

    homeView.hidden = true;
    articleView.hidden = false;
    const articleDate = document.querySelector('#article-date');
    articleDate.replaceChildren(
      createTextElement('p', '', article.displayDateZh),
      createTextElement('p', '', formatDateEn(article.date))
    );
    document.querySelector('#article-title').textContent = article.titleZh;
    document.querySelector('#article-title-en').textContent = article.titleEn;

    const imageWrap = document.querySelector('#article-image-wrap');
    if (article.image) {
      const image = document.querySelector('#article-image');
      image.src = article.image;
      image.alt = article.imageAlt;
      const caption = document.querySelector('#article-caption');
      caption.replaceChildren(
        createTextElement('span', '', article.caption),
        createTextElement('span', '', article.captionEn || article.caption)
      );
      imageWrap.hidden = false;
    } else {
      imageWrap.hidden = true;
    }

    renderParallelText(article);
    activeMobileLanguage = 'zh';
    syncResponsiveLanguage();
    document.title = article.titleZh + ' / ' + article.titleEn + ' · 片言菲林 Framelet';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function renderHome(restoreScroll) {
    articleView.hidden = true;
    homeView.hidden = false;
    document.title = '片言菲林 Framelet';

    if (restoreScroll) {
      const savedScroll = Number(sessionStorage.getItem('framelet-home-scroll') || 0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => window.scrollTo({ top: savedScroll, behavior: 'instant' }));
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  function returnHome() {
    pendingHomeRestore = true;
    if (history.state && history.state.fromHome) {
      history.back();
      return;
    }
    history.replaceState({ view: 'home' }, '', homeUrl);
    renderHome(true);
    pendingHomeRestore = false;
  }

  function renderRoute() {
    const match = window.location.hash.match(/^#\/article\/([^/?#]+)/);
    if (match) {
      renderArticle(decodeURIComponent(match[1]));
    } else {
      renderHome(pendingHomeRestore);
      pendingHomeRestore = false;
    }
  }

  buildArchive();

  document.querySelector('#back-home').addEventListener('click', returnHome);
  document.querySelector('#back-home-bottom').addEventListener('click', returnHome);
  document.querySelectorAll('.mobile-language-tabs button').forEach((button) => {
    button.addEventListener('click', () => setMobileLanguage(button.dataset.language));
  });

  mobileQuery.addEventListener('change', syncResponsiveLanguage);
  window.addEventListener('popstate', renderRoute);

  if (window.location.hash.startsWith('#/article/')) {
    history.replaceState({ view: 'article', fromHome: false }, '', window.location.href);
  } else {
    history.replaceState({ view: 'home' }, '', homeUrl);
  }
  renderRoute();
})();
