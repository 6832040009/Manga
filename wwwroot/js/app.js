// MangaVerse Main Application Logic
(() => {
  // Application State
  const state = {
    isAdmin: false,
    adminUsername: 'prct',
    mangas: [],
    categories: [],
    currentFilter: {
      type: 'All',
      category: 'All',
      status: 'All',
      sort: 'latest',
      q: ''
    },
    bookmarks: JSON.parse(localStorage.getItem('mv_bookmarks') || '[]'),
    readingHistory: JSON.parse(localStorage.getItem('mv_history') || '{}'),
    readerSettings: JSON.parse(localStorage.getItem('mv_reader_settings') || '{"mode":"webtoon","width":"800px"}'),
    currentManga: null,
    currentChapterData: null,
    currentPagedIndex: 0,
    tempChapterPages: [] // For adding/editing chapter
  };

  // DOM Elements
  const DOM = {
    navbar: document.getElementById('appNavbar'),
    authNavArea: document.getElementById('authNavArea'),
    mainContent: document.getElementById('mainContent'),
    searchInput: document.getElementById('searchInput'),
    searchClearBtn: document.getElementById('searchClearBtn'),
    toastContainer: document.getElementById('toastContainer'),
    // Modals
    loginModal: document.getElementById('loginModal'),
    adminDashboardModal: document.getElementById('adminDashboardModal'),
    mangaFormModal: document.getElementById('mangaFormModal'),
    chapterManagerModal: document.getElementById('chapterManagerModal'),
    chapterFormModal: document.getElementById('chapterFormModal')
  };

  // Toast Helper
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}" style="width: 18px; height: 18px; flex-shrink: 0;"></i>
      <span>${escapeHtml(message)}</span>
    `;
    
    DOM.toastContainer.appendChild(toast);
    lucide.createIcons({ root: toast });

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // HTML Escape Helper
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Modal Open / Close Helpers
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('show');
    if (!document.querySelector('.modal-backdrop.show')) {
      document.body.style.overflow = '';
    }
  }

  // Setup Global Modal Event Listeners
  document.querySelectorAll('.closeModalBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-backdrop');
      closeModal(modal);
    });
  });

  document.querySelectorAll('.closeSubModalBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(DOM.chapterFormModal);
    });
  });

  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
      closeModal(e.target);
    }
  });

  // Setup Auth Navbar Display
  function renderAuthNavbar() {
    if (state.isAdmin) {
      DOM.authNavArea.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="badge badge-admin">
            <i data-lucide="crown" style="width: 14px; height: 14px;"></i>
            <span>Admin: ${state.adminUsername}</span>
          </div>
          <button class="btn btn-primary btn-sm" id="navDashboardBtn">
            <i data-lucide="layout-dashboard" style="width: 14px; height: 14px;"></i>
            <span>แผงควบคุม</span>
          </button>
          <button class="btn btn-secondary btn-sm" id="navLogoutBtn" title="ออกจากระบบ">
            <i data-lucide="log-out" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      `;

      document.getElementById('navDashboardBtn')?.addEventListener('click', openAdminDashboard);
      document.getElementById('navLogoutBtn')?.addEventListener('click', handleLogout);
    } else {
      DOM.authNavArea.innerHTML = `
        <button class="btn btn-secondary btn-sm" id="openLoginModalBtn">
          <i data-lucide="shield" style="width: 14px; height: 14px;"></i>
          <span>Admin Login</span>
        </button>
      `;

      document.getElementById('openLoginModalBtn')?.addEventListener('click', () => {
        document.getElementById('loginErrorMsg').style.display = 'none';
        document.getElementById('adminUsername').value = 'prct';
        document.getElementById('adminPassword').value = '';
        openModal(DOM.loginModal);
      });
    }

    lucide.createIcons({ root: DOM.authNavArea });
  }

  // Handle Admin Login
  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    const errorEl = document.getElementById('loginErrorMsg');
    const submitBtn = document.getElementById('loginSubmitBtn');

    submitBtn.disabled = true;
    errorEl.style.display = 'none';

    try {
      const res = await API.login(username, password);
      if (res && res.success) {
        state.isAdmin = true;
        state.adminUsername = res.username || 'prct';
        closeModal(DOM.loginModal);
        renderAuthNavbar();
        showToast('เข้าสู่ระบบผู้ดูแลระบบสำเร็จ ยินดีต้อนรับคุณ ' + state.adminUsername, 'success');
        // Refresh current view to show admin controls if needed
        handleRoute();
      }
    } catch (err) {
      errorEl.textContent = err.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      errorEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Handle Admin Logout
  async function handleLogout() {
    try {
      await API.logout();
      state.isAdmin = false;
      renderAuthNavbar();
      showToast('ออกจากระบบผู้ดูแลระบบเรียบร้อยแล้ว', 'info');
      handleRoute();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // Footer admin button
  document.getElementById('footerAdminBtn')?.addEventListener('click', () => {
    if (state.isAdmin) {
      openAdminDashboard();
    } else {
      document.getElementById('loginErrorMsg').style.display = 'none';
      document.getElementById('adminUsername').value = 'prct';
      document.getElementById('adminPassword').value = '';
      openModal(DOM.loginModal);
    }
  });

  // ==========================================
  // ROUTING & VIEW RENDERING
  // ==========================================

  function getRoute() {
    const hash = window.location.hash || '#/';
    const parts = hash.replace(/^#\/?/, '').split('/');
    return {
      raw: hash,
      path: parts[0] || '',
      param1: parts[1] || '',
      param2: parts[2] || ''
    };
  }

  async function handleRoute() {
    const route = getRoute();

    // Update active nav link
    document.querySelectorAll('.nav-links .nav-link').forEach(link => {
      const nav = link.getAttribute('data-nav');
      if (route.path === '' && nav === 'all') link.classList.add('active');
      else if (route.path === 'type' && route.param1.toLowerCase() === 'manhwa' && nav === 'manhwa') link.classList.add('active');
      else if (route.path === 'type' && route.param1.toLowerCase() === 'manga' && nav === 'manga') link.classList.add('active');
      else if (route.path === 'bookmarks' && nav === 'bookmarks') link.classList.add('active');
      else link.classList.remove('active');
    });

    // Window scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (route.path === 'manga' && route.param1) {
      // Manga Details View
      await renderMangaDetailView(route.param1);
    } else if (route.path === 'read' && route.param1 && route.param2) {
      // Reader View
      await renderReaderView(route.param1, route.param2);
    } else if (route.path === 'bookmarks') {
      // Bookmarks View
      await renderBookmarksView();
    } else {
      // Home / Filtered Home View
      if (route.path === 'type' && route.param1) {
        state.currentFilter.type = route.param1;
      } else {
        state.currentFilter.type = 'All';
      }
      await renderHomeView();
    }
  }

  window.addEventListener('hashchange', handleRoute);

  // ==========================================
  // HOME VIEW
  // ==========================================

  async function renderHomeView() {
    DOM.navbar.style.display = 'block';
    document.getElementById('appFooter').style.display = 'block';

    DOM.mainContent.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; min-height: 40vh;">
        <div class="loading-spinner"></div>
      </div>
    `;

    try {
      // Fetch mangas & categories in parallel
      const [mangas, categories, stats] = await Promise.all([
        API.getMangaList(state.currentFilter),
        API.getCategories(),
        API.getStats()
      ]);

      state.mangas = mangas;
      state.categories = categories;

      // Select featured for Hero (e.g. Solo Leveling or first highest rated)
      const featured = mangas.length > 0 ? mangas[0] : null;

      let html = '';

      // Hero Banner (Show if no search query)
      if (!state.currentFilter.q && featured) {
        html += `
          <div class="hero-section">
            <div class="hero-banner">
              <div class="hero-backdrop" style="background-image: url('${featured.coverUrl}');"></div>
              <div class="hero-gradient"></div>
              <div class="hero-content">
                <div class="hero-badges">
                  <span class="badge ${featured.type === 'Manhwa' ? 'badge-manhwa' : 'badge-manga'}">${featured.type}</span>
                  <span class="badge ${featured.status === 'Completed' ? 'badge-status-completed' : 'badge-status-ongoing'}">
                    ${featured.status === 'Completed' ? 'จบแล้ว' : 'กำลังอัปเดต'}
                  </span>
                  <span style="font-size: 0.8rem; color: #fbbf24; display: flex; align-items: center; gap: 4px;">
                    <i data-lucide="star" style="width: 14px; height: 14px; fill: #fbbf24;"></i>
                    ${featured.rating.toFixed(1)}
                  </span>
                </div>
                <h1 class="hero-title">${escapeHtml(featured.title)}</h1>
                <div class="hero-meta">
                  <span>${featured.chapterCount} ตอน</span>
                  <span>•</span>
                  <span>${featured.views.toLocaleString()} ยอดอ่าน</span>
                  <span>•</span>
                  <span>${featured.categories.slice(0, 3).join(', ')}</span>
                </div>
                <p class="hero-desc">${escapeHtml(featured.description || 'การ์ตูนสุดมันส์ อัปเดตตอนใหม่ล่าสุด')}</p>
                <div style="display: flex; gap: 12px; margin-top: 6px;">
                  <a href="#/manga/${featured.id}" class="btn btn-primary btn-lg">
                    <i data-lucide="book-open" style="width: 18px; height: 18px;"></i>
                    <span>เริ่มอ่านทันที</span>
                  </a>
                  <button class="btn btn-secondary btn-lg bookmark-btn" data-id="${featured.id}">
                    <i data-lucide="${state.bookmarks.includes(featured.id) ? 'bookmark-check' : 'bookmark'}" style="width: 18px; height: 18px;"></i>
                    <span>${state.bookmarks.includes(featured.id) ? 'คั่นไว้แล้ว' : 'คั่นหน้า'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      // Filter & Sort Bar
      html += `
        <div class="filter-bar">
          <div class="filter-row">
            <div class="type-tabs" id="typeTabGroup">
              <button class="type-tab ${state.currentFilter.type === 'All' ? 'active' : ''}" data-type="All">ทั้งหมด (${stats.totalManga})</button>
              <button class="type-tab ${state.currentFilter.type === 'Manhwa' ? 'active' : ''}" data-type="Manhwa">มังฮวา (${stats.manhwaCount})</button>
              <button class="type-tab ${state.currentFilter.type === 'Manga' ? 'active' : ''}" data-type="Manga">มังงะ (${stats.mangaCount})</button>
            </div>

            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
              <div class="sort-select-wrapper">
                <span>สถานะ:</span>
                <select class="select-custom" id="statusSelect">
                  <option value="All" ${state.currentFilter.status === 'All' ? 'selected' : ''}>ทั้งหมด</option>
                  <option value="Ongoing" ${state.currentFilter.status === 'Ongoing' ? 'selected' : ''}>กำลังอัปเดต</option>
                  <option value="Completed" ${state.currentFilter.status === 'Completed' ? 'selected' : ''}>จบแล้ว</option>
                </select>
              </div>

              <div class="sort-select-wrapper">
                <span>เรียงตาม:</span>
                <select class="select-custom" id="sortSelect">
                  <option value="latest" ${state.currentFilter.sort === 'latest' ? 'selected' : ''}>อัปเดตล่าสุด</option>
                  <option value="views" ${state.currentFilter.sort === 'views' ? 'selected' : ''}>ยอดอ่านสูงสุด</option>
                  <option value="rating" ${state.currentFilter.sort === 'rating' ? 'selected' : ''}>คะแนนสูงสุด</option>
                  <option value="name" ${state.currentFilter.sort === 'name' ? 'selected' : ''}>ชื่อ A-Z</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Category Pills -->
          <div class="category-pills" id="categoryPillsGroup">
            <button class="category-pill ${state.currentFilter.category === 'All' ? 'active' : ''}" data-cat="All">ทุกหมวดหมู่</button>
            ${categories.map(cat => `
              <button class="category-pill ${state.currentFilter.category === cat ? 'active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>
            `).join('')}
          </div>
        </div>
      `;

      // Search Query Announcement if present
      if (state.currentFilter.q) {
        html += `
          <div style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
            <div style="font-size: 1.1rem; font-weight: 600;">
              ผลการค้นหาสำหรับ "<span style="color: var(--accent-secondary);">${escapeHtml(state.currentFilter.q)}</span>" (${mangas.length} เรื่อง)
            </div>
            <button class="btn btn-secondary btn-sm" id="resetSearchBtn">
              <i data-lucide="x" style="width: 14px; height: 14px;"></i>
              <span>ล้างคำค้นหา</span>
            </button>
          </div>
        `;
      }

      // Grid of Manga Cards
      if (mangas.length === 0) {
        html += `
          <div class="empty-state">
            <i data-lucide="book-x" style="width: 48px; height: 48px;"></i>
            <h3>ไม่พบมังงะหรือมังฮวาที่ค้นหา</h3>
            <p>ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่นดูนะครับ</p>
          </div>
        `;
      } else {
        html += `<div class="manga-grid">`;
        mangas.forEach(manga => {
          const isBookmarked = state.bookmarks.includes(manga.id);
          const historyInfo = state.readingHistory[manga.id];

          html += `
            <div class="manga-card" onclick="location.hash='#/manga/${manga.id}'">
              <div class="card-cover">
                <img src="${escapeHtml(manga.coverUrl)}" alt="${escapeHtml(manga.title)}" loading="lazy" onerror="this.src='https://placehold.co/400x560/1a2233/ffffff?text=No+Cover'">
                <div class="card-overlay">
                  <div class="card-top-badges">
                    <span class="badge ${manga.type === 'Manhwa' ? 'badge-manhwa' : 'badge-manga'}">${manga.type}</span>
                    <div class="card-rating">
                      <i data-lucide="star" style="width: 12px; height: 12px; fill: #fbbf24;"></i>
                      <span>${manga.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <span class="badge ${manga.status === 'Completed' ? 'badge-status-completed' : 'badge-status-ongoing'}">
                      ${manga.status === 'Completed' ? 'จบแล้ว' : 'กำลังอัปเดต'}
                    </span>
                    <button class="btn-icon card-bookmark-btn" data-id="${manga.id}" title="${isBookmarked ? 'ยกเลิกคั่นหน้า' : 'คั่นหน้า'}" onclick="event.stopPropagation(); window.toggleBookmark('${manga.id}')" style="background: rgba(0,0,0,0.6); border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: ${isBookmarked ? '#a78bfa' : '#ffffff'};">
                      <i data-lucide="${isBookmarked ? 'bookmark-check' : 'bookmark'}" style="width: 14px; height: 14px;"></i>
                    </button>
                  </div>
                </div>
              </div>
              <div class="card-info">
                <h3 class="card-title" title="${escapeHtml(manga.title)}">${escapeHtml(manga.title)}</h3>
                <div class="card-latest-ch">
                  <span>${manga.latestChapterNumber ? 'ตอนที่ ' + manga.latestChapterNumber : 'ยังไม่มีตอน'}</span>
                  ${historyInfo ? `<span style="font-size: 0.7rem; color: #4ade80;">อ่านถึง Ch.${historyInfo.chapterNumber}</span>` : ''}
                </div>
              </div>
            </div>
          `;
        });
        html += `</div>`;
      }

      DOM.mainContent.innerHTML = html;
      lucide.createIcons({ root: DOM.mainContent });

      // Setup Event Listeners for Filters
      document.querySelectorAll('#typeTabGroup .type-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-type');
          if (type === 'All') location.hash = '#/';
          else location.hash = `#/type/${type}`;
        });
      });

      document.querySelectorAll('#categoryPillsGroup .category-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          state.currentFilter.category = btn.getAttribute('data-cat');
          renderHomeView();
        });
      });

      document.getElementById('statusSelect')?.addEventListener('change', (e) => {
        state.currentFilter.status = e.target.value;
        renderHomeView();
      });

      document.getElementById('sortSelect')?.addEventListener('change', (e) => {
        state.currentFilter.sort = e.target.value;
        renderHomeView();
      });

      document.getElementById('resetSearchBtn')?.addEventListener('click', () => {
        state.currentFilter.q = '';
        DOM.searchInput.value = '';
        DOM.searchClearBtn.style.display = 'none';
        renderHomeView();
      });

      // Bookmark button in hero
      document.querySelectorAll('.bookmark-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          window.toggleBookmark(id);
          renderHomeView();
        });
      });

    } catch (err) {
      DOM.mainContent.innerHTML = `
        <div class="empty-state">
          <i data-lucide="alert-circle" style="width: 48px; height: 48px; color: #ef4444;"></i>
          <h3>เกิดข้อผิดพลาดในการโหลดข้อมูล</h3>
          <p>${escapeHtml(err.message)}</p>
          <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 12px;">ลองใหม่อีกครั้ง</button>
        </div>
      `;
      lucide.createIcons({ root: DOM.mainContent });
    }
  }

  // ==========================================
  // MANGA DETAIL VIEW
  // ==========================================

  async function renderMangaDetailView(id) {
    DOM.navbar.style.display = 'block';
    document.getElementById('appFooter').style.display = 'block';

    DOM.mainContent.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; min-height: 40vh;">
        <div class="loading-spinner"></div>
      </div>
    `;

    try {
      const manga = await API.getMangaDetail(id);
      state.currentManga = manga;

      const isBookmarked = state.bookmarks.includes(manga.id);
      const historyInfo = state.readingHistory[manga.id];

      // Sort chapters
      const chapters = [...manga.chapters].sort((a, b) => {
        return parseChapterNum(b.chapterNumber) - parseChapterNum(a.chapterNumber);
      });

      const firstChapter = [...manga.chapters].sort((a, b) => parseChapterNum(a.chapterNumber) - parseChapterNum(b.chapterNumber))[0];
      const latestChapter = chapters[0];

      let html = `
        <div class="detail-view">
          <!-- Back button -->
          <div>
            <a href="#/" class="btn btn-secondary btn-sm">
              <i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i>
              <span>กลับหน้ารายการ</span>
            </a>
          </div>

          <!-- Header Banner & Cover -->
          <div class="detail-header">
            <div class="detail-backdrop" style="background-image: url('${escapeHtml(manga.bannerUrl || manga.coverUrl)}');"></div>
            <div class="detail-header-content">
              <div class="detail-cover">
                <img src="${escapeHtml(manga.coverUrl)}" alt="${escapeHtml(manga.title)}" onerror="this.src='https://placehold.co/400x560/1a2233/ffffff?text=No+Cover'">
              </div>
              <div class="detail-info">
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <span class="badge ${manga.type === 'Manhwa' ? 'badge-manhwa' : 'badge-manga'}">${manga.type}</span>
                  <span class="badge ${manga.status === 'Completed' ? 'badge-status-completed' : 'badge-status-ongoing'}">
                    ${manga.status === 'Completed' ? 'จบแล้ว' : 'กำลังอัปเดต'}
                  </span>
                  ${manga.type === 'Manhwa' ? '<span style="font-size: 0.78rem; color: #f472b6;">📖 เลื่อนอ่านแนวตั้ง (Webtoon Style)</span>' : '<span style="font-size: 0.78rem; color: #fbbf24;">📖 อ่านทีละหน้า (Manga Style)</span>'}
                </div>

                <h1 class="detail-title">${escapeHtml(manga.title)}</h1>
                ${manga.originalTitle ? `<div class="detail-original-title">${escapeHtml(manga.originalTitle)}</div>` : ''}

                <div class="detail-meta-list">
                  <div class="detail-meta-item">
                    <i data-lucide="user" style="width: 16px; height: 16px; color: var(--accent-primary);"></i>
                    <span>ผู้แต่ง: ${escapeHtml(manga.author || 'ไม่ระบุ')}</span>
                  </div>
                  <div class="detail-meta-item">
                    <i data-lucide="palette" style="width: 16px; height: 16px; color: var(--accent-secondary);"></i>
                    <span>ผู้วาด: ${escapeHtml(manga.artist || 'ไม่ระบุ')}</span>
                  </div>
                  <div class="detail-meta-item">
                    <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
                    <span>${manga.views.toLocaleString()} ยอดอ่าน</span>
                  </div>
                  <div class="detail-meta-item">
                    <i data-lucide="star" style="width: 16px; height: 16px; fill: #fbbf24; color: #fbbf24;"></i>
                    <span>${manga.rating.toFixed(1)} คะแนน</span>
                  </div>
                </div>

                <!-- Category tags -->
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px;">
                  ${manga.categories.map(c => `<span class="category-pill" style="cursor: default;">${escapeHtml(c)}</span>`).join('')}
                </div>

                <!-- Action Buttons -->
                <div class="detail-actions">
                  ${firstChapter ? `
                    <a href="#/read/${manga.id}/${firstChapter.id}" class="btn btn-primary btn-lg">
                      <i data-lucide="play" style="width: 18px; height: 18px; fill: currentColor;"></i>
                      <span>เริ่มอ่านตอนที่ ${firstChapter.chapterNumber}</span>
                    </a>
                  ` : ''}

                  ${historyInfo && historyInfo.chapterId && firstChapter && historyInfo.chapterId !== firstChapter.id ? `
                    <a href="#/read/${manga.id}/${historyInfo.chapterId}" class="btn btn-secondary btn-lg" style="border-color: #22c55e; color: #4ade80;">
                      <i data-lucide="rotate-ccw" style="width: 18px; height: 18px;"></i>
                      <span>อ่านต่อตอนที่ ${historyInfo.chapterNumber}</span>
                    </a>
                  ` : ''}

                  <button class="btn btn-secondary btn-lg" id="detailBookmarkBtn">
                    <i data-lucide="${isBookmarked ? 'bookmark-check' : 'bookmark'}" style="width: 18px; height: 18px; color: ${isBookmarked ? '#a78bfa' : 'currentColor'};"></i>
                    <span>${isBookmarked ? 'คั่นหน้าไว้แล้ว' : 'คั่นหน้านี้'}</span>
                  </button>

                  <!-- Admin Management Buttons (Protected) -->
                  ${state.isAdmin ? `
                    <div style="display: flex; gap: 8px; margin-left: auto;">
                      <button class="btn btn-secondary" id="adminManageChaptersBtn" style="border-color: var(--accent-primary);">
                        <i data-lucide="layers" style="width: 16px; height: 16px; color: var(--accent-primary);"></i>
                        <span>จัดการตอน (${chapters.length})</span>
                      </button>
                      <button class="btn btn-secondary" id="adminEditMangaBtn">
                        <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
                        <span>แก้ไขเรื่อง</span>
                      </button>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div class="detail-desc">
            <h3>เรื่องย่อ</h3>
            <p>${escapeHtml(manga.description || 'ยังไม่มีเรื่องย่อสำหรับเรื่องนี้')}</p>
          </div>

          <!-- Chapter List Section -->
          <div class="chapters-section">
            <div class="chapters-header">
              <div style="display: flex; align-items: center; gap: 10px;">
                <h3 style="font-size: 1.15rem; font-weight: 700;">รายชื่อตอนทั้งหมด</h3>
                <span class="badge" style="background: var(--bg-tertiary);">${chapters.length} ตอน</span>
              </div>
              <div style="display: flex; gap: 10px;">
                <input type="text" id="chapterFilterInput" class="form-control" placeholder="ค้นหาตอน..." style="max-width: 200px; padding: 6px 12px; font-size: 0.82rem;">
                <button class="btn btn-secondary btn-sm" id="chapterSortToggleBtn">
                  <i data-lucide="arrow-down-up" style="width: 14px; height: 14px;"></i>
                  <span id="chapterSortLabel">ใหม่สุดก่อน</span>
                </button>
              </div>
            </div>

            ${chapters.length === 0 ? `
              <div class="empty-state" style="padding: 40px 20px;">
                <i data-lucide="file-question" style="width: 40px; height: 40px;"></i>
                <h4>ยังไม่มีตอนให้อ่านในขณะนี้</h4>
                <p>เรื่องนี้กำลังเตรียมอัปเดตตอนแรกเร็วๆ นี้</p>
                ${state.isAdmin ? `
                  <button class="btn btn-primary btn-sm" id="emptyAddChapterBtn" style="margin-top: 10px;">
                    <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
                    <span>+ เพิ่มตอนแรกสำหรับเรื่องนี้</span>
                  </button>
                ` : ''}
              </div>
            ` : `
              <div class="chapter-grid" id="chapterGridList">
                ${chapters.map(ch => {
                  const isRead = historyInfo && historyInfo.chapterId === ch.id;
                  const dateStr = new Date(ch.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
                  return `
                    <div class="chapter-item ${isRead ? 'read' : ''}" onclick="location.hash='#/read/${manga.id}/${ch.id}'">
                      <div class="chapter-item-info">
                        <div class="chapter-item-number">
                          ตอนที่ ${escapeHtml(ch.chapterNumber)}
                          ${isRead ? '<span style="font-size: 0.7rem; color: #4ade80; margin-left: 6px;">(อ่านแล้ว)</span>' : ''}
                        </div>
                        ${ch.title ? `<div class="chapter-item-title">${escapeHtml(ch.title)}</div>` : ''}
                      </div>
                      <div class="chapter-item-date">${dateStr}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>
      `;

      DOM.mainContent.innerHTML = html;
      lucide.createIcons({ root: DOM.mainContent });

      // Event Listeners for Detail View
      document.getElementById('detailBookmarkBtn')?.addEventListener('click', () => {
        window.toggleBookmark(manga.id);
        renderMangaDetailView(manga.id);
      });

      // Chapter Filter
      let isDescending = true;
      const chapterItems = [...chapters];

      function renderFilteredChapters() {
        const query = document.getElementById('chapterFilterInput')?.value.trim().toLowerCase() || '';
        let filtered = chapterItems.filter(c => {
          return c.chapterNumber.toLowerCase().includes(query) || (c.title && c.title.toLowerCase().includes(query));
        });

        filtered.sort((a, b) => {
          const numA = parseChapterNum(a.chapterNumber);
          const numB = parseChapterNum(b.chapterNumber);
          return isDescending ? (numB - numA) : (numA - numB);
        });

        const grid = document.getElementById('chapterGridList');
        if (!grid) return;

        if (filtered.length === 0) {
          grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: var(--text-muted);">ไม่พบตอนที่ค้นหา</div>`;
          return;
        }

        grid.innerHTML = filtered.map(ch => {
          const isRead = historyInfo && historyInfo.chapterId === ch.id;
          const dateStr = new Date(ch.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
          return `
            <div class="chapter-item ${isRead ? 'read' : ''}" onclick="location.hash='#/read/${manga.id}/${ch.id}'">
              <div class="chapter-item-info">
                <div class="chapter-item-number">
                  ตอนที่ ${escapeHtml(ch.chapterNumber)}
                  ${isRead ? '<span style="font-size: 0.7rem; color: #4ade80; margin-left: 6px;">(อ่านแล้ว)</span>' : ''}
                </div>
                ${ch.title ? `<div class="chapter-item-title">${escapeHtml(ch.title)}</div>` : ''}
              </div>
              <div class="chapter-item-date">${dateStr}</div>
            </div>
          `;
        }).join('');
      }

      document.getElementById('chapterFilterInput')?.addEventListener('input', renderFilteredChapters);
      document.getElementById('chapterSortToggleBtn')?.addEventListener('click', () => {
        isDescending = !isDescending;
        document.getElementById('chapterSortLabel').textContent = isDescending ? 'ใหม่สุดก่อน' : 'เก่าสุดก่อน';
        renderFilteredChapters();
      });

      // Admin actions
      if (state.isAdmin) {
        document.getElementById('adminManageChaptersBtn')?.addEventListener('click', () => {
          openChapterManager(manga);
        });
        document.getElementById('adminEditMangaBtn')?.addEventListener('click', () => {
          openMangaForm(manga);
        });
        document.getElementById('emptyAddChapterBtn')?.addEventListener('click', () => {
          openChapterManager(manga);
        });
      }

    } catch (err) {
      DOM.mainContent.innerHTML = `
        <div class="empty-state">
          <i data-lucide="alert-circle" style="width: 48px; height: 48px; color: #ef4444;"></i>
          <h3>ไม่พบข้อมูลเรื่องนี้</h3>
          <p>${escapeHtml(err.message)}</p>
          <a href="#/" class="btn btn-primary" style="margin-top: 12px;">กลับหน้าหลัก</a>
        </div>
      `;
      lucide.createIcons({ root: DOM.mainContent });
    }
  }

  // ==========================================
  // MANGA READER VIEW
  // ==========================================

  async function renderReaderView(mangaId, chapterId) {
    // Hide standard navbar and footer in reader mode for clean experience
    DOM.navbar.style.display = 'none';
    document.getElementById('appFooter').style.display = 'none';

    DOM.mainContent.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; min-height: 80vh;">
        <div class="loading-spinner"></div>
      </div>
    `;

    try {
      const data = await API.getChapterDetail(mangaId, chapterId);
      state.currentChapterData = data;
      state.currentPagedIndex = 0;

      // Save to reading history
      state.readingHistory[mangaId] = {
        chapterId: data.chapter.id,
        chapterNumber: data.chapter.chapterNumber,
        timestamp: Date.now()
      };
      localStorage.setItem('mv_history', JSON.stringify(state.readingHistory));

      // Auto-set reader mode: Manhwa defaults to webtoon scroll, Manga defaults to paged
      if (!localStorage.getItem('mv_reader_settings')) {
        state.readerSettings.mode = data.mangaType === 'Manhwa' ? 'webtoon' : 'paged';
      }

      renderReaderInterface();

    } catch (err) {
      DOM.navbar.style.display = 'block';
      document.getElementById('appFooter').style.display = 'block';
      DOM.mainContent.innerHTML = `
        <div class="empty-state">
          <i data-lucide="alert-triangle" style="width: 48px; height: 48px; color: #ef4444;"></i>
          <h3>ไม่สามารถเปิดอ่านตอนนี้ได้</h3>
          <p>${escapeHtml(err.message)}</p>
          <a href="#/manga/${mangaId}" class="btn btn-primary" style="margin-top: 12px;">กลับหน้ารายละเอียดเรื่อง</a>
        </div>
      `;
      lucide.createIcons({ root: DOM.mainContent });
    }
  }

  function renderReaderInterface() {
    const data = state.currentChapterData;
    if (!data) return;

    const { mangaId, mangaTitle, mangaType, chapter, prevChapter, nextChapter, allChapters } = data;
    const pages = chapter.pages || [];
    const isWebtoon = state.readerSettings.mode === 'webtoon';
    const readerWidth = state.readerSettings.width || '800px';

    let html = `
      <div class="reader-view">
        <!-- Top Toolbar Sticky -->
        <div class="reader-toolbar" id="readerToolbar">
          <div class="reader-title-group">
            <a href="#/manga/${mangaId}" class="btn btn-secondary btn-sm" title="กลับไปหน้ารายละเอียด">
              <i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i>
              <span class="desktop-only">กลับ</span>
            </a>
            <div>
              <div class="reader-series-title">${escapeHtml(mangaTitle)}</div>
              <div class="reader-chapter-title">ตอนที่ ${escapeHtml(chapter.chapterNumber)} ${chapter.title ? ' - ' + escapeHtml(chapter.title) : ''}</div>
            </div>
          </div>

          <div class="reader-controls">
            <!-- Chapter Selector Dropdown -->
            <select class="select-custom" id="readerChapterSelect" style="max-width: 160px;">
              ${allChapters.map(ch => `
                <option value="${ch.id}" ${ch.id === chapter.id ? 'selected' : ''}>
                  ตอนที่ ${escapeHtml(ch.number)}
                </option>
              `).join('')}
            </select>

            <!-- Mode Switcher -->
            <button class="btn btn-secondary btn-sm" id="toggleReaderModeBtn" title="สลับโหมดการอ่าน">
              <i data-lucide="${isWebtoon ? 'smartphone' : 'book-open'}" style="width: 16px; height: 16px;"></i>
              <span class="desktop-only">${isWebtoon ? 'โหมด Webtoon (เลื่อนยาว)' : 'โหมด Manga (ทีละหน้า)'}</span>
            </button>

            <!-- Width Adjuster (For Webtoon mode) -->
            ${isWebtoon ? `
              <select class="select-custom" id="readerWidthSelect">
                <option value="650px" ${readerWidth === '650px' ? 'selected' : ''}>แคบ (650px)</option>
                <option value="800px" ${readerWidth === '800px' ? 'selected' : ''}>ปานกลาง (800px)</option>
                <option value="1000px" ${readerWidth === '1000px' ? 'selected' : ''}>กว้าง (1000px)</option>
                <option value="100%" ${readerWidth === '100%' ? 'selected' : ''}>เต็มจอ (100%)</option>
              </select>
            ` : ''}

            <!-- Fullscreen -->
            <button class="btn-icon" id="toggleFullscreenBtn" title="เต็มจอ">
              <i data-lucide="maximize" style="width: 18px; height: 18px;"></i>
            </button>
          </div>
        </div>

        <!-- Reader Content Body -->
        <div class="reader-body">
          ${pages.length === 0 ? `
            <div class="empty-state">
              <i data-lucide="image-off" style="width: 48px; height: 48px;"></i>
              <h3>ยังไม่มีรูปภาพในตอนนี้</h3>
              <p>ผู้ดูแลระบบยังไม่ได้อัปโหลดหน้าการ์ตูน</p>
            </div>
          ` : isWebtoon ? `
            <!-- Continuous Webtoon Scroll Mode -->
            <div class="reader-webtoon" id="webtoonContainer" style="max-width: ${readerWidth};">
              ${pages.map((pageUrl, idx) => `
                <img src="${escapeHtml(pageUrl)}" 
                     alt="หน้า ${idx + 1}" 
                     loading="lazy" 
                     onerror="this.onerror=null; this.src='https://placehold.co/800x1200/151c2c/ffffff?text=Page+${idx + 1}';">
              `).join('')}
            </div>
          ` : `
            <!-- Single Page Manga Mode -->
            <div class="reader-paged">
              <div class="reader-page-nav">
                <button class="btn btn-secondary btn-sm" id="pagedPrevBtn" ${state.currentPagedIndex === 0 ? 'disabled style="opacity:0.4;"' : ''}>
                  <i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i>
                  <span>หน้าก่อนหน้า</span>
                </button>
                <span style="font-weight: 700; font-size: 0.95rem;">
                  หน้า <span id="pagedCurrentNum">${state.currentPagedIndex + 1}</span> / ${pages.length}
                </span>
                <button class="btn btn-secondary btn-sm" id="pagedNextBtn" ${state.currentPagedIndex >= pages.length - 1 ? 'disabled style="opacity:0.4;"' : ''}>
                  <span>หน้าถัดไป</span>
                  <i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>
                </button>
              </div>

              <div class="reader-page-container" id="pagedImageContainer">
                <img src="${escapeHtml(pages[state.currentPagedIndex])}" 
                     id="pagedMainImg" 
                     alt="หน้า ${state.currentPagedIndex + 1}" 
                     onerror="this.onerror=null; this.src='https://placehold.co/800x1200/151c2c/ffffff?text=Page+${state.currentPagedIndex + 1}';">
              </div>

              <div style="font-size: 0.8rem; color: var(--text-muted);">
                คลิกที่ภาพ หรือกดแป้นลูกศร ซ้าย/ขวา บนคีย์บอร์ด เพื่อเปลี่ยนหน้าได้
              </div>
            </div>
          `}
        </div>

        <!-- Bottom Navigation Bar -->
        <div class="reader-bottom-nav">
          ${prevChapter ? `
            <a href="#/read/${mangaId}/${prevChapter.id}" class="btn btn-secondary">
              <i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i>
              <span>◀ ตอนก่อนหน้า (Ch.${prevChapter.number})</span>
            </a>
          ` : `
            <button class="btn btn-secondary" disabled style="opacity: 0.4;">
              <span>ไม่มีตอนก่อนหน้า</span>
            </button>
          `}

          <a href="#/manga/${mangaId}" class="btn btn-secondary">
            <i data-lucide="list" style="width: 16px; height: 16px;"></i>
            <span>รวมทุกตอน</span>
          </a>

          ${nextChapter ? `
            <a href="#/read/${mangaId}/${nextChapter.id}" class="btn btn-primary">
              <span>ตอนถัดไป (Ch.${nextChapter.number}) ▶</span>
              <i data-lucide="arrow-right" style="width: 16px; height: 16px;"></i>
            </a>
          ` : `
            <button class="btn btn-secondary" disabled style="opacity: 0.4;">
              <span>ถึงตอนล่าสุดแล้ว</span>
            </button>
          `}
        </div>
      </div>
    `;

    DOM.mainContent.innerHTML = html;
    lucide.createIcons({ root: DOM.mainContent });

    // Events in Reader
    document.getElementById('readerChapterSelect')?.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      location.hash = `#/read/${mangaId}/${selectedId}`;
    });

    document.getElementById('toggleReaderModeBtn')?.addEventListener('click', () => {
      state.readerSettings.mode = state.readerSettings.mode === 'webtoon' ? 'paged' : 'webtoon';
      localStorage.setItem('mv_reader_settings', JSON.stringify(state.readerSettings));
      renderReaderInterface();
    });

    document.getElementById('readerWidthSelect')?.addEventListener('change', (e) => {
      state.readerSettings.width = e.target.value;
      localStorage.setItem('mv_reader_settings', JSON.stringify(state.readerSettings));
      const container = document.getElementById('webtoonContainer');
      if (container) container.style.maxWidth = e.target.value;
    });

    document.getElementById('toggleFullscreenBtn')?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Paged Mode Navigation Events
    if (!isWebtoon && pages.length > 0) {
      function updatePagedView() {
        const img = document.getElementById('pagedMainImg');
        const num = document.getElementById('pagedCurrentNum');
        const prevBtn = document.getElementById('pagedPrevBtn');
        const nextBtn = document.getElementById('pagedNextBtn');

        if (img) img.src = pages[state.currentPagedIndex];
        if (num) num.textContent = state.currentPagedIndex + 1;

        if (prevBtn) {
          prevBtn.disabled = state.currentPagedIndex === 0;
          prevBtn.style.opacity = state.currentPagedIndex === 0 ? '0.4' : '1';
        }
        if (nextBtn) {
          nextBtn.disabled = state.currentPagedIndex >= pages.length - 1;
          nextBtn.style.opacity = state.currentPagedIndex >= pages.length - 1 ? '0.4' : '1';
        }

        window.scrollTo({ top: 60, behavior: 'smooth' });
      }

      document.getElementById('pagedPrevBtn')?.addEventListener('click', () => {
        if (state.currentPagedIndex > 0) {
          state.currentPagedIndex--;
          updatePagedView();
        }
      });

      document.getElementById('pagedNextBtn')?.addEventListener('click', () => {
        if (state.currentPagedIndex < pages.length - 1) {
          state.currentPagedIndex++;
          updatePagedView();
        } else if (nextChapter) {
          location.hash = `#/read/${mangaId}/${nextChapter.id}`;
        }
      });

      document.getElementById('pagedImageContainer')?.addEventListener('click', (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        if (clickX > rect.width / 2) {
          // Click right side -> Next page
          if (state.currentPagedIndex < pages.length - 1) {
            state.currentPagedIndex++;
            updatePagedView();
          } else if (nextChapter) {
            location.hash = `#/read/${mangaId}/${nextChapter.id}`;
          }
        } else {
          // Click left side -> Prev page
          if (state.currentPagedIndex > 0) {
            state.currentPagedIndex--;
            updatePagedView();
          }
        }
      });

      // Keyboard left/right arrows navigation
      const keyHandler = (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          if (state.currentPagedIndex < pages.length - 1) {
            state.currentPagedIndex++;
            updatePagedView();
          }
        } else if (e.key === 'ArrowLeft') {
          if (state.currentPagedIndex > 0) {
            state.currentPagedIndex--;
            updatePagedView();
          }
        }
      };

      window.removeEventListener('keydown', window._readerKeyHandler);
      window._readerKeyHandler = keyHandler;
      window.addEventListener('keydown', keyHandler);
    }
  }

  // ==========================================
  // BOOKMARKS VIEW
  // ==========================================

  async function renderBookmarksView() {
    DOM.navbar.style.display = 'block';
    document.getElementById('appFooter').style.display = 'block';

    DOM.mainContent.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; min-height: 40vh;">
        <div class="loading-spinner"></div>
      </div>
    `;

    try {
      const mangas = await API.getMangaList({});
      const bookmarkedMangas = mangas.filter(m => state.bookmarks.includes(m.id));

      let html = `
        <div>
          <div style="margin-bottom: 24px;">
            <h1 style="font-size: 1.8rem; font-weight: 800;">มังงะและมังฮวาที่คั่นไว้</h1>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
              รายการเรื่องที่คุณบันทึกไว้สำหรับอ่านต่อ (${bookmarkedMangas.length} เรื่อง)
            </p>
          </div>
      `;

      if (bookmarkedMangas.length === 0) {
        html += `
          <div class="empty-state">
            <i data-lucide="bookmark" style="width: 48px; height: 48px;"></i>
            <h3>คุณยังไม่ได้คั่นหน้าเรื่องใดไว้เลย</h3>
            <p>เมื่อพบเรื่องที่ชอบ สามารถกดปุ่มคั่นหน้าเพื่อเก็บไว้ที่นี่ได้</p>
            <a href="#/" class="btn btn-primary" style="margin-top: 14px;">ค้นหามังงะน่าอ่าน</a>
          </div>
        `;
      } else {
        html += `<div class="manga-grid">`;
        bookmarkedMangas.forEach(manga => {
          const historyInfo = state.readingHistory[manga.id];
          html += `
            <div class="manga-card" onclick="location.hash='#/manga/${manga.id}'">
              <div class="card-cover">
                <img src="${escapeHtml(manga.coverUrl)}" alt="${escapeHtml(manga.title)}" onerror="this.src='https://placehold.co/400x560/1a2233/ffffff?text=No+Cover'">
                <div class="card-overlay">
                  <div class="card-top-badges">
                    <span class="badge ${manga.type === 'Manhwa' ? 'badge-manhwa' : 'badge-manga'}">${manga.type}</span>
                    <div class="card-rating">
                      <i data-lucide="star" style="width: 12px; height: 12px; fill: #fbbf24;"></i>
                      <span>${manga.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <span class="badge ${manga.status === 'Completed' ? 'badge-status-completed' : 'badge-status-ongoing'}">
                      ${manga.status === 'Completed' ? 'จบแล้ว' : 'กำลังอัปเดต'}
                    </span>
                    <button class="btn-icon" onclick="event.stopPropagation(); window.toggleBookmark('${manga.id}'); renderBookmarksView();" title="ลบออกจากที่คั่นไว้" style="background: rgba(0,0,0,0.6); border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: #a78bfa;">
                      <i data-lucide="bookmark-check" style="width: 14px; height: 14px;"></i>
                    </button>
                  </div>
                </div>
              </div>
              <div class="card-info">
                <h3 class="card-title">${escapeHtml(manga.title)}</h3>
                <div class="card-latest-ch">
                  <span>${manga.latestChapterNumber ? 'ตอนที่ ' + manga.latestChapterNumber : 'ยังไม่มีตอน'}</span>
                  ${historyInfo ? `<span style="font-size: 0.7rem; color: #4ade80;">อ่านถึง Ch.${historyInfo.chapterNumber}</span>` : ''}
                </div>
              </div>
            </div>
          `;
        });
        html += `</div>`;
      }

      html += `</div>`;
      DOM.mainContent.innerHTML = html;
      lucide.createIcons({ root: DOM.mainContent });

    } catch (err) {
      DOM.mainContent.innerHTML = `
        <div class="empty-state">
          <i data-lucide="alert-circle" style="width: 48px; height: 48px; color: #ef4444;"></i>
          <h3>เกิดข้อผิดพลาด</h3>
          <p>${escapeHtml(err.message)}</p>
        </div>
      `;
      lucide.createIcons({ root: DOM.mainContent });
    }
  }

  // Toggle Bookmark Global Helper
  window.toggleBookmark = function(id) {
    const idx = state.bookmarks.indexOf(id);
    if (idx === -1) {
      state.bookmarks.push(id);
      showToast('คั่นหน้านี้เรียบร้อยแล้ว', 'success');
    } else {
      state.bookmarks.splice(idx, 1);
      showToast('นำออกจากที่คั่นไว้แล้ว', 'info');
    }
    localStorage.setItem('mv_bookmarks', JSON.stringify(state.bookmarks));
  };

  // Search input handler
  DOM.searchInput?.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    DOM.searchClearBtn.style.display = val ? 'block' : 'none';
  });

  DOM.searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = e.target.value.trim();
      state.currentFilter.q = val;
      location.hash = '#/';
      renderHomeView();
    }
  });

  DOM.searchClearBtn?.addEventListener('click', () => {
    DOM.searchInput.value = '';
    DOM.searchClearBtn.style.display = 'none';
    state.currentFilter.q = '';
    renderHomeView();
  });

  // ==========================================
  // ADMIN DASHBOARD & CRUD OPERATIONS
  // ==========================================

  async function openAdminDashboard() {
    if (!state.isAdmin) {
      showToast('กรุณาเข้าสู่ระบบแอดมินก่อน', 'error');
      openModal(DOM.loginModal);
      return;
    }

    openModal(DOM.adminDashboardModal);
    await reloadAdminTable();
  }

  async function reloadAdminTable() {
    const tbody = document.getElementById('adminMangaTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 30px;">
          <div class="loading-spinner"></div>
        </td>
      </tr>
    `;

    try {
      const [mangas, stats] = await Promise.all([
        API.getMangaList({}),
        API.getStats()
      ]);

      // Update admin stats
      document.getElementById('adminStatTotal').textContent = stats.totalManga;
      document.getElementById('adminStatManhwa').textContent = stats.manhwaCount;
      document.getElementById('adminStatManga').textContent = stats.mangaCount;
      document.getElementById('adminStatChapters').textContent = stats.totalChapters;

      if (mangas.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
              ยังไม่มีเรื่องในระบบ กดปุ่ม "+ เพิ่มมังงะ/มังฮวาเรื่องใหม่" ด้านบนเพื่อเริ่มสร้าง
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = mangas.map(m => `
        <tr style="border-bottom: 1px solid var(--border-color); transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='var(--bg-tertiary)'" onmouseout="this.style.backgroundColor=''">
          <td style="padding: 10px 16px;">
            <img src="${escapeHtml(m.coverUrl)}" style="width: 44px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);" onerror="this.src='https://placehold.co/44x60/1a2233/ffffff?text=Cover'">
          </td>
          <td style="padding: 10px 16px;">
            <div style="font-weight: 700; color: var(--text-primary);">${escapeHtml(m.title)}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(m.originalTitle || '')}</div>
          </td>
          <td style="padding: 10px 16px;">
            <span class="badge ${m.type === 'Manhwa' ? 'badge-manhwa' : 'badge-manga'}">${m.type}</span>
          </td>
          <td style="padding: 10px 16px;">
            <span class="badge ${m.status === 'Completed' ? 'badge-status-completed' : 'badge-status-ongoing'}">
              ${m.status === 'Completed' ? 'จบแล้ว' : 'กำลังอัปเดต'}
            </span>
          </td>
          <td style="padding: 10px 16px; font-weight: 600;">
            ${m.chapterCount} ตอน
          </td>
          <td style="padding: 10px 16px; color: var(--text-muted);">
            ${m.views.toLocaleString()}
          </td>
          <td style="padding: 10px 16px; text-align: right;">
            <div style="display: inline-flex; gap: 6px;">
              <button class="btn btn-secondary btn-sm admin-mng-chapters" data-id="${m.id}" title="จัดการตอน">
                <i data-lucide="layers" style="width: 14px; height: 14px; color: var(--accent-primary);"></i>
                <span>ตอน</span>
              </button>
              <button class="btn btn-secondary btn-sm admin-edit-manga" data-id="${m.id}" title="แก้ไขเรื่อง">
                <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
                <span>แก้ไข</span>
              </button>
              <button class="btn btn-danger btn-sm admin-delete-manga" data-id="${m.id}" data-title="${escapeHtml(m.title)}" title="ลบเรื่อง">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      lucide.createIcons({ root: tbody });

      // Table Action Listeners
      tbody.querySelectorAll('.admin-mng-chapters').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const manga = await API.getMangaDetail(id);
          openChapterManager(manga);
        });
      });

      tbody.querySelectorAll('.admin-edit-manga').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const manga = await API.getMangaDetail(id);
          openMangaForm(manga);
        });
      });

      tbody.querySelectorAll('.admin-delete-manga').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const title = btn.getAttribute('data-title');
          if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเรื่อง "${title}" รวมทั้งตอนทั้งหมดของเรื่องนี้?`)) {
            try {
              await API.deleteManga(id);
              showToast(`ลบเรื่อง "${title}" สำเร็จแล้ว`, 'success');
              await reloadAdminTable();
              handleRoute();
            } catch (err) {
              showToast(err.message, 'error');
            }
          }
        });
      });

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="color: #ef4444; padding: 20px; text-align: center;">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  // Manga Form Modal (Add / Edit)
  document.getElementById('openAddMangaModalBtn')?.addEventListener('click', () => {
    openMangaForm(null);
  });

  function openMangaForm(manga = null) {
    const isEdit = !!manga;
    document.getElementById('mangaFormTitle').textContent = isEdit ? `แก้ไขเรื่อง: ${manga.title}` : 'เพิ่มมังงะ/มังฮวาใหม่';
    document.getElementById('mangaFormId').value = isEdit ? manga.id : '';
    document.getElementById('mangaTitleInput').value = isEdit ? manga.title : '';
    document.getElementById('mangaOriginalTitleInput').value = isEdit ? manga.originalTitle || '' : '';
    document.getElementById('mangaTypeSelect').value = isEdit ? manga.type : 'Manhwa';
    document.getElementById('mangaStatusSelect').value = isEdit ? manga.status : 'Ongoing';
    document.getElementById('mangaAuthorInput').value = isEdit ? manga.author || '' : '';
    document.getElementById('mangaArtistInput').value = isEdit ? manga.artist || '' : '';
    document.getElementById('mangaCategoriesInput').value = isEdit ? manga.categories.join(', ') : 'แอ็กชัน, แฟนตาซี';
    document.getElementById('mangaCoverUrlInput').value = isEdit ? manga.coverUrl : '';
    document.getElementById('mangaBannerUrlInput').value = isEdit ? manga.bannerUrl || '' : '';
    document.getElementById('mangaDescInput').value = isEdit ? manga.description || '' : '';

    updateCoverPreview(isEdit ? manga.coverUrl : '');

    openModal(DOM.mangaFormModal);
  }

  function updateCoverPreview(url) {
    const previewContainer = document.getElementById('coverPreviewContainer');
    if (!previewContainer) return;
    if (url) {
      previewContainer.innerHTML = `<img src="${escapeHtml(url)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://placehold.co/70x95/1a2233/ffffff?text=Error'">`;
    } else {
      previewContainer.innerHTML = `<span>พรีวิวปก</span>`;
    }
  }

  document.getElementById('mangaCoverUrlInput')?.addEventListener('input', (e) => {
    updateCoverPreview(e.target.value.trim());
  });

  // Cover Image File Upload
  document.getElementById('coverFileInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      showToast('กำลังอัปโหลดรูปภาพปก...', 'info');
      const res = await API.uploadCover(file);
      if (res && res.url) {
        document.getElementById('mangaCoverUrlInput').value = res.url;
        updateCoverPreview(res.url);
        showToast('อัปโหลดรูปภาพปกเรียบร้อยแล้ว', 'success');
      }
    } catch (err) {
      showToast('อัปโหลดรูปไม่สำเร็จ: ' + err.message, 'error');
    }
  });

  // Submit Manga Form
  document.getElementById('mangaForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('mangaFormId').value;
    const title = document.getElementById('mangaTitleInput').value.trim();
    const originalTitle = document.getElementById('mangaOriginalTitleInput').value.trim();
    const type = document.getElementById('mangaTypeSelect').value;
    const status = document.getElementById('mangaStatusSelect').value;
    const author = document.getElementById('mangaAuthorInput').value.trim();
    const artist = document.getElementById('mangaArtistInput').value.trim();
    const rawCategories = document.getElementById('mangaCategoriesInput').value;
    const coverUrl = document.getElementById('mangaCoverUrlInput').value.trim();
    const bannerUrl = document.getElementById('mangaBannerUrlInput').value.trim();
    const description = document.getElementById('mangaDescInput').value.trim();

    const categories = rawCategories
      .split(/[,，\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const data = {
      title,
      originalTitle,
      type,
      status,
      author,
      artist,
      categories,
      coverUrl,
      bannerUrl,
      description
    };

    const saveBtn = document.getElementById('saveMangaBtn');
    saveBtn.disabled = true;

    try {
      if (id) {
        await API.updateManga(id, data);
        showToast(`อัปเดตเรื่อง "${title}" เรียบร้อยแล้ว`, 'success');
      } else {
        const created = await API.createManga(data);
        showToast(`เพิ่มเรื่อง "${title}" เรียบร้อยแล้ว`, 'success');
      }

      closeModal(DOM.mangaFormModal);
      await reloadAdminTable();
      handleRoute();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });

  // ==========================================
  // CHAPTER MANAGEMENT
  // ==========================================

  let activeManagingManga = null;

  async function openChapterManager(manga) {
    activeManagingManga = manga;
    document.getElementById('chapterManagerSeriesType').textContent = manga.type.toUpperCase();
    document.getElementById('chapterManagerTitle').textContent = `จัดการตอน: ${manga.title}`;
    
    openModal(DOM.chapterManagerModal);
    await reloadChapterList();
  }

  async function reloadChapterList() {
    if (!activeManagingManga) return;
    const container = document.getElementById('adminChapterList');
    container.innerHTML = `<div style="text-align: center; padding: 20px;"><div class="loading-spinner"></div></div>`;

    try {
      const manga = await API.getMangaDetail(activeManagingManga.id);
      activeManagingManga = manga;

      const chapters = [...manga.chapters].sort((a, b) => {
        return parseChapterNum(b.chapterNumber) - parseChapterNum(a.chapterNumber);
      });

      document.getElementById('chapterCountDisplay').textContent = chapters.length;

      if (chapters.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 30px;">
            <p>ยังไม่มีตอนสำหรับเรื่องนี้ กดปุ่ม "+ เพิ่มตอนใหม่" เพื่อเริ่มต้น</p>
          </div>
        `;
        return;
      }

      container.innerHTML = chapters.map(ch => `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 700; font-size: 0.92rem;">
              ตอนที่ ${escapeHtml(ch.chapterNumber)} ${ch.title ? ' - ' + escapeHtml(ch.title) : ''}
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">
              ${ch.pages.length} หน้า • อัปเดต ${new Date(ch.updatedAt).toLocaleDateString('th-TH')}
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm admin-edit-ch" data-id="${ch.id}">
              <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
              <span>แก้ไข</span>
            </button>
            <button class="btn btn-danger btn-sm admin-delete-ch" data-id="${ch.id}" data-num="${escapeHtml(ch.chapterNumber)}">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
        </div>
      `).join('');

      lucide.createIcons({ root: container });

      // Action listeners
      container.querySelectorAll('.admin-edit-ch').forEach(btn => {
        btn.addEventListener('click', () => {
          const chId = btn.getAttribute('data-id');
          const ch = chapters.find(c => c.id === chId);
          if (ch) openChapterForm(ch);
        });
      });

      container.querySelectorAll('.admin-delete-ch').forEach(btn => {
        btn.addEventListener('click', async () => {
          const chId = btn.getAttribute('data-id');
          const num = btn.getAttribute('data-num');
          if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ตอนที่ ${num}?`)) {
            try {
              await API.deleteChapter(activeManagingManga.id, chId);
              showToast(`ลบตอนที่ ${num} สำเร็จแล้ว`, 'success');
              await reloadChapterList();
              await reloadAdminTable();
              handleRoute();
            } catch (err) {
              showToast(err.message, 'error');
            }
          }
        });
      });

    } catch (err) {
      container.innerHTML = `<div style="color: #ef4444; padding: 20px;">${escapeHtml(err.message)}</div>`;
    }
  }

  // Chapter Form Modal (Add / Edit)
  document.getElementById('openAddChapterModalBtn')?.addEventListener('click', () => {
    openChapterForm(null);
  });

  function openChapterForm(chapter = null) {
    if (!activeManagingManga) return;
    const isEdit = !!chapter;

    document.getElementById('chapterFormTitle').textContent = isEdit ? `แก้ไข ตอนที่ ${chapter.chapterNumber}` : 'เพิ่มตอนใหม่';
    document.getElementById('chapterFormMangaId').value = activeManagingManga.id;
    document.getElementById('chapterFormId').value = isEdit ? chapter.id : '';

    // Calculate next suggested chapter number
    let nextNum = '1';
    if (!isEdit && activeManagingManga.chapters.length > 0) {
      const maxNum = Math.max(...activeManagingManga.chapters.map(c => parseChapterNum(c.chapterNumber)));
      nextNum = (maxNum + 1).toString();
    }

    document.getElementById('chapterNumberInput').value = isEdit ? chapter.chapterNumber : nextNum;
    document.getElementById('chapterTitleInput').value = isEdit ? chapter.title || '' : '';
    document.getElementById('chapterUrlsTextarea').value = '';

    // Load pages into temp array
    state.tempChapterPages = isEdit ? [...chapter.pages] : [];
    renderChapterPagesPreview();

    openModal(DOM.chapterFormModal);
  }

  function renderChapterPagesPreview() {
    const grid = document.getElementById('chapterPagesPreview');
    const countDisplay = document.getElementById('pageCountDisplay');
    if (!grid) return;

    countDisplay.textContent = state.tempChapterPages.length;

    if (state.tempChapterPages.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.85rem;">ยังไม่มีรูปภาพหน้าการ์ตูนในตอนนี้</div>`;
      return;
    }

    grid.innerHTML = state.tempChapterPages.map((url, idx) => `
      <div class="page-preview-item">
        <img src="${escapeHtml(url)}" alt="หน้า ${idx + 1}" onerror="this.src='https://placehold.co/110x140/1a2233/ffffff?text=Error'">
        <div class="page-num">${idx + 1}</div>
        <button type="button" class="remove-page-btn" data-index="${idx}" title="ลบหน้านี้">
          &times;
        </button>
      </div>
    `).join('');

    grid.querySelectorAll('.remove-page-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.getAttribute('data-index'), 10);
        state.tempChapterPages.splice(index, 1);
        renderChapterPagesPreview();
      });
    });
  }

  // Clear all pages button
  document.getElementById('clearAllPagesBtn')?.addEventListener('click', () => {
    if (confirm('คุณต้องการลบรูปภาพหน้าการ์ตูนทั้งหมดในตอนนี้หรือไม่?')) {
      state.tempChapterPages = [];
      renderChapterPagesPreview();
    }
  });

  // Chapter URLs Textarea (Parse on change/blur)
  document.getElementById('chapterUrlsTextarea')?.addEventListener('blur', (e) => {
    const text = e.target.value.trim();
    if (!text) return;

    const urls = text.split('\n').map(u => u.trim()).filter(u => u.length > 0 && (u.startsWith('http') || u.startsWith('/')));
    if (urls.length > 0) {
      state.tempChapterPages.push(...urls);
      renderChapterPagesPreview();
      e.target.value = '';
      showToast(`เพิ่ม URL รูปภาพ ${urls.length} หน้าเรียบร้อยแล้ว`, 'info');
    }
  });

  // Drag & Drop / Click Upload for Chapter Pages
  const uploadArea = document.getElementById('chapterUploadArea');
  const fileInput = document.getElementById('chapterFilesInput');

  uploadArea?.addEventListener('click', () => {
    fileInput.click();
  });

  uploadArea?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea?.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea?.addEventListener('drop', async (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleBatchUpload(e.dataTransfer.files);
    }
  });

  fileInput?.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleBatchUpload(e.target.files);
    }
  });

  async function handleBatchUpload(fileList) {
    try {
      showToast(`กำลังอัปโหลดรูปภาพ ${fileList.length} หน้า กรุณารอสักครู่...`, 'info');
      const res = await API.uploadBatchPages(fileList);
      if (res && res.urls) {
        state.tempChapterPages.push(...res.urls);
        renderChapterPagesPreview();
        showToast(`อัปโหลดสำเร็จ ${res.count} หน้า`, 'success');
      }
    } catch (err) {
      showToast('อัปโหลดไฟล์ไม่สำเร็จ: ' + err.message, 'error');
    }
  }

  // Save Chapter Form
  document.getElementById('chapterForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mangaId = document.getElementById('chapterFormMangaId').value;
    const chapterId = document.getElementById('chapterFormId').value;
    const chapterNumber = document.getElementById('chapterNumberInput').value.trim();
    const title = document.getElementById('chapterTitleInput').value.trim();

    // Check URLs textarea in case user typed URLs but didn't trigger blur
    const pendingUrls = document.getElementById('chapterUrlsTextarea').value.trim();
    if (pendingUrls) {
      const urls = pendingUrls.split('\n').map(u => u.trim()).filter(u => u.length > 0 && (u.startsWith('http') || u.startsWith('/')));
      state.tempChapterPages.push(...urls);
    }

    if (state.tempChapterPages.length === 0) {
      showToast('กรุณาอัปโหลดรูปภาพ หรือใส่ URL หน้าการ์ตูนอย่างน้อย 1 หน้า', 'error');
      return;
    }

    const data = {
      chapterNumber,
      title,
      pages: state.tempChapterPages
    };

    const saveBtn = document.getElementById('saveChapterBtn');
    saveBtn.disabled = true;

    try {
      if (chapterId) {
        await API.updateChapter(mangaId, chapterId, data);
        showToast(`อัปเดต ตอนที่ ${chapterNumber} เรียบร้อยแล้ว`, 'success');
      } else {
        await API.addChapter(mangaId, data);
        showToast(`เพิ่ม ตอนที่ ${chapterNumber} เรียบร้อยแล้ว`, 'success');
      }

      closeModal(DOM.chapterFormModal);
      await reloadChapterList();
      await reloadAdminTable();
      handleRoute();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });

  // Helper
  function parseChapterNum(str) {
    if (!str) return 0;
    const cleaned = str.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  async function init() {
    // Check initial Admin Status
    try {
      state.isAdmin = await API.checkAdmin();
    } catch {
      state.isAdmin = false;
    }

    renderAuthNavbar();
    handleRoute();
  }

  init();

})();
