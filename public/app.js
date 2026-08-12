// 检查 Worker API 连接状态
async function checkAPI() {
  const dot = document.querySelector('.dot')!
  const statusText = document.querySelector('.status span:last-child')!

  try {
    const res = await fetch('/api/v1/health')
    const data = await res.json()
    if (data.status === 'ok') {
      dot.classList.add('online')
      statusText.textContent = `API 在线 · ${data.environment}`
    } else {
      statusText.textContent = 'API 异常'
    }
  } catch {
    statusText.textContent = 'API 不可达（请启动 wrangler dev）'
  }
}

checkAPI()
