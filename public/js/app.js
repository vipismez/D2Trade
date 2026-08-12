/**
 * D2Trade — SPA 路由主入口
 *
 * 页面路由: login → market → mylistings / transactions / admin
 */

const App = {
  _current: null,

  /** 导航栏 HTML */
  _nav() {
    if (!Auth.loggedIn) return ''
    return `
      <nav class="d2-nav">
        <span class="d2-nav-brand">D2Trade</span>
        <div class="d2-nav-links">
          <span class="d2-nav-points">⚡ ${Auth.user?.points ?? 0}</span>
          <span class="d2-nav-link" onclick="App.route('market')">市场</span>
          <span class="d2-nav-link" onclick="App.route('mylistings')">我的发布</span>
          <span class="d2-nav-link" onclick="App.route('transactions')">交易记录</span>
          ${Auth.isGM ? '<span class="d2-nav-link" onclick="App.route(\'admin\')">GM面板</span>' : ''}
          <span class="text-dim">|</span>
          <span class="text-dim" style="font-size:0.8rem;">${esc(Auth.user?.username)}</span>
          <span class="d2-nav-link" onclick="Auth.logout()">退出</span>
        </div>
      </nav>`
  },

  /** 路由映射 */
  _pages: {
    login:        { render: () => LoginPage.render(),        mount: () => LoginPage.mount() },
    market:       { render: () => MarketPage.render(),       mount: () => MarketPage.mount() },
    mylistings:   { render: () => MyListingsPage.render(),   mount: () => MyListingsPage.mount() },
    transactions: { render: () => TransactionsPage.render(), mount: () => TransactionsPage.mount() },
    admin:        { render: () => AdminPage.render(),        mount: () => AdminPage.mount() },
  },

  /** 路由跳转 */
  route(name) {
    const page = this._pages[name]
    if (!page) { this.route('market'); return }
    this._current = name

    const nav = this._nav()
    const content = page.render()
    $('#app').innerHTML = nav + `<div class="d2-container">${content}</div>`

    // 高亮当前导航链接
    $$('.d2-nav-link').forEach(l => {
      l.classList.remove('active')
      if (l.textContent.trim() === '市场' && name === 'market') l.classList.add('active')
      if (l.textContent.trim() === '我的发布' && name === 'mylistings') l.classList.add('active')
      if (l.textContent.trim() === '交易记录' && name === 'transactions') l.classList.add('active')
      if (l.textContent.trim() === 'GM面板' && name === 'admin') l.classList.add('active')
    })

    page.mount()
  },

  /** 启动 */
  init() {
    Auth.init()
    if (Auth.loggedIn) {
      this.route('market')
    } else {
      this.route('login')
    }
  },
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => App.init())
