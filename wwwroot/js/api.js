// API Client Module
const API = (() => {
  const BASE_URL = '';
  const TOKEN_KEY = 'manga_admin_token';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = options.headers || {};

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Admin-Token'] = token;
    }

    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401 || response.status === 403) {
        if (endpoint.startsWith('/api/manga') && (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE')) {
          setToken(null);
          window.dispatchEvent(new CustomEvent('admin-state-changed', { detail: { isAdmin: false } }));
        }
      }

      const contentType = response.headers.get('content-type');
      let data = null;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMsg = (data && data.message) ? data.message : `HTTP error ${response.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
      throw err;
    }
  }

  return {
    getToken,
    setToken,

    // Auth
    async login(username, password) {
      const result = await request('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      if (result && result.token) {
        setToken(result.token);
      }
      return result;
    },

    async logout() {
      try {
        await request('/api/admin/logout', { method: 'POST' });
      } finally {
        setToken(null);
      }
    },

    async checkAdmin() {
      try {
        const result = await request('/api/admin/check');
        return result.isAdmin === true;
      } catch {
        return false;
      }
    },

    // Public Manga Queries
    async getMangaList(params = {}) {
      const qs = new URLSearchParams();
      if (params.q) qs.append('q', params.q);
      if (params.type) qs.append('type', params.type);
      if (params.category) qs.append('category', params.category);
      if (params.status) qs.append('status', params.status);
      if (params.sort) qs.append('sort', params.sort);

      const queryStr = qs.toString() ? `?${qs.toString()}` : '';
      return await request(`/api/manga${queryStr}`);
    },

    async getMangaDetail(id) {
      return await request(`/api/manga/${encodeURIComponent(id)}`);
    },

    async getChapterDetail(mangaId, chapterId) {
      return await request(`/api/manga/${encodeURIComponent(mangaId)}/chapters/${encodeURIComponent(chapterId)}`);
    },

    async getCategories() {
      return await request('/api/categories');
    },

    async getStats() {
      return await request('/api/stats');
    },

    // Admin Operations (Protected)
    async createManga(data) {
      return await request('/api/manga', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async updateManga(id, data) {
      return await request(`/api/manga/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    async deleteManga(id) {
      return await request(`/api/manga/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    },

    async addChapter(mangaId, data) {
      return await request(`/api/manga/${encodeURIComponent(mangaId)}/chapters`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async updateChapter(mangaId, chapterId, data) {
      return await request(`/api/manga/${encodeURIComponent(mangaId)}/chapters/${encodeURIComponent(chapterId)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    async deleteChapter(mangaId, chapterId) {
      return await request(`/api/manga/${encodeURIComponent(mangaId)}/chapters/${encodeURIComponent(chapterId)}`, {
        method: 'DELETE'
      });
    },

    async uploadCover(file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'cover');

      return await request('/api/upload', {
        method: 'POST',
        body: formData
      });
    },

    async uploadBatchPages(fileList) {
      const formData = new FormData();
      for (let i = 0; i < fileList.length; i++) {
        formData.append('files', fileList[i]);
      }

      return await request('/api/upload/batch', {
        method: 'POST',
        body: formData
      });
    }
  };
})();
