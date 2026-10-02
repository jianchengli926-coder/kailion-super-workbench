/**
 * 锴利超级AI工作台 - 登录验证（增强版）
 * KaiLionCrafts 品牌登录系统
 *
 * 功能：
 *   - 密码验证（密码在 CONFIG.password 中设置）
 *   - 登录状态存储（sessionStorage，关闭浏览器后失效）
 *   - 5次失败锁定，锁定状态持久化到sessionStorage（跨刷新）
 *   - 锁定倒计时实时显示
 *   - 密码显示/隐藏切换
 *   - 防重复提交（提交中按钮禁用）
 *   - 前端密码仅为界面锁屏机制，不是企业级认证
 *
 * 安全声明：本登录页为本地界面锁屏，公网/局域网部署必须使用服务端 ACCESS_TOKEN。
 */

(function() {
  'use strict';

  // 配置
  const CONFIG = {
    password: '441723',
    storageKey: 'kailion_workbench_logged_in',
    lockKey: 'kailion_workbench_lockout',
    attemptsKey: 'kailion_workbench_attempts',
    maxAttempts: 5,
    lockoutTime: 60000 // 锁定1分钟
  };

  let lockCountdownTimer = null;
  let isSubmitting = false;

  /**
   * 安全读取 sessionStorage
   */
  function ssGet(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function ssSet(key, val) {
    try { sessionStorage.setItem(key, val); } catch (e) {}
  }
  function ssRemove(key) {
    try { sessionStorage.removeItem(key); } catch (e) {}
  }

  /**
   * 检查是否已登录
   */
  function isLoggedIn() {
    return ssGet(CONFIG.storageKey) === 'true';
  }

  /**
   * 设置登录状态
   */
  function setLoggedIn() {
    ssSet(CONFIG.storageKey, 'true');
  }

  /**
   * 清除登录状态（退出登录）
   */
  function logout() {
    ssRemove(CONFIG.storageKey);
    showLogin();
  }

  /**
   * 验证密码（常量比对，不输出到控制台）
   */
  function verifyPassword(input) {
    return input === CONFIG.password;
  }

  /**
   * 获取当前失败次数
   */
  function getAttempts() {
    const v = parseInt(ssGet(CONFIG.attemptsKey) || '0', 10);
    return isNaN(v) ? 0 : v;
  }
  function setAttempts(n) {
    ssSet(CONFIG.attemptsKey, String(n));
  }

  /**
   * 获取锁定到期时间戳
   */
  function getLockUntil() {
    const v = parseInt(ssGet(CONFIG.lockKey) || '0', 10);
    return isNaN(v) ? 0 : v;
  }
  function setLockUntil(ts) {
    ssSet(CONFIG.lockKey, String(ts));
  }
  function clearLock() {
    ssRemove(CONFIG.lockKey);
    ssRemove(CONFIG.attemptsKey);
  }

  /**
   * 是否处于锁定状态
   */
  function isLocked() {
    return getLockUntil() > Date.now();
  }

  /**
   * 启动锁定倒计时
   */
  function startLockCountdown() {
    stopLockCountdown();
    const update = () => {
      const remaining = Math.max(0, Math.ceil((getLockUntil() - Date.now()) / 1000));
      const countdownEl = document.getElementById('login-countdown');
      const errorEl = document.getElementById('login-error');
      if (remaining <= 0) {
        stopLockCountdown();
        clearLock();
        if (countdownEl) countdownEl.style.display = 'none';
        if (errorEl) {
          errorEl.textContent = '锁定已解除，请重新输入密码';
          errorEl.classList.add('show');
        }
        setButtonLocked(false);
        return;
      }
      if (countdownEl) {
        countdownEl.textContent = `锁定中，${remaining} 秒后自动解锁`;
        countdownEl.style.display = 'block';
      }
    };
    update();
    lockCountdownTimer = setInterval(update, 1000);
  }

  function stopLockCountdown() {
    if (lockCountdownTimer) {
      clearInterval(lockCountdownTimer);
      lockCountdownTimer = null;
    }
  }

  /**
   * 设置按钮锁定/可用状态
   */
  function setButtonLocked(locked) {
    const btn = document.getElementById('login-button');
    const toggle = document.getElementById('login-toggle-visibility');
    if (btn) {
      // 锁定时不禁用按钮和输入框（保持可交互，handleLogin内部会拦截并显示错误）
      btn.classList.toggle('locked', locked);
    }
    if (toggle) toggle.style.display = locked ? 'none' : '';
  }

  /**
   * 显示登录页面
   */
  function showLogin() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      const input = document.getElementById('login-password');
      if (input) {
        input.value = '';
        input.type = 'password';
        setTimeout(() => input.focus(), 100);
      }
      // 恢复锁定状态（跨刷新）
      if (isLocked()) {
        setButtonLocked(true);
        const errorEl = document.getElementById('login-error');
        if (errorEl) {
          errorEl.textContent = '尝试次数过多，请稍后再试';
          errorEl.classList.add('show');
        }
        startLockCountdown();
      } else {
        clearLock();
        setButtonLocked(false);
      }
    }
  }

  /**
   * 隐藏登录页面，进入工作台
   */
  function hideLogin() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
    stopLockCountdown();
  }

  /**
   * 显示错误信息
   */
  function showError(message) {
    const errorEl = document.getElementById('login-error');
    const inputEl = document.getElementById('login-password');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('show');
    }
    if (inputEl) {
      inputEl.classList.add('error');
      setTimeout(() => inputEl.classList.remove('error'), 500);
    }
  }

  /**
   * 隐藏错误信息
   */
  function hideError() {
    const errorEl = document.getElementById('login-error');
    if (errorEl) errorEl.classList.remove('show');
  }

  /**
   * 处理登录提交
   */
  function handleLogin() {
    // 防重复提交
    if (isSubmitting) return;

    // 锁定状态检查
    if (isLocked()) {
      showError('尝试次数过多，请稍后再试');
      return;
    }

    const input = document.getElementById('login-password');
    const password = input ? input.value.trim() : '';

    if (!password) {
      showError('请输入访问密码');
      return;
    }

    // 提交中状态（短暂loading动画，不阻塞快速连续提交）
    isSubmitting = true;
    const btn = document.getElementById('login-button');
    if (btn) btn.classList.add('loading');

    // 同步验证（本地密码比对，无需延迟）
    if (verifyPassword(password)) {
      // 登录成功
      clearLock();
      setLoggedIn();
      hideError();
      if (input) input.value = '';
      if (btn) btn.classList.remove('loading');
      isSubmitting = false;
      hideLogin();
    } else {
      // 登录失败
      const attempts = getAttempts() + 1;
      setAttempts(attempts);
      const remaining = CONFIG.maxAttempts - attempts;

      if (remaining <= 0) {
        // 锁定
        setLockUntil(Date.now() + CONFIG.lockoutTime);
        setButtonLocked(true);
        showError('尝试次数过多，请1分钟后再试');
        startLockCountdown();
      } else {
        showError(`密码错误，还剩 ${remaining} 次机会`);
      }

      // 清空输入并聚焦
      if (input) {
        input.value = '';
        input.focus();
      }
      if (btn) btn.classList.remove('loading');
      isSubmitting = false;
    }
  }

  /**
   * 切换密码显示/隐藏
   */
  function togglePasswordVisibility() {
    const input = document.getElementById('login-password');
    const toggle = document.getElementById('login-toggle-visibility');
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (toggle) toggle.textContent = '🙈';
    } else {
      input.type = 'password';
      if (toggle) toggle.textContent = '👁';
    }
  }

  /**
   * 初始化登录页面
   */
  function initLogin() {
    // 创建登录遮罩层
    const overlay = document.createElement('div');
    overlay.id = 'login-overlay';
    overlay.innerHTML = `
      <div class="login-bg-decoration"></div>
      <div class="login-container">
        <div class="login-brand">
          <img src="assets/images/kailioncrafts-logo.png" alt="KaiLionCrafts Logo" class="login-logo" onerror="this.style.display='none'">
          <h1 class="login-company-name">KaiLionCrafts</h1>
          <p class="login-company-subtitle">YANGJIANG HARDWARE</p>
        </div>
        <h2 class="login-title">锴利超级AI工作台</h2>
        <p class="login-subtitle">企业级 AI 内容创作平台</p>
        <div class="login-input-wrapper">
          <input type="password" id="login-password" class="login-input"
                 placeholder="请输入访问密码" autocomplete="off" maxlength="20" spellcheck="false">
          <button type="button" id="login-toggle-visibility" class="login-toggle-visibility" title="显示/隐藏密码">👁</button>
        </div>
        <div id="login-countdown" class="login-countdown"></div>
        <button id="login-button" class="login-button">
          <span class="login-button-text">进 入 工 作 台</span>
          <span class="login-button-spinner"></span>
        </button>
        <div id="login-error" class="login-error"></div>
        <div class="login-security-notice">
          <span class="login-security-icon">🔒</span>
          本页面为本地界面锁屏机制，非企业级认证；公网/局域网部署请启用服务端 ACCESS_TOKEN
        </div>
        <div class="login-footer">
          © 2026 KaiLionCrafts · 阳江市锴利国际贸易有限公司
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // 绑定事件
    const button = document.getElementById('login-button');
    const input = document.getElementById('login-password');
    const toggle = document.getElementById('login-toggle-visibility');

    if (button) {
      button.addEventListener('click', handleLogin);
    }

    if (input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleLogin();
        }
      });
      input.addEventListener('input', hideError);
    }

    if (toggle) {
      toggle.addEventListener('click', togglePasswordVisibility);
    }

    // 检查登录状态
    if (isLoggedIn()) {
      hideLogin();
    } else {
      showLogin();
    }
  }

  // 暴露退出登录方法到全局
  window.KailionLogin = {
    logout: logout,
    isLoggedIn: isLoggedIn,
    showLogin: showLogin
  };

  // DOM加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogin);
  } else {
    initLogin();
  }
})();
