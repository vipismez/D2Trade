/**
 * D2Trade — 市场页面
 */

const MarketPage = {
  _page: 1,
  _search: '',
  _seller: '',
  _sort: 'newest',
  _pageSize: 20,

  render() {
    return `
      <div class="d2-market-header">
        <div class="d2-flex-between d2-mb-2">
          <h2 class="d2-title" style="margin-bottom:0;text-align:left;">装备市场</h2>
          <button class="d2-btn" onclick="App.route('mylistings')">我的发布</button>
        </div>
        <div class="d2-filter-bar">
          <input class="d2-input" id="market-search" placeholder="搜索装备名称..." value="${esc(this._search)}" />
          <input class="d2-input" id="market-seller" placeholder="按发布者筛选..." value="${esc(this._seller)}" />
          <select class="d2-input" id="market-sort">
            <option value="newest" ${this._sort === 'newest' ? 'selected' : ''}>最新发布</option>
            <option value="oldest" ${this._sort === 'oldest' ? 'selected' : ''}>最早发布</option>
          </select>
          <select class="d2-input" id="market-page-size">
            <option value="20" ${this._pageSize === 20 ? 'selected' : ''}>每页 20 条</option>
            <option value="40" ${this._pageSize === 40 ? 'selected' : ''}>每页 40 条</option>
            <option value="60" ${this._pageSize === 60 ? 'selected' : ''}>每页 60 条</option>
            <option value="100" ${this._pageSize === 100 ? 'selected' : ''}>每页 100 条</option>
          </select>
          <button class="d2-btn" id="market-search-btn">筛选</button>
        </div>
      </div>
      <div class="d2-market-grid" id="market-grid">
        <div class="text-dim" style="grid-column:1/-1;text-align:center;padding:3rem;">加载中...</div>
      </div>
      <div class="d2-pagination" id="market-pagination"></div>`
  },

  async mount() {
    $('#market-search-btn').onclick = () => this._applyFilters()
    ;['market-search', 'market-seller'].forEach(id => {
      $('#' + id).onkeydown = (e) => { if (e.key === 'Enter') this._applyFilters() }
    })
    $('#market-sort').onchange = () => this._applyFilters()
    $('#market-page-size').onchange = () => {
      this._pageSize = parseInt($('#market-page-size').value)
      this._page = 1
      this._load()
    }
    await this._load()
  },

  _applyFilters() {
    this._search = $('#market-search').value.trim()
    this._seller = $('#market-seller').value.trim()
    this._sort = $('#market-sort').value
    this._page = 1
    this._load()
  },

  async _load() {
    const grid = $('#market-grid')
    if (!grid) return  // 页面已切换
    grid.innerHTML = '<div class="text-dim" style="grid-column:1/-1;text-align:center;padding:3rem;">加载中...</div>'

    const res = await API.listings({
      page: this._page,
      pageSize: this._pageSize,
      search: this._search || undefined,
      seller: this._seller || undefined,
      sort: this._sort,
    })
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
        ${item.image_url ? `<div class="d2-item-image" onclick="MarketPage._previewImage('${esc(item.image_url)}')"><img src="${esc(item.image_url)}" alt="${esc(item.item_name)}" loading="lazy" /></div>` : ''}
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
    const pg = $('#market-pagination')
    if (!pg) return  // 页面已切换，元素不存在
    const totalPages = Math.ceil(total / this._pageSize)
    if (totalPages <= 1) { pg.innerHTML = ''; return }
    let html = ''
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="${i === this._page ? 'active' : ''}" onclick="MarketPage._goPage(${i})">${i}</button>`
    }
    pg.innerHTML = html
  },

  _goPage(p) { this._page = p; this._load() },

  _previewImage(url) {
    // 简单实现：在新窗口打开原图
    window.open(url, '_blank')
  },

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
