/**
 * D2Trade — DOM 工具函数
 */

const $ = (sel, parent) => (parent || document).querySelector(sel)
const $$ = (sel, parent) => [...(parent || document).querySelectorAll(sel)]

/** Toast 通知 */
function toast(message, type = '') {
  const container = $('#toast-container')
  const el = document.createElement('div')
  el.className = `d2-toast d2-toast-${type}`
  el.textContent = message
  container.appendChild(el)
  setTimeout(() => {
    el.style.opacity = '0'
    el.style.transform = 'translateX(50px)'
    el.style.transition = 'all 0.3s ease'
    setTimeout(() => el.remove(), 300)
  }, 3000)
}

/** HTML 转义 */
function esc(str) {
  const div = document.createElement('div')
  div.textContent = str ?? ''
  return div.innerHTML
}

/** 格式化时间 */
function fmtTime(isoStr) {
  if (!isoStr) return '-'
  const d = new Date(isoStr + 'Z')
  return d.toLocaleString('zh-CN')
}

/** 交易类型文本 */
function txTypeLabel(type) {
  const map = { trade: '交易', buyback: 'GM回收', grant: 'GM发放', rollback: '回退' }
  return map[type] || type
}

/** 交易类型颜色 class */
function txTypeClass(type) {
  const map = { trade: 'gold', buyback: 'blue', grant: 'green', rollback: 'red' }
  return map[type] || ''
}

/** 自定义确认弹窗（替代原生 confirm，避免移动端/浏览器被拦截） */
function d2Confirm(message, onConfirm, danger = false) {
  const modal = document.createElement('div')
  modal.className = 'd2-modal'
  modal.style.display = ''
  modal.style.zIndex = '2000'
  modal.innerHTML = `
    <div class="d2-modal-box" style="max-width:420px;">
      <div class="d2-modal-header">
        <span class="d2-title" style="margin:0;font-size:1.05rem;">⚠️ 确认操作</span>
      </div>
      <div style="padding:1.25rem 1.5rem;">
        <div style="color:var(--d2-text);white-space:pre-line;line-height:1.7;">${esc(message)}</div>
        <div style="display:flex;justify-content:flex-end;gap:0.6rem;margin-top:1.25rem;">
          <button type="button" class="d2-btn" data-d2confirm-cancel>取消</button>
          <button type="button" class="d2-btn ${danger ? 'd2-btn-danger' : 'd2-btn-gold'}" data-d2confirm-ok>确定</button>
        </div>
      </div>
    </div>`
  document.body.appendChild(modal)

  const close = () => modal.remove()
  modal.onclick = (e) => { if (e.target === modal) close() }
  modal.querySelector('[data-d2confirm-cancel]').onclick = close
  modal.querySelector('[data-d2confirm-ok]').onclick = () => { close(); onConfirm() }
}
