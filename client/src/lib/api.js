const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('supportflow_token');
}

function setToken(token) {
  if (token) {
    localStorage.setItem('supportflow_token', token);
  } else {
    localStorage.removeItem('supportflow_token');
  }
}

async function request(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const token = getToken();
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = { message: 'Invalid server response' };
  }

  if (!res.ok) {
    const err = new Error(data.message || `Request failed with status ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  setToken,
  getToken,
  clearToken: () => setToken(null),

  // Auth
  auth: {
    register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
    login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
    me: () => request('/auth/me'),
  },

  // Tickets
  tickets: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/tickets${q ? `?${q}` : ''}`);
    },
    get: (id) => request(`/tickets/${id}`),
    create: (payload) => request('/tickets', { method: 'POST', body: payload }),
    reviewTriage: (id, payload) => request(`/tickets/${id}/review-triage`, { method: 'POST', body: payload }),
    assign: (id) => request(`/tickets/${id}/assign`, { method: 'POST' }),
    updateStatus: (id, payload) => request(`/tickets/${id}/status`, { method: 'PATCH', body: payload }),
    addMessage: (id, payload) => request(`/tickets/${id}/messages`, { method: 'POST', body: payload }),
    setTyping: (id, isTyping) => request(`/tickets/${id}/typing`, { method: 'POST', body: { isTyping } }),
    rerunTriage: (id) => request(`/tickets/${id}/rerun-triage`, { method: 'POST' }),

    // AI Agent Helper
    suggestReply: (id) => request(`/tickets/${id}/ai-suggest-reply`),
    draftResolution: (id) => request(`/tickets/${id}/ai-resolution-draft`),
    summarizeThread: (id) => request(`/tickets/${id}/ai-summarize`),
    findSimilar: (id) => request(`/tickets/${id}/similar`),
  },

  // Activity feed
  activity: (limit = 10) => request(`/tickets/activity?limit=${limit}`),

  // Stats
  stats: () => request('/tickets/stats'),
};
