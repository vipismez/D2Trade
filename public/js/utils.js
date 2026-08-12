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
