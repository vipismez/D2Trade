/**
 * D2Trade — 登录/注册页
 */

const LoginPage = {
  render() {
    return `
      <div class="d2-login-page">
        <div class="d2-login-box d2-panel">
          <h1 class="d2-title">D 2 T R A D E</h1>
          <div class="d2-login-tabs">
            <button class="d2-login-tab active" data-tab="login">登录</button>
            <button class="d2-login-tab" data-tab="register">注册</button>
          </div>
          <div class="d2-login-error" id="login-error"></div>

          <!-- 登录表单 -->
          <form id="login-form">
            <div class="d2-form-group">
              <label class="d2-label">用户名</label>
              <input class="d2-input" name="username" placeholder="请输入用户名" autocomplete="username" />
            </div>
            <div class="d2-form-group">
              <label class="d2-label">密码</label>
              <input class="d2-input" name="password" type="password" placeholder="请输入密码" autocomplete="current-password" />
            </div>
            <button type="submit" class="d2-btn" style="width:100%">进入游戏</button>
          </form>

          <!-- 注册表单 -->
          <form id="register-form" style="display:none">
            <div class="d2-form-group">
              <label class="d2-label">用户名</label>
              <input class="d2-input" name="reg-username" placeholder="3-20 个字符" />
            </div>
            <div class="d2-form-group">
              <label class="d2-label">密码</label>
              <input class="d2-input" name="reg-password" type="password" placeholder="至少 6 位" />
            </div>
            <div class="d2-form-group">
              <label class="d2-label">QQ 号</label>
              <input class="d2-input" name="reg-qq" placeholder="用于联系 GM 审批" />
            </div>
            <button type="submit" class="d2-btn" style="width:100%">注册账号</button>
          </form>
        </div>
      </div>`
  },

  mount() {
    const tabs = $$('.d2-login-tab')
    const loginForm = $('#login-form')
    const regForm = $('#register-form')
    const errEl = $('#login-error')

    tabs.forEach(t => t.onclick = () => {
      tabs.forEach(x => x.classList.remove('active'))
      t.classList.add('active')
      const isLogin = t.dataset.tab === 'login'
      loginForm.style.display = isLogin ? '' : 'none'
      regForm.style.display = isLogin ? 'none' : ''
      errEl.style.display = 'none'
    })

    loginForm.onsubmit = async (e) => {
      e.preventDefault()
      const fd = new FormData(loginForm)
      const res = await Auth.login(fd.get('username'), fd.get('password'))
      if (res.success) {
        App.route('market')
      } else {
        errEl.textContent = res.error
        errEl.style.display = ''
      }
    }

    regForm.onsubmit = async (e) => {
      e.preventDefault()
      const fd = new FormData(regForm)
      const res = await API.register(
        fd.get('reg-username'),
        fd.get('reg-password'),
        fd.get('reg-qq'),
      )
      if (res.success) {
        toast(res.message, 'success')
        tabs[0].click() // 切换到登录
      } else {
        errEl.textContent = res.error
        errEl.style.display = ''
      }
    }
  },
}
