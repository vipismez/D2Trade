/**
 * D2Trade — 市场页面
 */

const MarketPage = {
  _page: 1,
  _search: '',

  render() {
    return `
      <div class="d2-market-header">
        <div class="d2-flex-between d2-mb-2">
          <h2 class="d2-title" style="margin-bottom:0;text-align:left;">装备市场</h2>
          <button class="d2-btn" onclick="App.route('mylistings')">我的发布</button>
        </div>
        <div class="d2-search">
          <input class="d2-input" id="market-search" placeholder="搜索装备名称..." value="${esc(this._search)}" />
          <button class="d2-btn" id="market-search-btn">搜索</button>
        </div>
      </div>
      <div class="d2-market-grid" id="market-grid">
        <div class="text-dim" style="grid-column:1/-1;text-align:center;padding:3rem;">加载中...</div>
      </div>
      <div class="d2-pagination" id="market-pagination"></div>`
  },

  async mount() {
    $('#market-search-btn').onclick = () => {
      this._search = $('#market-search').value.trim()
      this._page = 1
      this._load()
    }
    $('#market-search').onkeydown = (e) => {
      if (e.key === 'Enter') $('#market-search-btn').click()
    }
    await this._load()
  },

  async _load() {
    const grid = $('#market-grid')
    grid.innerHTML = '<div class="text-dim" style="grid-column:1/-1;text-align:center;padding:3rem;">加载中...</div>'

    const res = await API.listings({ page: this._page, pageSize: 20, search: this._search || undefined })
    if (!res.success) {
      grid.innerHTML = `<div class="text-red" style="grid-column:1/-1;text-align:center;padding:3rem;">${esc(res.error)}</div>`
      return
    }

    if (res.data.length === 0) {
      grid.innerHTML = '<div class="text-dim" style="grid-column:1/-1;text-align:center;padding:3rem;">市场暂无装备</div>'
      $('#market-pagination').innerHTML = ''
      return
    }

    grid.innerHTML = res.data.map(item => `
      <div class="d2-item-card">
        <div class="d2-item-name">${esc(item.item_name)}</div>
        ${item.item_attrs && item.item_attrs !== '{}' ? `<div class="d2-item-attrs">${esc(item.item_attrs)}</div>` : ''}
        <div class="d2-flex-between d2-mt-1">
          <span class="d2-item-price">⚡ ${item.price}</span>
          <span class="d2-item-seller">卖家: ${esc(item.seller_name)}</span>
        </div>
        <div class="d2-item-card-actions">
          <span class="d2-item-status ${item.status === 'active' ? 'text-green' : 'text-dim'}">${item.status === 'active' ? '◆ 在售' : item.status}</span>
          ${Auth.loggedIn && item.seller_id !== Auth.user?.id
            ? `<button class="d2-btn d2-btn-sm" onclick="MarketPage._buy(${item.id}, '${esc(item.item_name)}', ${item.price})">购买</button>`
            : ''}
        </div>
      </div>
    `).join('')

    this._renderPagination(res.total)
  },

  _renderPagination(total) {
    const totalPages = Math.ceil(total / 20)
    const pg = $('#market-pagination')
    if (totalPages <= 1) { pg.innerHTML = ''; return }
    let html = ''
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="${i === this._page ? 'active' : ''}" onclick="MarketPage._goPage(${i})">${i}</button>`
    }
    pg.innerHTML = html
  },

  _goPage(p) { this._page = p; this._load() },

  async _buy(id, name, price) {
    if (!Auth.loggedIn) { App.route('login'); return }
    if (!confirm(`确认购买 "${name}" ？\n价格: ${price} 积分`)) return
    const res = await API.buy(id)
    if (res.success) {
      toast('购买成功！请在游戏内完成交易', 'success')
      Auth.refresh()
      this._load()
    } else {
      toast(res.error, 'error')
    }
  },
}
