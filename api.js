/**
 * api.js - Fixed API client
 */

'use strict';

// Configuration - set these on window
window.BASE_URL = window.BASE_URL || 'https://tritech-backend-1w10.onrender.com';
window.TOKEN_KEY = 'st_token';

const BASE_URL = window.BASE_URL;

// Helper: safe JSON parse
function safeParse(text) {
  try { 
    return JSON.parse(text); 
  } catch (e) { 
    return null; 
  }
}

// Core request function
async function request(method, path, body = null, opts = {}) {
  const url = BASE_URL + path;
  const timeout = opts.timeout || 15000;
  const token = opts.token || localStorage.getItem(window.TOKEN_KEY) || null;
  
  const headers = Object.assign({}, opts.headers || {});
  
  if (body !== null && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const fetchOpts = {
    method,
    headers,
    signal: controller.signal,
    credentials: 'include'
  };

  if (body !== null) {
    fetchOpts.body = (body instanceof FormData) ? body : JSON.stringify(body);
  }

  try {
    const res = await fetch(url, fetchOpts);
    clearTimeout(id);
    const text = await res.text();
    const json = safeParse(text);

    if (res.ok) {
      return json !== null ? json : { ok: true };
    }

    // Return error response
    return json || { error: text || `Request failed with status ${res.status}` };
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      return { error: 'Request timed out' };
    }
    return { error: 'Network error: ' + (err.message || String(err)) };
  }
}

// Public API methods
const api = {
  get: async (path, opts = {}) => request('GET', path, null, opts),
  post: async (path, body = {}, opts = {}) => request('POST', path, body, opts),
  patch: async (path, body = {}, opts = {}) => request('PATCH', path, body, opts),
  put: async (path, body = {}, opts = {}) => request('PUT', path, body, opts),
  delete: async (path, opts = {}) => request('DELETE', path, null, opts),
  
  // Token helpers
  setToken: (token) => {
    try {
      localStorage.setItem(window.TOKEN_KEY, token);
    } catch (err) {
      console.warn('Cannot save token:', err);
    }
  },
  
  clearToken: () => {
    try {
      localStorage.removeItem(window.TOKEN_KEY);
    } catch (err) {
      console.warn('Cannot clear token:', err);
    }
  },
  
  getToken: () => {
    try {
      return localStorage.getItem(window.TOKEN_KEY);
    } catch (err) {
      console.warn('Cannot get token:', err);
      return null;
    }
  }
};

// Attach to window for global access
if (typeof window !== 'undefined') {
  window.api = api;
}