/**
 * D2Trade — 交易记录页
 */

const TransactionsPage = {
  _page: 1,

  render() {
    return `
      <div class="d2-flex-between d2-mb-2">
        <h2 class="d2-title" style="margin-bottom:0;text-align:left;">交易记录</h2>
        <button class="d2-btn" onclick="App.route('market')">← 返回市场</button>
      </div>
      <div id="tx-list">
        <div class="text-dim" style="text-align:center;padding:3rem;">加载中...</div>
      </div>
      <div class="d2-pagination" id="tx-pagination"></div>`
  },

  async mount() {
    if (!Auth.loggedIn) { App.route('login'); return }
    this._page = 1
    await this._load()
  },

  async _load() {
    const el = $('#tx-list')
    const res = await API.myTransactions({ page: this._page, pageSize: 20 })

    if (!res.success) { el.innerHTML = `<div class="text-red">${esc(res.error)}</div>`; return }

    if (res.data.length === 0) {
      el.innerHTML = '<div class="text-dim" style="text-align:center;padding:3rem;">暂无交易记录</div>'
      $('#tx-pagination').innerHTML = ''
      return
    }

    el.innerHTML = `
      <table class="d2-table">
        <thead>
          <tr><th>类型</th><th>装备</th><th>对方</th><th>金额</th><th>状态</th><th>时间</th></tr>
        </thead>
        <tbody>
          ${res.data.map(tx => {
            const isBuyer = tx.buyer_id === Auth.user?.id
            const otherName = isBuyer ? tx.seller_name : tx.buyer_name
            const amountSign = tx.type === 'grant' || tx.type === 'buyback' || (tx.type === 'trade' && !isBuyer) || (tx.type === 'rollback' && isBuyer) ? '+' : '-'
            return `
              <tr>
                <td><span class="d2-badge d2-badge-${txTypeClass(tx.type)}">${txTypeLabel(tx.type)}</span></td>
                <td>${esc(tx.item_name || '-')}</td>
                <td>${esc(otherName || tx.gm_name || '-')}</td>
                <td class="${amountSign === '+' ? 'text-green' : 'text-red'}">${amountSign}${tx.amount}</td>
                <td>${tx.status === 'rolled_back' ? '<span class="d2-badge d2-badge-red">已回退</span>' : '<span class="d2-badge d2-badge-green">完成</span>'}</td>
                <td style="font-size:0.8rem;">${fmtTime(tx.created_at)}</td>
              </tr>`
          }).join('')}
        </tbody>
      </table>`

    this._renderPagination(res.total)
  },

  _renderPagination(total) {
    const totalPages = Math.ceil(total / 20)
    const pg = $('#tx-pagination')
    if (totalPages <= 1) { pg.innerHTML = ''; return }
    let html = ''
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="${i === this._page ? 'active' : ''}" onclick="TransactionsPage._goPage(${i})">${i}</button>`
    }
    pg.innerHTML = html
  },

  _goPage(p) { this._page = p; this._load() },
}
