/**
 * D2Trade — GM 回收申请页
 */

const BuybackPage = {
  render() {
    return `
      <div class="d2-flex-between d2-mb-2">
        <h2 class="d2-title" style="margin-bottom:0;text-align:left;">GM 回收</h2>
        <button class="d2-btn" onclick="App.route('market')">← 返回市场</button>
      </div>

      <div class="d2-panel d2-mb-3">
        <h3 style="color:var(--d2-gold);margin-bottom:0.5rem;">💰 提交回收申请</h3>
        <p class="text-dim" style="font-size:0.85rem;margin-bottom:0.75rem;">提交装备回收申请，GM 审批通过后支付积分</p>
        <form id="buyback-form">
          <div class="d2-form-group">
            <label class="d2-label">装备名称</label>
            <input class="d2-input" name="item_name" placeholder="例：乔丹之石" required />
          </div>
          <div class="d2-form-group">
            <label class="d2-label">装备属性（选填）</label>
            <textarea class="d2-textarea" name="item_attrs" placeholder="例：ED 380%、IAS 60%"></textarea>
          </div>
          <div class="d2-form-group">
            <label class="d2-label">期望积分</label>
            <input class="d2-input" name="expected_points" type="number" min="0" placeholder="例：500" required />
          </div>
          <button type="submit" class="d2-btn d2-btn-gold" id="submit-buyback">提交申请</button>
        </form>
      </div>

      <div class="d2-panel">
        <h3 style="color:var(--d2-gold);margin-bottom:0.75rem;">我的回收申请</h3>
        <div id="buyback-list">
          <div class="text-dim" style="text-align:center;padding:2rem;">加载中...</div>
        </div>
      </div>`
  },

  async mount() {
    if (!Auth.loggedIn) { App.route('login'); return }

    $('#buyback-form').onsubmit = async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const data = {
        item_name: fd.get('item_name').trim(),
        item_attrs: fd.get('item_attrs') || '{}',
        expected_points: parseInt(fd.get('expected_points')) || 0,
      }
      if (!data.item_name) { toast('请填写装备名称', 'error'); return }

      const res = await API.submitBuybackRequest(data)
      if (res.success) {
        toast('回收申请已提交，等待 GM 审批', 'success')
        e.target.reset()
        this._load()
      } else {
        toast(res.error, 'error')
      }
    }

    await this._load()
  },

  async _load() {
    const el = $('#buyback-list')
    const res = await API.myBuybackRequests()
    if (!res.success) { el.innerHTML = `<div class="text-red">${esc(res.error)}</div>`; return }

    if (res.data.length === 0) {
      el.innerHTML = '<div class="text-dim" style="text-align:center;padding:2rem;">暂无回收申请</div>'
      return
    }

    const statusBadge = {
      pending: '<span class="d2-badge d2-badge-gold">待审批</span>',
      approved: '<span class="d2-badge d2-badge-green">已通过</span>',
      rejected: '<span class="d2-badge d2-badge-red">已拒绝</span>',
    }

    el.innerHTML = `
      <table class="d2-table">
        <thead><tr><th>装备</th><th>期望积分</th><th>状态</th><th>提交时间</th><th>备注</th></tr></thead>
        <tbody>
          ${res.data.map(r => `
            <tr>
              <td>${esc(r.item_name)}</td>
              <td class="text-gold">${r.expected_points}</td>
              <td>${statusBadge[r.status] || esc(r.status)}</td>
              <td style="font-size:0.8rem;">${fmtTime(r.created_at)}</td>
              <td style="font-size:0.8rem;color:var(--d2-text-dim);">${esc(r.gm_note || '-')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
  },
}
