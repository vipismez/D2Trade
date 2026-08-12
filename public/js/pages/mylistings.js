/**
 * D2Trade — 我的发布页
 */

const MyListingsPage = {
  render() {
    return `
      <div class="d2-flex-between d2-mb-2">
        <h2 class="d2-title" style="margin-bottom:0;text-align:left;">我的发布</h2>
        <button class="d2-btn" onclick="App.route('market')">← 返回市场</button>
      </div>

      <div class="d2-panel d2-mylistings-form d2-mb-3">
        <h3 style="color:var(--d2-gold);margin-bottom:0.75rem;">发布新装备</h3>
        <form id="new-listing-form">
          <div class="d2-form-group">
            <label class="d2-label">装备名称</label>
            <input class="d2-input" name="item_name" placeholder="例：末日 狂战士斧" required />
          </div>
          <div class="d2-form-group">
            <label class="d2-label">装备属性（选填）</label>
            <textarea class="d2-textarea" name="item_attrs" placeholder="例：ED 380%、IAS 60%、+3 技能"></textarea>
          </div>
          <div class="d2-form-group">
            <label class="d2-label">价格（积分）</label>
            <input class="d2-input" name="price" type="number" min="1" placeholder="例：100" required />
          </div>
          <button type="submit" class="d2-btn">发布装备</button>
        </form>
      </div>

      <div id="mylistings-list">
        <div class="text-dim" style="text-align:center;padding:2rem;">加载中...</div>
      </div>`
  },

  async mount() {
    if (!Auth.loggedIn) { App.route('login'); return }

    $('#new-listing-form').onsubmit = async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const data = {
        item_name: fd.get('item_name'),
        item_attrs: fd.get('item_attrs') || '{}',
        price: parseInt(fd.get('price')),
      }
      const res = await API.createListing(data)
      if (res.success) {
        toast('发布成功！', 'success')
        e.target.reset()
        this._load()
      } else {
        toast(res.error, 'error')
      }
    }

    await this._load()
  },

  async _load() {
    const el = $('#mylistings-list')
    const res = await API.myListings()
    if (!res.success) { el.innerHTML = `<div class="text-red">${esc(res.error)}</div>`; return }

    if (res.data.length === 0) {
      el.innerHTML = '<div class="text-dim" style="text-align:center;padding:2rem;">暂无发布</div>'
      return
    }

    el.innerHTML = `
      <table class="d2-table">
        <thead>
          <tr><th>装备</th><th>属性</th><th>价格</th><th>状态</th><th>时间</th><th>操作</th></tr>
        </thead>
        <tbody>
          ${res.data.map(item => `
            <tr>
              <td><span class="d2-item-name" style="font-size:0.9rem;">${esc(item.item_name)}</span></td>
              <td style="font-size:0.8rem;color:var(--d2-blue);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(item.item_attrs === '{}' ? '-' : item.item_attrs)}</td>
              <td class="text-gold">${item.price}</td>
              <td>${item.status === 'active' ? '<span class="d2-badge d2-badge-green">在售</span>' :
                    item.status === 'sold' ? '<span class="d2-badge d2-badge-gold">已售</span>' :
                    '<span class="d2-badge d2-badge-red">已下架</span>'}</td>
              <td style="font-size:0.8rem;">${fmtTime(item.created_at)}</td>
              <td>${item.status === 'active'
                ? `<button class="d2-btn d2-btn-sm d2-btn-danger" onclick="MyListingsPage._cancel(${item.id})">下架</button>`
                : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
  },

  async _cancel(id) {
    if (!confirm('确认下架该装备？')) return
    const res = await API.cancelListing(id)
    if (res.success) { toast('已下架', 'success'); this._load() }
    else { toast(res.error, 'error') }
  },
}
