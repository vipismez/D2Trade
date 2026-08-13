/**
 * D2Trade — GM 管理面板
 */

const AdminPage = {
  _tab: 'users',
  _txPage: 1,
  _listingPage: 1,
  _listingPageSize: 20,

  render() {
    return `
      <div class="d2-flex-between d2-mb-2">
        <h2 class="d2-title" style="margin-bottom:0;text-align:left;">GM 管理面板</h2>
        <button class="d2-btn" onclick="App.route('market')">← 返回市场</button>
      </div>

      <div class="d2-admin-tabs">
        <button class="d2-admin-tab active" data-tab="users">用户审批</button>
        <button class="d2-admin-tab" data-tab="allusers">全部用户</button>
        <button class="d2-admin-tab" data-tab="grant">发放积分</button>
        <button class="d2-admin-tab" data-tab="buyback">回收装备</button>
        <button class="d2-admin-tab" data-tab="listings">市场管理</button>
        <button class="d2-admin-tab" data-tab="transactions">全部交易</button>
      </div>

      <div id="admin-users" class="d2-admin-section active">
        <div id="pending-users-list"><div class="text-dim" style="text-align:center;padding:2rem;">加载中...</div></div>
      </div>

      <div id="admin-allusers" class="d2-admin-section">
        <div class="d2-flex-between d2-mb-2">
          <div class="text-dim" style="font-size:0.85rem;">禁用后用户无法登录，历史交易数据保留</div>
          <button class="d2-btn d2-btn-gold" id="create-user-btn">+ 新增用户</button>
        </div>
        <div id="all-users-list"><div class="text-dim" style="text-align:center;padding:2rem;">加载中...</div></div>
      </div>

      <div id="admin-grant" class="d2-admin-section">
        <div class="d2-panel">
          <h3 style="color:var(--d2-gold);margin-bottom:0.75rem;">发放积分</h3>
          <form id="grant-form" class="d2-admin-form">
            <div class="d2-form-group">
              <label class="d2-label">玩家用户名</label>
              <input class="d2-input" name="username" required />
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
        <div class="d2-search-bar">
          <select class="d2-input" id="buyback-status-filter" style="max-width:150px;">
            <option value="pending">待审批</option>
            <option value="">全部状态</option>
            <option value="approved">已通过</option>
            <option value="rejected">已拒绝</option>
          </select>
          <button class="d2-btn d2-btn-sm" id="buyback-filter-btn">筛选</button>
        </div>
        <div id="buyback-request-list"><div class="text-dim" style="text-align:center;padding:2rem;">加载中...</div></div>
      </div>

      <div id="admin-listings" class="d2-admin-section">
        <div class="d2-search-bar">
          <input class="d2-input" id="listing-search" placeholder="搜索物品名称..." />
          <input class="d2-input" id="listing-seller" placeholder="按卖家筛选..." />
          <select class="d2-input" id="listing-status-filter" style="max-width:130px;">
            <option value="active">在售</option>
            <option value="">全部状态</option>
            <option value="cancelled">已下架</option>
            <option value="sold">已售</option>
          </select>
          <select class="d2-input" id="listing-page-size" style="max-width:130px;">
            <option value="20">每页 20 条</option>
            <option value="40">每页 40 条</option>
            <option value="60">每页 60 条</option>
            <option value="80">每页 80 条</option>
            <option value="100">每页 100 条</option>
          </select>
          <button class="d2-btn d2-btn-sm" id="listing-filter-btn">筛选</button>
        </div>
        <div id="admin-listing-list"><div class="text-dim" style="text-align:center;padding:2rem;">加载中...</div></div>
        <div class="d2-pagination" id="listing-pagination"></div>
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
      </div>

      <!-- 新增用户弹窗 -->
      <div class="d2-modal" id="create-user-modal" style="display:none;">
        <div class="d2-modal-box" style="max-width:460px;">
          <div class="d2-modal-header">
            <span class="d2-title" style="margin:0;font-size:1.1rem;">👤 新增用户</span>
            <button type="button" class="d2-modal-close" id="create-user-close">✕</button>
          </div>
          <form id="create-user-form" style="padding:1rem;">
            <div class="d2-form-group">
              <label class="d2-label">用户名（3-20 字符）</label>
              <input class="d2-input" id="cu-username" required />
            </div>
            <div class="d2-form-group">
              <label class="d2-label">密码（至少 6 位）</label>
              <input class="d2-input" id="cu-password" type="password" required />
            </div>
            <div class="d2-form-group">
              <label class="d2-label">QQ</label>
              <input class="d2-input" id="cu-qq" required />
            </div>
            <div class="d2-form-group">
              <label class="d2-label">角色</label>
              <select class="d2-input" id="cu-role">
                <option value="player">玩家</option>
                <option value="gm">GM</option>
              </select>
            </div>
            <button type="submit" class="d2-btn d2-btn-gold">创建用户</button>
          </form>
        </div>
      </div>

      <!-- 编辑用户弹窗 -->
      <div class="d2-modal" id="edit-user-modal" style="display:none;">
        <div class="d2-modal-box" style="max-width:460px;">
          <div class="d2-modal-header">
            <span class="d2-title" style="margin:0;font-size:1.1rem;">✏️ 编辑用户</span>
            <button type="button" class="d2-modal-close" id="edit-user-close">✕</button>
          </div>
          <form id="edit-user-form" style="padding:1rem;">
            <input type="hidden" id="eu-id" />
            <div class="d2-form-group">
              <label class="d2-label">用户名</label>
              <input class="d2-input" id="eu-username" required />
            </div>
            <div class="d2-form-group">
              <label class="d2-label">新密码（留空则不修改）</label>
              <input class="d2-input" id="eu-password" type="password" placeholder="不修改请留空" />
            </div>
            <div class="d2-form-group">
              <label class="d2-label">QQ</label>
              <input class="d2-input" id="eu-qq" required />
            </div>
            <div class="d2-form-row">
              <div class="d2-form-group">
                <label class="d2-label">角色</label>
                <select class="d2-input" id="eu-role">
                  <option value="player">玩家</option>
                  <option value="gm">GM</option>
                </select>
              </div>
              <div class="d2-form-group">
                <label class="d2-label">状态</label>
                <select class="d2-input" id="eu-status">
                  <option value="approved">已通过</option>
                  <option value="pending">待审批</option>
                  <option value="rejected">已拒绝</option>
                </select>
              </div>
            </div>
            <div class="d2-form-group">
              <label class="d2-label">积分</label>
              <input class="d2-input" id="eu-points" type="number" min="0" required />
            </div>
            <div class="d2-form-group">
              <label class="d2-ethereal-label">
                <input type="checkbox" id="eu-banned" />
                <span>禁用账号（无法登录，数据保留）</span>
              </label>
            </div>
            <button type="submit" class="d2-btn d2-btn-gold">保存修改</button>
          </form>
        </div>
      </div>

      <!-- 回收申请详情弹窗 -->
      <div class="d2-modal" id="buyback-detail-modal" style="display:none;">
        <div class="d2-modal-box" style="max-width:520px;">
          <div class="d2-modal-header">
            <span class="d2-title" style="margin:0;font-size:1.1rem;">💰 回收申请详情</span>
            <button type="button" class="d2-modal-close" id="buyback-detail-close">✕</button>
          </div>
          <div id="buyback-detail-body" style="padding:1rem;overflow-y:auto;"></div>
        </div>
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
      else if (tab === 'allusers') this._loadAllUsers()
      else if (tab === 'buyback') this._loadBuybackRequests()
      else if (tab === 'listings') this._loadAdminListings()
      else if (tab === 'transactions') this._loadAllTransactions()
    })

    // 表单提交
    $('#grant-form').onsubmit = async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const res = await API.grantPoints(
        fd.get('username').trim(),
        parseInt(fd.get('amount')),
        fd.get('note'),
      )
      if (res.success) { toast('积分发放成功', 'success'); e.target.reset() }
      else toast(res.error, 'error')
    }

    $('#buyback-filter-btn').onclick = () => this._loadBuybackRequests()
    $('#listing-filter-btn').onclick = () => { this._listingPage = 1; this._loadAdminListings() }
    $('#listing-page-size').onchange = () => { this._listingPageSize = parseInt($('#listing-page-size').value); this._listingPage = 1; this._loadAdminListings() }
    ;['listing-search', 'listing-seller'].forEach(id => {
      $('#' + id).onkeydown = (e) => { if (e.key === 'Enter') { this._listingPage = 1; this._loadAdminListings() } }
    })

    // 回收申请详情弹窗
    const bbModal = $('#buyback-detail-modal')
    $('#buyback-detail-close').onclick = () => { bbModal.style.display = 'none' }
    bbModal.onclick = (e) => { if (e.target === bbModal) bbModal.style.display = 'none' }

    $('#tx-filter-btn').onclick = () => this._loadAllTransactions()

    // ── 新增用户弹窗 ──
    const createModal = $('#create-user-modal')
    $('#create-user-btn').onclick = () => { createModal.style.display = '' }
    $('#create-user-close').onclick = () => { createModal.style.display = 'none' }
    createModal.onclick = (e) => { if (e.target === createModal) createModal.style.display = 'none' }
    $('#create-user-form').onsubmit = async (e) => {
      e.preventDefault()
      const res = await API.adminCreateUser({
        username: $('#cu-username').value.trim(),
        password: $('#cu-password').value,
        qq: $('#cu-qq').value.trim(),
        role: $('#cu-role').value,
      })
      if (res.success) {
        toast('用户创建成功', 'success')
        createModal.style.display = 'none'
        e.target.reset()
        this._loadAllUsers()
      } else {
        toast(res.error, 'error')
      }
    }

    // ── 编辑用户弹窗 ──
    const editModal = $('#edit-user-modal')
    $('#edit-user-close').onclick = () => { editModal.style.display = 'none' }
    editModal.onclick = (e) => { if (e.target === editModal) editModal.style.display = 'none' }
    $('#edit-user-form').onsubmit = async (e) => {
      e.preventDefault()
      const id = parseInt($('#eu-id').value)
      const data = {
        username: $('#eu-username').value.trim(),
        qq: $('#eu-qq').value.trim(),
        role: $('#eu-role').value,
        status: $('#eu-status').value,
        points: parseInt($('#eu-points').value) || 0,
        is_banned: $('#eu-banned').checked,
      }
      const pwd = $('#eu-password').value
      if (pwd) data.password = pwd

      const res = await API.adminUpdateUser(id, data)
      if (res.success) {
        toast('已保存修改', 'success')
        editModal.style.display = 'none'
        this._loadAllUsers()
      } else {
        toast(res.error, 'error')
      }
    }

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

  async _loadAllUsers() {
    const el = $('#all-users-list')
    const res = await API.allUsers()
    if (!res.success) { el.innerHTML = `<div class="text-red">${esc(res.error)}</div>`; return }

    this._allUsers = res.data

    if (res.data.length === 0) {
      el.innerHTML = '<div class="text-dim" style="text-align:center;padding:2rem;">暂无用户</div>'
      return
    }

    const roleLabel = { gm: 'GM', player: '玩家' }
    const statusBadge = {
      pending: '<span class="d2-badge d2-badge-gold">待审批</span>',
      approved: '<span class="d2-badge d2-badge-green">已通过</span>',
      rejected: '<span class="d2-badge d2-badge-red">已拒绝</span>',
    }

    el.innerHTML = `
      <table class="d2-table">
        <thead><tr><th>ID</th><th>用户名</th><th>QQ</th><th>角色</th><th>状态</th><th>积分</th><th>注册时间</th><th>操作</th></tr></thead>
        <tbody>
          ${res.data.map(u => `
            <tr>
              <td>${u.id}</td>
              <td>${esc(u.username)}${u.is_banned === 1 ? ' <span class="d2-badge d2-badge-red">已禁用</span>' : ''}</td>
              <td>${esc(u.qq)}</td>
              <td>${roleLabel[u.role] || esc(u.role)}</td>
              <td>${statusBadge[u.status] || esc(u.status)}</td>
              <td class="text-gold">${u.points}</td>
              <td style="font-size:0.8rem;">${fmtTime(u.created_at)}</td>
              <td style="white-space:nowrap;">
                <button class="d2-btn d2-btn-sm" onclick="AdminPage._editUser(${u.id})">编辑</button>
                ${u.is_banned === 1
                  ? `<button class="d2-btn d2-btn-sm d2-btn-gold" onclick="AdminPage._unbanUser(${u.id})">解禁</button>`
                  : `<button class="d2-btn d2-btn-sm d2-btn-danger" onclick="AdminPage._banUser(${u.id})">禁用</button>`}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
  },

  /** 打开编辑用户弹窗 */
  _editUser(id) {
    const u = this._allUsers?.find(x => x.id === id)
    if (!u) return
    $('#eu-id').value = u.id
    $('#eu-username').value = u.username
    $('#eu-password').value = ''
    $('#eu-qq').value = u.qq
    $('#eu-role').value = u.role
    $('#eu-status').value = u.status
    $('#eu-points').value = u.points
    $('#eu-banned').checked = u.is_banned === 1
    $('#edit-user-modal').style.display = ''
  },

  /** 禁用用户（软删除） */
  _banUser(id) {
    d2Confirm('确认禁用该用户？\n禁用后用户无法登录，但历史数据保留，可随时解禁。', async () => {
      const res = await API.adminDeleteUser(id)
      if (res.success) { toast('已禁用', 'success'); this._loadAllUsers() }
      else toast(res.error, 'error')
    }, true)
  },

  /** 解禁用户 */
  _unbanUser(id) {
    d2Confirm('确认解禁该用户？', async () => {
      const res = await API.adminUpdateUser(id, { is_banned: false })
      if (res.success) { toast('已解禁', 'success'); this._loadAllUsers() }
      else toast(res.error, 'error')
    })
  },

  /** 加载回收申请列表 */
  async _loadBuybackRequests() {
    const el = $('#buyback-request-list')
    if (!el) return
    const status = $('#buyback-status-filter').value || undefined
    const res = await API.adminBuybackRequests(status)
    if (!res.success) { el.innerHTML = `<div class="text-red">${esc(res.error)}</div>`; return }

    this._buybackRequests = res.data

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
        <thead><tr><th>ID</th><th>装备</th><th>申请人</th><th>期望积分</th><th>状态</th><th>提交时间</th></tr></thead>
        <tbody>
          ${res.data.map(r => `
            <tr class="d2-market-row" onclick="AdminPage._showBuybackDetail(${r.id})">
              <td>#${r.id}</td>
              <td>${esc(r.item_name)}</td>
              <td>${esc(r.username)}</td>
              <td class="text-gold">${r.expected_points}</td>
              <td>${statusBadge[r.status] || esc(r.status)}</td>
              <td style="font-size:0.8rem;">${fmtTime(r.created_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
  },

  /** 打开回收申请详情 */
  _showBuybackDetail(id) {
    const r = this._buybackRequests?.find(x => x.id === id)
    if (!r) return
    const body = $('#buyback-detail-body')
    const attrs = r.item_attrs && r.item_attrs !== '{}'
      ? `<div class="d2-item-attrs" style="white-space:pre-line;">${esc(r.item_attrs)}</div>`
      : ''

    body.innerHTML = `
      <div class="d2-detail-name">${esc(r.item_name)}</div>
      ${attrs}
      <div class="d2-detail-meta">
        <div><span class="text-dim">申请人：</span>${esc(r.username)} <span class="d2-qq">(QQ: ${esc(r.qq || '-')})</span></div>
        <div><span class="text-dim">期望积分：</span><span class="text-gold">${r.expected_points}</span></div>
        <div><span class="text-dim">提交时间：</span>${fmtTime(r.created_at)}</div>
        <div><span class="text-dim">状态：</span>${r.status === 'pending' ? '待审批' : r.status === 'approved' ? '已通过' : '已拒绝'}</div>
      </div>
      ${r.status === 'pending' ? `
        <div class="d2-detail-meta" style="border-top:1px dashed var(--d2-stone-border);">
          <div class="d2-form-group">
            <label class="d2-label">支付积分（默认按期望积分）</label>
            <input class="d2-input" id="bb-amount" type="number" min="1" value="${r.expected_points}" />
          </div>
          <div class="d2-form-group">
            <label class="d2-label">备注（选填）</label>
            <input class="d2-input" id="bb-note" placeholder="回收备注" />
          </div>
          <div class="d2-flex-between" style="justify-content:flex-end;gap:0.6rem;">
            <button class="d2-btn d2-btn-danger" onclick="AdminPage._rejectBuyback(${r.id})">拒绝</button>
            <button class="d2-btn d2-btn-gold" onclick="AdminPage._approveBuyback(${r.id})">同意回收</button>
          </div>
        </div>`
      : `<div class="d2-detail-meta"><span class="text-dim">GM 备注：</span>${esc(r.gm_note || '-')}</div>`}
    `
    $('#buyback-detail-modal').style.display = ''
  },

  /** 同意回收（支付积分） */
  _approveBuyback(id) {
    const amount = parseInt($('#bb-amount').value) || 0
    const note = $('#bb-note').value.trim()
    if (amount <= 0) { toast('请填写正确的支付积分', 'error'); return }
    d2Confirm(`确认同意回收并支付 ${amount} 积分？`, async () => {
      const res = await API.adminProcessBuyback(id, { action: 'approve', amount, note })
      if (res.success) {
        toast('已同意回收并支付积分', 'success')
        $('#buyback-detail-modal').style.display = 'none'
        this._loadBuybackRequests()
      } else {
        toast(res.error, 'error')
      }
    })
  },

  /** 拒绝回收 */
  _rejectBuyback(id) {
    d2Confirm('确认拒绝该回收申请？', async () => {
      const res = await API.adminProcessBuyback(id, { action: 'reject' })
      if (res.success) {
        toast('已拒绝该申请', 'success')
        $('#buyback-detail-modal').style.display = 'none'
        this._loadBuybackRequests()
      } else {
        toast(res.error, 'error')
      }
    }, true)
  },

  /** 加载物品列表（GM） */
  async _loadAdminListings() {
    const el = $('#admin-listing-list')
    if (!el) return
    const status = $('#listing-status-filter').value || undefined
    const search = $('#listing-search').value.trim() || undefined
    const seller = $('#listing-seller').value.trim() || undefined
    const res = await API.adminListings({
      status,
      search,
      seller,
      page: this._listingPage,
      pageSize: this._listingPageSize,
    })
    if (!res.success) { el.innerHTML = `<div class="text-red">${esc(res.error)}</div>`; $('#listing-pagination').innerHTML = ''; return }

    if (res.data.length === 0) {
      el.innerHTML = '<div class="text-dim" style="text-align:center;padding:2rem;">暂无物品</div>'
      $('#listing-pagination').innerHTML = ''
      return
    }

    const statusBadge = {
      active: '<span class="d2-badge d2-badge-green">在售</span>',
      sold: '<span class="d2-badge d2-badge-gold">已售</span>',
      cancelled: '<span class="d2-badge d2-badge-red">已下架</span>',
    }

    el.innerHTML = `
      <table class="d2-table">
        <thead><tr><th>ID</th><th>物品</th><th>卖家</th><th>数量</th><th>价格</th><th>状态</th><th>发布时间</th><th>操作</th></tr></thead>
        <tbody>
          ${res.data.map(l => `
            <tr>
              <td>#${l.id}</td>
              <td>${esc(l.item_name)}</td>
              <td>${esc(l.seller_name)}${l.seller_qq ? ` <span class="d2-qq">QQ:${esc(l.seller_qq)}</span>` : ''}</td>
              <td style="text-align:center;">x${l.quantity ?? 1}</td>
              <td class="text-gold">${l.price}</td>
              <td>${statusBadge[l.status] || esc(l.status)}</td>
              <td style="font-size:0.8rem;">${fmtTime(l.created_at)}</td>
              <td>${l.status === 'active'
                ? `<button class="d2-btn d2-btn-sm d2-btn-danger" onclick="AdminPage._cancelListing(${l.id})">下架</button>`
                : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`

    this._renderListingPagination(res.total)
  },

  _renderListingPagination(total) {
    const totalPages = Math.ceil(total / this._listingPageSize)
    const pg = $('#listing-pagination')
    if (!pg) return
    if (totalPages <= 1) { pg.innerHTML = ''; return }
    let html = ''
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="${i === this._listingPage ? 'active' : ''}" onclick="AdminPage._goListingPage(${i})">${i}</button>`
    }
    pg.innerHTML = html
  },

  _goListingPage(p) { this._listingPage = p; this._loadAdminListings() },

  /** GM 下架物品 */
  _cancelListing(id) {
    d2Confirm('确认下架该物品？\n下架后物品将从市场移除，但记录保留。', async () => {
      const res = await API.adminCancelListing(id)
      if (res.success) { toast('已下架', 'success'); this._loadAdminListings() }
      else toast(res.error, 'error')
    }, true)
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
              <td>${esc(tx.buyer_name || '-')}${tx.buyer_qq ? ` <span class="d2-qq">QQ:${esc(tx.buyer_qq)}</span>` : ''}</td>
              <td>${esc(tx.seller_name || '-')}${tx.seller_qq ? ` <span class="d2-qq">QQ:${esc(tx.seller_qq)}</span>` : ''}</td>
              <td>${esc(tx.gm_name || '-')}${tx.gm_qq ? ` <span class="d2-qq">QQ:${esc(tx.gm_qq)}</span>` : ''}</td>
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
