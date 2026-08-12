/**
 * D2Trade — 认证状态管理
 */

const Auth = {
  _user: null,

  /** 从 localStorage 恢复登录态 */
  init() {
    const token = localStorage.getItem('d2token')
    const user = localStorage.getItem('d2user')
    if (token && user) {
      API.setToken(token)
      try { this._user = JSON.parse(user) } catch { this.logout() }
    }
  },

  /** 登录 */
  async login(username, password) {
    const res = await API.login(username, password)
    if (!res.success) return res
    API.setToken(res.data.token)
    this._user = res.data.user
    localStorage.setItem('d2token', res.data.token)
    localStorage.setItem('d2user', JSON.stringify(res.data.user))
    return res
  },

  /** 登出 */
  logout() {
    API.clearToken()
    this._user = null
    localStorage.removeItem('d2token')
    localStorage.removeItem('d2user')
    App.route('login')
  },

  /** 当前用户 */
  get user() { return this._user },

  /** 是否已登录 */
  get loggedIn() { return !!this._user },

  /** 是否是 GM */
  get isGM() { return this._user?.role === 'gm' },

  /** 刷新用户信息 */
  async refresh() {
    const res = await API.me()
    if (res.success) {
      this._user = { ...this._user, ...res.data }
      localStorage.setItem('d2user', JSON.stringify(this._user))
    }
  },
}
