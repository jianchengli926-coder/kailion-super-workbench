/**
 * 锴利超级AI工作台 - 登录验证（旗舰版 v3.0）
 * KaiLionCrafts Premium Login System
 *
 * 功能：
 *   - 6位数字 PIN 键盘输入（密码 441723）
 *   - 动态粒子背景 + 玻璃拟态卡片
 *   - 5次失败锁定60秒，锁定状态跨刷新持久化
 *   - 会话超时自动登出（默认30分钟无操作）
 *   - 密码输入点阵可视化
 *   - 防重复提交、防暴力破解
 *   - 前端密码仅为界面锁屏，公网部署需启用 ACCESS_TOKEN
 */

(function() {
  'use strict';

  const CONFIG = {
    password: '441723',
    storageKey: 'kailion_workbench_logged_in',
    lockKey: 'kailion_workbench_lockout',
    attemptsKey: 'kailion_workbench_attempts',
    lastActivityKey: 'kailion_workbench_last_activity',
    maxAttempts: 5,
    lockoutTime: 60000,
    sessionTimeout: 30 * 60 * 1000,
    pinLength: 6
  };

  let lockCountdownTimer = null;
  let isSubmitting = false;
  let currentPin = '';
  let activityTimer = null;
  // v2.14.2: store particle handles for cleanup
  let particleResizeHandler = null;
  let particleAnimId = null;

  /* ---------- Storage helpers ---------- */
  function ssGet(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function ssSet(key, val) {
    try { sessionStorage.setItem(key, val); } catch (e) {}
  }
  function ssRemove(key) {
    try { sessionStorage.removeItem(key); } catch (e) {}
  }

  /* ---------- Auth state ---------- */
  function isLoggedIn() {
    return ssGet(CONFIG.storageKey) === 'true';
  }
  function setLoggedIn() {
    ssSet(CONFIG.storageKey, 'true');
    updateLastActivity();
    startActivityMonitor();
  }
  function logout() {
    ssRemove(CONFIG.storageKey);
    stopActivityMonitor();
    currentPin = '';
    showLogin();
  }

  /* ---------- Session timeout ---------- */
  function updateLastActivity() {
    ssSet(CONFIG.lastActivityKey, String(Date.now()));
  }
  function checkSessionTimeout() {
    const last = parseInt(ssGet(CONFIG.lastActivityKey) || '0', 10);
    if (last && Date.now() - last > CONFIG.sessionTimeout) {
      logout();
      showError('会话已超时，请重新登录');
      return true;
    }
    return false;
  }
  function startActivityMonitor() {
    stopActivityMonitor();
    const events = ['click', 'keydown', 'scroll', 'touchstart'];
    events.forEach(ev => document.addEventListener(ev, updateLastActivity, { passive: true }));
    activityTimer = setInterval(checkSessionTimeout, 60000);
  }
  function stopActivityMonitor() {
    if (activityTimer) { clearInterval(activityTimer); activityTimer = null; }
    // v2.14.2: remove activity event listeners to prevent memory leaks
    const events = ['click', 'keydown', 'scroll', 'touchstart'];
    events.forEach(ev => document.removeEventListener(ev, updateLastActivity));
  }

  /* ---------- Password verification ---------- */
  function verifyPassword(input) {
    return input === CONFIG.password;
  }

  /* ---------- Attempt tracking ---------- */
  function getAttempts() {
    const v = parseInt(ssGet(CONFIG.attemptsKey) || '0', 10);
    return isNaN(v) ? 0 : v;
  }
  function setAttempts(n) { ssSet(CONFIG.attemptsKey, String(n)); }
  function getLockUntil() {
    const v = parseInt(ssGet(CONFIG.lockKey) || '0', 10);
    return isNaN(v) ? 0 : v;
  }
  function setLockUntil(ts) { ssSet(CONFIG.lockKey, String(ts)); }
  function clearLock() { ssRemove(CONFIG.lockKey); ssRemove(CONFIG.attemptsKey); }
  function isLocked() { return getLockUntil() > Date.now(); }

  /* ---------- PIN dot rendering ---------- */
  function renderPinDots() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, i) => {
      if (i < currentPin.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
  }

  function appendPinDigit(digit) {
    if (isLocked() || isSubmitting) return;
    if (currentPin.length >= CONFIG.pinLength) return;
    currentPin += digit;
    renderPinDots();
    hideError();
    if (currentPin.length === CONFIG.pinLength) {
      setTimeout(handleLogin, 150);
    }
  }

  function clearPin() {
    currentPin = '';
    renderPinDots();
  }

  function backspacePin() {
    currentPin = currentPin.slice(0, -1);
    renderPinDots();
  }

  /* ---------- Lock countdown ---------- */
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
        setKeypadEnabled(true);
        return;
      }
      if (countdownEl) {
        countdownEl.textContent = `🔒 安全锁定中，${remaining} 秒后自动解锁`;
        countdownEl.style.display = 'block';
      }
    };
    update();
    lockCountdownTimer = setInterval(update, 1000);
  }
  function stopLockCountdown() {
    if (lockCountdownTimer) { clearInterval(lockCountdownTimer); lockCountdownTimer = null; }
  }

  function setButtonLocked(locked) {
    const btn = document.getElementById('login-button');
    if (btn) btn.classList.toggle('locked', locked);
  }
  function setKeypadEnabled(enabled) {
    const keys = document.querySelectorAll('.pin-key');
    keys.forEach(k => {
      if (enabled) k.removeAttribute('disabled');
      else k.setAttribute('disabled', 'true');
    });
  }

  /* ---------- Login flow ---------- */
  function handleLogin() {
    if (isSubmitting) return;
    if (isLocked()) {
      showError('尝试次数过多，请稍后再试');
      return;
    }
    if (currentPin.length < CONFIG.pinLength) {
      showError('请输入6位访问密码');
      return;
    }

    isSubmitting = true;
    const btn = document.getElementById('login-button');
    if (btn) btn.classList.add('loading');

    if (verifyPassword(currentPin)) {
      clearLock();
      setLoggedIn();
      hideError();
      if (btn) btn.classList.remove('loading');
      isSubmitting = false;
      hideLogin();
    } else {
      const attempts = getAttempts() + 1;
      setAttempts(attempts);
      const remaining = CONFIG.maxAttempts - attempts;

      if (remaining <= 0) {
        setLockUntil(Date.now() + CONFIG.lockoutTime);
        setButtonLocked(true);
        setKeypadEnabled(false);
        showError('⚠️ 尝试次数过多，已锁定60秒');
        startLockCountdown();
      } else {
        showError(`❌ 密码错误，还剩 ${remaining} 次机会`);
      }

      // Shake animation on dots
      const dotsContainer = document.querySelector('.pin-dots');
      if (dotsContainer) {
        dotsContainer.classList.add('shake');
        setTimeout(() => dotsContainer.classList.remove('shake'), 500);
      }

      setTimeout(() => {
        clearPin();
        if (btn) btn.classList.remove('loading');
        isSubmitting = false;
      }, 300);
    }
  }

  /* ---------- Error display ---------- */
  function showError(message) {
    const errorEl = document.getElementById('login-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('show');
    }
  }
  function hideError() {
    const errorEl = document.getElementById('login-error');
    if (errorEl) errorEl.classList.remove('show');
  }

  /* ---------- Show/hide login ---------- */
  function showLogin() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      clearPin();
      if (isLocked()) {
        setButtonLocked(true);
        setKeypadEnabled(false);
        const errorEl = document.getElementById('login-error');
        if (errorEl) {
          errorEl.textContent = '尝试次数过多，请稍后再试';
          errorEl.classList.add('show');
        }
        startLockCountdown();
      } else {
        clearLock();
        setButtonLocked(false);
        setKeypadEnabled(true);
      }
    }
  }

  function hideLogin() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.classList.add('hidden');
    stopLockCountdown();
    stopParticles(); // v2.14.2: stop particle animation on unlock
  }

  /* ---------- Particle background ---------- */
  function initParticles() {
    const canvas = document.getElementById('login-particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    // v2.14.2: store handler reference so it can be removed later
    particleResizeHandler = resize;
    window.addEventListener('resize', resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 0.5,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.5 + 0.2
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${p.opacity})`;
        ctx.fill();
      });
      // Connect nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(212, 175, 55, ${0.15 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      particleAnimId = requestAnimationFrame(draw);
    }
    draw();
  }

  // v2.14.2: stop particle animation and remove resize listener on unlock
  function stopParticles() {
    if (particleAnimId) {
      cancelAnimationFrame(particleAnimId);
      particleAnimId = null;
    }
    if (particleResizeHandler) {
      window.removeEventListener('resize', particleResizeHandler);
      particleResizeHandler = null;
    }
  }

  /* ---------- Build login UI ---------- */
  function initLogin() {
    const overlay = document.createElement('div');
    overlay.id = 'login-overlay';
    overlay.innerHTML = `
      <canvas id="login-particles"></canvas>
      <div class="login-bg-decoration"></div>
      <div class="login-container">
        <div class="login-brand">
          <div class="login-logo-ring">
            <div class="login-logo-inner">
              <span class="login-logo-text">锴</span>
            </div>
          </div>
          <h1 class="login-company-name">KaiLionCrafts</h1>
          <p class="login-company-subtitle">YANGJIANG HARDWARE · EST. 2026</p>
        </div>
        <h2 class="login-title">锴利超级AI工作台</h2>
        <p class="login-subtitle">企业级 AI 内容创作平台 · 安全访问</p>

        <div class="pin-dots" id="pin-dots">
          <span class="pin-dot"></span>
          <span class="pin-dot"></span>
          <span class="pin-dot"></span>
          <span class="pin-dot"></span>
          <span class="pin-dot"></span>
          <span class="pin-dot"></span>
        </div>

        <div class="pin-keypad" id="pin-keypad">
          <button class="pin-key" data-digit="1">1<span class="pin-key-sub"></span></button>
          <button class="pin-key" data-digit="2">2<span class="pin-key-sub">ABC</span></button>
          <button class="pin-key" data-digit="3">3<span class="pin-key-sub">DEF</span></button>
          <button class="pin-key" data-digit="4">4<span class="pin-key-sub">GHI</span></button>
          <button class="pin-key" data-digit="5">5<span class="pin-key-sub">JKL</span></button>
          <button class="pin-key" data-digit="6">6<span class="pin-key-sub">MNO</span></button>
          <button class="pin-key" data-digit="7">7<span class="pin-key-sub">PQRS</span></button>
          <button class="pin-key" data-digit="8">8<span class="pin-key-sub">TUV</span></button>
          <button class="pin-key" data-digit="9">9<span class="pin-key-sub">WXYZ</span></button>
          <button class="pin-key pin-key-empty" disabled></button>
          <button class="pin-key" data-digit="0">0<span class="pin-key-sub"></span></button>
          <button class="pin-key pin-key-backspace" id="pin-backspace" title="删除">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
              <line x1="18" y1="9" x2="12" y2="15"/>
              <line x1="12" y1="9" x2="18" y2="15"/>
            </svg>
          </button>
        </div>

        <div id="login-countdown" class="login-countdown"></div>
        <button id="login-button" class="login-button" style="display:none;">
          <span class="login-button-text">进 入 工 作 台</span>
          <span class="login-button-spinner"></span>
        </button>
        <div id="login-error" class="login-error"></div>

        <div class="login-security-notice">
          <span class="login-security-icon">🔒</span>
          本页面为本地界面锁屏 · 公网部署请启用服务端 ACCESS_TOKEN
          <span class="login-version">v2.14.2</span>
        </div>
        <div class="login-footer">
          © 2026 KaiLionCrafts · 阳江市锴利国际贸易有限公司
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Bind keypad
    overlay.querySelectorAll('.pin-key[data-digit]').forEach(key => {
      key.addEventListener('click', () => appendPinDigit(key.dataset.digit));
    });
    const backspace = document.getElementById('pin-backspace');
    if (backspace) backspace.addEventListener('click', backspacePin);

    // Keyboard support
    document.addEventListener('keydown', (e) => {
      if (document.getElementById('login-overlay').classList.contains('hidden')) return;
      if (/^[0-9]$/.test(e.key)) {
        appendPinDigit(e.key);
      } else if (e.key === 'Backspace') {
        backspacePin();
      } else if (e.key === 'Enter' && currentPin.length === CONFIG.pinLength) {
        handleLogin();
      }
    });

    // Init particles
    initParticles();

    // Check session
    if (isLoggedIn()) {
      if (checkSessionTimeout()) return;
      hideLogin();
      startActivityMonitor();
    } else {
      showLogin();
    }
  }

  /* ---------- Global API ---------- */
  window.KailionLogin = {
    logout: logout,
    isLoggedIn: isLoggedIn,
    showLogin: showLogin,
    refreshSession: updateLastActivity
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogin);
  } else {
    initLogin();
  }
})();
