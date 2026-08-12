/**
 * D2Trade — API 请求封装
 */

const API = {
  _token: null,

  setToken(token) { this._token = token },
  getToken() { return this._token },
  clearToken() { this._token = null },

  headers() {
    const h = { 'Content-Type': 'application/json' }
    if (this._token) h['Authorization'] = `Bearer ${this._token}`
    return h
  },

  async request(method, path, body) {
    const opts = { method, headers: this.headers() }
    if (body) opts.body = JSON.stringify(body)
    const res = await fetch(path, opts)
    const data = await res.json()
    return { status: res.status, ...data }
  },

  get(path)     { return this.request('GET', path) },
  post(path, b) { return this.request('POST', path, b) },
  put(path, b)  { return this.request('PUT', path, b) },
  delete(path)  { return this.request('DELETE', path) },

  // ── Auth ──
  register(username, password, qq) {
    return this.post('/api/auth/register', { username, password, qq })
  },
  login(username, password) {
    return this.post('/api/auth/login', { username, password })
  },
  me() { return this.get('/api/auth/me') },

  // ── Listings ──
  listings(params = {}) {
    const q = new URLSearchParams(params).toString()
    return this.get(`/api/listings${q ? '?' + q : ''}`)
  },
  myListings(status) {
    const q = status ? `?status=${status}` : ''
    return this.get(`/api/listings/mine${q}`)
  },
  getListing(id) { return this.get(`/api/listings/${id}`) },
  createListing(data) { return this.post('/api/listings', data) },
  updateListing(id, data) { return this.put(`/api/listings/${id}`, data) },
  cancelListing(id) { return this.delete(`/api/listings/${id}`) },

  // ── Transactions ──
  buy(listingId) { return this.post('/api/transactions/buy', { listing_id: listingId }) },
  myTransactions(params = {}) {
    const q = new URLSearchParams(params).toString()
    return this.get(`/api/transactions${q ? '?' + q : ''}`)
  },

  // ── Admin ──
  pendingUsers() { return this.get('/api/admin/users/pending') },
  approveUser(userId) { return this.put('/api/admin/users/approve', { user_id: userId }) },
  rejectUser(userId) { return this.put('/api/admin/users/reject', { user_id: userId }) },
  allTransactions(params = {}) {
    const q = new URLSearchParams(params).toString()
    return this.get(`/api/admin/transactions${q ? '?' + q : ''}`)
  },
  rollback(txId, reason) {
    return this.post('/api/admin/transactions/rollback', { transaction_id: txId, reason })
  },
  grantPoints(userId, amount, note) {
    return this.post('/api/admin/grant', { user_id: userId, amount, note })
  },
  buyback(userId, itemName, amount, note) {
    return this.post('/api/admin/buyback', { user_id: userId, item_name: itemName, amount, note })
  },
}
