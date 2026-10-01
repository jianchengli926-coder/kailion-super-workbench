/**
 * 锴利超级AI工作台 - 登录验证
 * KaiLionCrafts 品牌登录系统
 * 
 * 功能：
 *   - 密码验证（441723）
 *   - 登录状态存储（sessionStorage，关闭浏览器后失效）
 *   - 本地/局域网/公网统一拦截
 *   - 登录成功后显示工作台
 */

(function() {
  'use strict';

  // 配置
  const CONFIG = {
    password: '441723',
    storageKey: 'kailion_workbench_logged_in',
    maxAttempts: 5,
    lockoutTime: 60000 // 锁定1分钟
  };

  // 尝试次数（内存中，刷新后重置）
  let attempts = 0;
  let isLocked = false;

  /**
   * 检查是否已登录
   */
  function isLoggedIn() {
    try {
      return sessionStorage.getItem(CONFIG.storageKey) === 'true';
    } catch (e) {
      return false;
    }
  }

  /**
   * 设置登录状态
   */
  function setLoggedIn() {
    try {
      sessionStorage.setItem(CONFIG.storageKey, 'true');
    } catch (e) {}
  }

  /**
   * 清除登录状态（退出登录）
   */
  function logout() {
    try {
      sessionStorage.removeItem(CONFIG.storageKey);
    } catch (e) {}
    showLogin();
  }

  /**
   * 验证密码
   */
  function verifyPassword(input) {
    return input === CONFIG.password;
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
        setTimeout(() => input.focus(), 100);
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
    if (errorEl) {
      errorEl.classList.remove('show');
    }
  }

  /**
   * 处理登录提交
   */
  function handleLogin() {
    if (isLocked) {
      showError('尝试次数过多，请稍后再试');
      return;
    }

    const input = document.getElementById('login-password');
    const password = input ? input.value.trim() : '';

    if (!password) {
      showError('请输入访问密码');
      return;
    }

    if (verifyPassword(password)) {
      // 登录成功
      attempts = 0;
      setLoggedIn();
      hideError();
      hideLogin();
    } else {
      // 登录失败
      attempts++;
      const remaining = CONFIG.maxAttempts - attempts;
      
      if (remaining <= 0) {
        isLocked = true;
        showError('尝试次数过多，请1分钟后再试');
        setTimeout(() => {
          isLocked = false;
          attempts = 0;
          hideError();
        }, CONFIG.lockoutTime);
      } else {
        showError(`密码错误，还剩 ${remaining} 次机会`);
      }
      
      if (input) {
        input.value = '';
        input.focus();
      }
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
      <div class="login-container">
        <img src="assets/images/kailioncrafts-logo.png" alt="KaiLionCrafts Logo" class="login-logo" onerror="this.style.display='none'">
        <h1 class="login-company-name">KaiLionCrafts</h1>
        <p class="login-company-subtitle">YANGJIANG HARDWARE</p>
        <h2 class="login-title">锴利超级AI工作台</h2>
        <div class="login-input-wrapper">
          <input type="password" id="login-password" class="login-input" 
                 placeholder="请输入访问密码" autocomplete="off" maxlength="20">
        </div>
        <button id="login-button" class="login-button">进 入 工 作 台</button>
        <div id="login-error" class="login-error"></div>
        <div class="login-footer">
          © 2026 KaiLionCrafts · 阳江市锴利国际贸易有限公司
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // 绑定事件
    const button = document.getElementById('login-button');
    const input = document.getElementById('login-password');

    if (button) {
      button.addEventListener('click', handleLogin);
    }

    if (input) {
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          handleLogin();
        }
      });
      input.addEventListener('input', hideError);
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
