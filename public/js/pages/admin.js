/**
 * D2Trade — GM 管理面板
 */

const AdminPage = {
  _tab: 'users',
  _txPage: 1,

  render() {
    return `
      <div class="d2-flex-between d2-mb-2">
        <h2 class="d2-title" style="margin-bottom:0;text-align:left;">GM 管理面板</h2>
        <button class="d2-btn" onclick="App.route('market')">← 返回市场</button>
      </div>

      <div class="d2-admin-tabs">
        <button class="d2-admin-tab active" data-tab="users">用户审批</button>
        <button class="d2-admin-tab" data-tab="grant">发放积分</button>
        <button class="d2-admin-tab" data-tab="buyback">回收装备</button>
        <button class="d2-admin-tab" data-tab="transactions">全部交易</button>
      </div>

      <div id="admin-users" class="d2-admin-section active">
        <div id="pending-users-list"><div class="text-dim" style="text-align:center;padding:2rem;">加载中...</div></div>
      </div>

      <div id="admin-grant" class="d2-admin-section">
        <div class="d2-panel">
          <h3 style="color:var(--d2-gold);margin-bottom:0.75rem;">发放积分</h3>
          <form id="grant-form" class="d2-admin-form">
            <div class="d2-form-group">
              <label class="d2-label">玩家 ID</label>
              <input class="d2-input" name="user_id" type="number" min="1" required />
            </div>
            <div class="d2-form-group">
              <label class="d2-label">积分数量</label>
              <input class="d2-input" name="amount" type="number" min="1" required />
            </div>
            <div class="d2-form-group" style="grid-column:1/-1">
              <label class="d2-label">备注</label>
              <input class="d2-input" name="note" placeholder="发放原因（选填）" />
            </div>
            <button type="submit" class="d2-btn">发放积分</button>
          </form>
        </div>
      </div>

      <div id="admin-buyback" class="d2-admin-section">
        <div class="d2-panel">
          <h3 style="color:var(--d2-gold);margin-bottom:0.75rem;">回收装备</h3>
          <form id="buyback-form" class="d2-admin-form">
            <div class="d2-form-group">
              <label class="d2-label">玩家 ID</label>
              <input class="d2-input" name="user_id" type="number" min="1" required />
            </div>
            <div class="d2-form-group">
              <label class="d2-label">装备名称</label>
              <input class="d2-input" name="item_name" required />
            </div>
            <div class="d2-form-group">
              <label class="d2-label">支付积分</label>
              <input class="d2-input" name="amount" type="number" min="1" required />
            </div>
            <div class="d2-form-group">
              <label class="d2-label">备注（选填）</label>
              <input class="d2-input" name="note" />
            </div>
            <button type="submit" class="d2-btn">确认回收</button>
          </form>
        </div>
      </div>

      <div id="admin-transactions" class="d2-admin-section">
        <div class="d2-search-bar">
          <select class="d2-input" id="tx-type-filter" style="max-width:150px;">
            <option value="">全部类型</option>
            <option value="trade">交易</option>
            <option value="buyback">GM回收</option>
            <option value="grant">GM发放</option>
            <option value="rollback">回退</option>
          </select>
          <button class="d2-btn d2-btn-sm" id="tx-filter-btn">筛选</button>
        </div>
        <div id="all-tx-list"><div class="text-dim" style="text-align:center;padding:2rem;">加载中...</div></div>
        <div class="d2-pagination" id="atx-pagination"></div>
      </div>`
  },

  async mount() {
    if (!Auth.loggedIn) { App.route('login'); return }
    if (!Auth.isGM) { toast('需要 GM 权限', 'error'); App.route('market'); return }

    // Tab 切换
    $$('.d2-admin-tab').forEach(t => t.onclick = () => {
      $$('.d2-admin-tab').forEach(x => x.classList.remove('active'))
      $$('.d2-admin-section').forEach(x => x.classList.remove('active'))
      t.classList.add('active')
      const tab = t.dataset.tab
      $(`#admin-${tab}`).classList.add('active')
      if (tab === 'users') this._loadPendingUsers()
      else if (tab === 'transactions') this._loadAllTransactions()
    })

    // 表单提交
    $('#grant-form').onsubmit = async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const res = await API.grantPoints(
        parseInt(fd.get('user_id')),
        parseInt(fd.get('amount')),
        fd.get('note'),
      )
      if (res.success) { toast('积分发放成功', 'success'); e.target.reset() }
      else toast(res.error, 'error')
    }

    $('#buyback-form').onsubmit = async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const res = await API.buyback(
        parseInt(fd.get('user_id')),
        fd.get('item_name'),
        parseInt(fd.get('amount')),
        fd.get('note'),
      )
      if (res.success) { toast('回收成功', 'success'); e.target.reset() }
      else toast(res.error, 'error')
    }

    $('#tx-filter-btn').onclick = () => this._loadAllTransactions()

    await this._loadPendingUsers()
  },

  async _loadPendingUsers() {
    const el = $('#pending-users-list')
    const res = await API.pendingUsers()
    if (!res.success) { el.innerHTML = `<div class="text-red">${esc(res.error)}</div>`; return }

    if (res.data.length === 0) {
      el.innerHTML = '<div class="text-dim" style="text-align:center;padding:2rem;">暂无待审批用户</div>'
      return
    }

    el.innerHTML = `
      <table class="d2-table">
        <thead><tr><th>ID</th><th>用户名</th><th>QQ</th><th>申请时间</th><th>操作</th></tr></thead>
        <tbody>
          ${res.data.map(u => `
            <tr>
              <td>${u.id}</td><td>${esc(u.username)}</td><td>${esc(u.qq)}</td>
              <td>${fmtTime(u.created_at)}</td>
              <td>
                <button class="d2-btn d2-btn-sm" onclick="AdminPage._approve(${u.id})">✓ 通过</button>
                <button class="d2-btn d2-btn-sm d2-btn-danger" onclick="AdminPage._reject(${u.id})">✗ 拒绝</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
  },

  async _loadAllTransactions() {
    const el = $('#all-tx-list')
    const type = $('#tx-type-filter').value || undefined
    const res = await API.allTransactions({ page: this._txPage, pageSize: 20, type })

    if (!res.success) { el.innerHTML = `<div class="text-red">${esc(res.error)}</div>`; return }
    if (res.data.length === 0) {
      el.innerHTML = '<div class="text-dim" style="text-align:center;padding:2rem;">暂无交易</div>'
      $('#atx-pagination').innerHTML = ''
      return
    }

    el.innerHTML = `
      <table class="d2-table">
        <thead><tr><th>ID</th><th>类型</th><th>装备</th><th>买家</th><th>卖家</th><th>GM</th><th>金额</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
        <tbody>
          ${res.data.map(tx => `
            <tr>
              <td>#${tx.id}</td>
              <td><span class="d2-badge d2-badge-${txTypeClass(tx.type)}">${txTypeLabel(tx.type)}</span></td>
              <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(tx.item_name || '-')}</td>
              <td>${esc(tx.buyer_name || '-')}</td>
              <td>${esc(tx.seller_name || '-')}</td>
              <td>${esc(tx.gm_name || '-')}</td>
              <td class="text-gold">${tx.amount}</td>
              <td>${tx.status === 'rolled_back' ? '<span class="d2-badge d2-badge-red">已回退</span>' : '<span class="d2-badge d2-badge-green">完成</span>'}</td>
              <td style="font-size:0.75rem;">${fmtTime(tx.created_at)}</td>
              <td>${tx.status === 'completed' && tx.type !== 'rollback'
                ? `<button class="d2-btn d2-btn-sm d2-btn-danger" onclick="AdminPage._rollback(${tx.id})">回退</button>`
                : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`

    this._renderTxPagination(res.total)
  },

  _renderTxPagination(total) {
    const totalPages = Math.ceil(total / 20)
    const pg = $('#atx-pagination')
    if (totalPages <= 1) { pg.innerHTML = ''; return }
    let html = ''
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="${i === this._txPage ? 'active' : ''}" onclick="AdminPage._goTxPage(${i})">${i}</button>`
    }
    pg.innerHTML = html
  },

  _goTxPage(p) { this._txPage = p; this._loadAllTransactions() },

  async _approve(id) {
    const res = await API.approveUser(id)
    if (res.success) { toast('已审批通过', 'success'); this._loadPendingUsers() }
    else toast(res.error, 'error')
  },

  async _reject(id) {
    const res = await API.rejectUser(id)
    if (res.success) { toast('已拒绝', 'success'); this._loadPendingUsers() }
    else toast(res.error, 'error')
  },

  async _rollback(txId) {
    const reason = prompt('请输入回退原因：')
    if (!reason) return
    const res = await API.rollback(txId, reason)
    if (res.success) { toast('交易已回退', 'success'); this._loadAllTransactions() }
    else toast(res.error, 'error')
  },
}
