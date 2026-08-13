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
          <button class="d2-btn d2-btn-gold" onclick="App.route('mylistings')">💰 我要卖出</button>
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

      <div class="d2-table-wrap" id="market-list">
        <div class="text-dim" style="text-align:center;padding:3rem;">加载中...</div>
      </div>
      <div class="d2-pagination" id="market-pagination"></div>

      <!-- 装备详情弹窗 -->
      <div class="d2-modal" id="detail-modal" style="display:none;">
        <div class="d2-modal-box">
          <div class="d2-modal-header">
            <span class="d2-title" style="margin:0;font-size:1.1rem;">📜 装备详情</span>
            <button type="button" class="d2-modal-close" id="detail-close">✕</button>
          </div>
          <div id="detail-body"></div>
        </div>
      </div>`
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

    // 详情弹窗关闭
    const modal = $('#detail-modal')
    $('#detail-close').onclick = () => { modal.style.display = 'none' }
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none' }

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
    const el = $('#market-list')
    if (!el) return  // 页面已切换
    el.innerHTML = '<div class="text-dim" style="text-align:center;padding:3rem;">加载中...</div>'

    const res = await API.listings({
      page: this._page,
      pageSize: this._pageSize,
      search: this._search || undefined,
      seller: this._seller || undefined,
      sort: this._sort,
    })
    if (!res.success) {
      el.innerHTML = `<div class="text-red" style="text-align:center;padding:3rem;">${esc(res.error)}</div>`
      return
    }

    this._items = res.data

    if (res.data.length === 0) {
      el.innerHTML = '<div class="text-dim" style="text-align:center;padding:3rem;">市场暂无装备</div>'
      $('#market-pagination').innerHTML = ''
      return
    }

    el.innerHTML = `
      <table class="d2-table d2-market-table">
        <thead>
          <tr>
            <th style="width:64px;">图片</th>
            <th>物品名称</th>
            <th>卖家</th>
            <th>数量</th>
            <th>价格</th>
            <th style="width:90px;">操作</th>
          </tr>
        </thead>
        <tbody>
          ${res.data.map(item => `
            <tr class="d2-market-row" onclick="MarketPage._showDetail(${item.id})">
              <td class="d2-cell-img">
                ${item.image_url
                  ? `<img src="${esc(item.image_url)}" alt="${esc(item.item_name)}" loading="lazy" />`
                  : `<span class="text-dim">无图</span>`}
              </td>
              <td class="d2-cell-name">${esc(item.item_name)}</td>
              <td>
                <div>${esc(item.seller_name)}</div>
                <div class="d2-qq">QQ: ${esc(item.seller_qq || '-')}</div>
              </td>
              <td class="d2-cell-qty">x${item.quantity ?? 1}</td>
              <td class="text-gold" style="font-weight:bold;">${item.price} 积分</td>
              <td>
                ${Auth.loggedIn && item.seller_id !== Auth.user?.id
                  ? `<button class="d2-btn d2-btn-sm" onclick="event.stopPropagation(); MarketPage._buy(${item.id}, '${esc(item.item_name)}', ${item.price})">购买</button>`
                  : '<span class="text-dim" style="font-size:0.8rem;">—</span>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`

    this._renderPagination(res.total)
  },

  /** 点击行展示装备详情 */
  _showDetail(id) {
    const item = this._items.find(i => i.id === id)
    if (!item) return

    const body = $('#detail-body')
    body.innerHTML = `
      ${item.image_url ? `<div class="d2-detail-image" onclick="MarketPage._previewImage('${esc(item.image_url)}')"><img src="${esc(item.image_url)}" alt="${esc(item.item_name)}" /></div>` : ''}
      <div class="d2-detail-name">${esc(item.item_name)}</div>
      ${this._formatAttrs(item.item_attrs)}
      <div class="d2-detail-meta">
        <div><span class="text-dim">卖家：</span>${esc(item.seller_name)} <span class="d2-qq">(QQ: ${esc(item.seller_qq || '-')})</span></div>
        <div><span class="text-dim">数量：</span>x${item.quantity ?? 1}</div>
        <div><span class="text-dim">价格：</span><span class="text-gold" style="font-weight:bold;">${item.price} 积分</span></div>
      </div>
      <div class="d2-detail-actions">
        ${Auth.loggedIn && item.seller_id !== Auth.user?.id
          ? `<button class="d2-btn d2-btn-gold" onclick="MarketPage._buy(${item.id}, '${esc(item.item_name)}', ${item.price})">购买</button>`
          : '<span class="text-dim">这是你发布的装备</span>'}
      </div>`
    $('#detail-modal').style.display = ''
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

  /** 属性文本分行渲染：符文配方橙色、需求等级金色、其余蓝色 */
  _formatAttrs(attrs) {
    if (!attrs || attrs === '{}') return ''
    const lines = String(attrs).split('\n')
    let html = ''
    let inRuneRecipe = false
    for (const line of lines) {
      const t = line.trim()
      if (!t) { html += '<div class="d2-attr-space"></div>'; inRuneRecipe = false; continue }
      if (t.startsWith('符文配方') || t.startsWith('符文组合')) {
        inRuneRecipe = true
        html += `<div class="d2-attr-rune">${esc(t)}</div>`
        continue
      }
      if (t.startsWith('需求等级') || t.startsWith('须要等级') || t.startsWith('需要等级')) {
        inRuneRecipe = false
        html += `<div class="d2-attr-req">${esc(t)}</div>`
        continue
      }
      html += inRuneRecipe
        ? `<div class="d2-attr-rune">${esc(t)}</div>`
        : `<div class="d2-attr-line">${esc(t)}</div>`
    }
    return `<div class="d2-item-attrs">${html}</div>`
  },

  _previewImage(url) {
    // 简单实现：在新窗口打开原图
    window.open(url, '_blank')
  },

  _buy(id, name, price) {
    if (!Auth.loggedIn) { App.route('login'); return }
    d2Confirm(`确认购买 "${name}" ？\n价格: ${price} 积分`, async () => {
      const res = await API.buy(id)
      if (res.success) {
        toast('购买成功！请在游戏内完成交易', 'success')
        Auth.refresh()
        this._load()
      } else {
        toast(res.error, 'error')
      }
    })
  },
}
