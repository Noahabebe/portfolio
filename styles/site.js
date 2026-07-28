/* =====================================================================
   Noah Abebe — Portfolio interactions
   - scroll progress + reveal animations
   - mobile nav toggle
   - robot scroll companion
   - "Bolt Runner" robotics mini-game on page transitions
   ===================================================================== */
(function () {
  'use strict';

  /* ---------------- Scroll progress + reveal ---------------- */
  var progress = document.getElementById('scrollProgress');
  function onScroll() {
    if (progress) {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      progress.style.width = pct + '%';
    }
    // robot reacts to scroll
    if (buddyWheels) {
      buddyWheels.style.transform = 'rotate(' + (window.scrollY * 0.6) + 'deg)';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('show'); revealObserver.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el, i) {
    el.style.transitionDelay = (Math.min(i % 4, 3) * 0.08) + 's';
    revealObserver.observe(el);
  });

  /* ---------------- Mobile nav ---------------- */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () { links.classList.toggle('open'); });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('open'); });
    });
  }

  /* ---------------- Robot scroll companion ---------------- */
  var buddyWheels = null;
  (function robot() {
    var b = document.createElement('div');
    b.id = 'robotBuddy';
    b.setAttribute('aria-label', 'Play the robotics mini-game');
    b.setAttribute('role', 'button');
    b.innerHTML =
      '<div class="speech">play</div>' +
      '<svg class="bob" viewBox="0 0 74 82" width="74" height="82" xmlns="http://www.w3.org/2000/svg">' +
        // antenna
        '<line x1="37" y1="6" x2="37" y2="16" stroke="#3f4cc4" stroke-width="3" stroke-linecap="round"/>' +
        '<circle cx="37" cy="5" r="4" fill="#3f4cc4"><animate attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite"/></circle>' +
        // head
        '<rect x="15" y="16" width="44" height="34" rx="12" fill="#23252b"/>' +
        '<rect x="21" y="24" width="32" height="18" rx="9" fill="#f5f3ee"/>' +
        // eyes
        '<circle class="eyeL" cx="31" cy="33" r="3.6" fill="#23252b"/>' +
        '<circle class="eyeR" cx="43" cy="33" r="3.6" fill="#23252b"/>' +
        // body
        '<rect x="20" y="50" width="34" height="18" rx="8" fill="#c9c3b6"/>' +
        '<circle cx="37" cy="59" r="4" fill="#3f4cc4"/>' +
        // wheels
        '<g class="wheels">' +
          '<circle cx="26" cy="70" r="6" fill="#23252b"/><circle cx="26" cy="70" r="2" fill="#f5f3ee"/>' +
          '<circle cx="48" cy="70" r="6" fill="#23252b"/><circle cx="48" cy="70" r="2" fill="#f5f3ee"/>' +
        '</g>' +
      '</svg>';
    document.body.appendChild(b);
    buddyWheels = b.querySelector('.wheels');
    b.classList.add('talk');
    setTimeout(function () { b.classList.remove('talk'); }, 3800);
    b.addEventListener('mouseenter', function () { b.classList.add('talk'); });
    b.addEventListener('mouseleave', function () { b.classList.remove('talk'); });
    b.addEventListener('click', function () { Game.open(null, 'freeplay'); });
  })();

  /* =====================================================================
     Bolt Runner — a tiny robotics endless-runner
     Plays as a page-transition loader (auto-advances) or free-play.
     Controls: Space / tap / click to hop. Collect ⚙ bolts, dodge 🚧.
     ===================================================================== */
  var Game = (function () {
    var overlay, canvas, ctx, scoreEl, loadFill, titleEl, hintEl, skipBtn;
    var raf = null, running = false, mode = 'transition', destination = null;
    var W = 600, H = 190, DPR = 1;
    var robot, obstacles, bolts, score, speed, spawnT, boltT, groundY, startTime, minMs;
    var closing = false;

    function build() {
      overlay = document.createElement('div');
      overlay.id = 'gameOverlay';
      overlay.innerHTML =
        '<div class="game-shell">' +
          '<div class="game-head">' +
            '<div class="g-title">Bolt Runner</div>' +
            '<div class="g-score">gears <b id="gScore">0</b></div>' +
          '</div>' +
          '<canvas id="gameCanvas"></canvas>' +
          '<div class="game-foot">' +
            '<span class="game-hint" id="gHint">Press Space / tap to hop</span>' +
            '<div class="loadbar"><i id="gLoad"></i></div>' +
            '<button class="game-skip" id="gSkip">Skip →</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);
      canvas = overlay.querySelector('#gameCanvas');
      ctx = canvas.getContext('2d');
      scoreEl = overlay.querySelector('#gScore');
      loadFill = overlay.querySelector('#gLoad');
      titleEl = overlay.querySelector('.g-title');
      hintEl = overlay.querySelector('#gHint');
      skipBtn = overlay.querySelector('#gSkip');

      skipBtn.addEventListener('click', finish);
      canvas.addEventListener('mousedown', hop);
      canvas.addEventListener('touchstart', function (e) { e.preventDefault(); hop(); }, { passive: false });
      window.addEventListener('keydown', function (e) {
        if (!running) return;
        if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); hop(); }
        if (e.code === 'Escape') finish();
      });
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      var rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      groundY = H - 30;
    }

    function reset() {
      robot = { x: 62, y: 0, vy: 0, r: 16, onGround: true, blink: 0 };
      obstacles = []; bolts = [];
      score = 0; speed = 3.4; spawnT = 40; boltT = 26;
      robot.y = groundY - robot.r;
      if (scoreEl) scoreEl.textContent = '0';
    }

    function hop() {
      if (robot && robot.onGround) { robot.vy = -8.6; robot.onGround = false; }
    }

    function spawnObstacle() {
      var hgt = 18 + Math.random() * 18;
      obstacles.push({ x: W + 20, w: 16 + Math.random() * 10, h: hgt });
    }
    function spawnBolt() {
      var hover = groundY - (30 + Math.random() * 60);
      bolts.push({ x: W + 20, y: hover, r: 9, spin: 0, got: false });
    }

    function step() {
      ctx.clearRect(0, 0, W, H);

      // ground line
      ctx.strokeStyle = 'rgba(35,37,43,0.28)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
      // dashed circuitry on ground
      ctx.strokeStyle = 'rgba(63,76,196,0.3)';
      ctx.setLineDash([5, 11]);
      ctx.beginPath(); ctx.moveTo(0, groundY + 7); ctx.lineTo(W, groundY + 7); ctx.stroke();
      ctx.setLineDash([]);

      // physics
      robot.vy += 0.5; robot.y += robot.vy;
      if (robot.y >= groundY - robot.r) { robot.y = groundY - robot.r; robot.vy = 0; robot.onGround = true; }

      // spawns
      if (--spawnT <= 0) { spawnObstacle(); spawnT = Math.max(58 - score * 0.4, 34) + Math.random() * 30; }
      if (--boltT <= 0) { spawnBolt(); boltT = 40 + Math.random() * 40; }

      speed += 0.0009;

      // obstacles
      ctx.fillStyle = '#b4533a';
      for (var i = obstacles.length - 1; i >= 0; i--) {
        var o = obstacles[i]; o.x -= speed;
        // draw hazard block
        roundRect(o.x, groundY - o.h, o.w, o.h, 3);
        ctx.fillStyle = '#b4533a'; ctx.fill();
        // stripe
        ctx.fillStyle = 'rgba(245,243,238,0.7)';
        ctx.fillRect(o.x, groundY - o.h * 0.55, o.w, 2.5);
        ctx.fillStyle = '#b4533a';
        // collision
        if (robot.x + robot.r > o.x && robot.x - robot.r < o.x + o.w && robot.y + robot.r > groundY - o.h) {
          bump();
        }
        if (o.x + o.w < -10) obstacles.splice(i, 1);
      }

      // bolts (gears)
      for (var j = bolts.length - 1; j >= 0; j--) {
        var g = bolts[j]; g.x -= speed; g.spin += 0.15;
        drawGear(g.x, g.y, g.r, g.spin);
        var dx = g.x - robot.x, dy = g.y - robot.y;
        if (Math.sqrt(dx * dx + dy * dy) < g.r + robot.r) {
          score++; if (scoreEl) scoreEl.textContent = score;
          bolts.splice(j, 1); continue;
        }
        if (g.x < -20) bolts.splice(j, 1);
      }

      drawRobot(robot.x, robot.y, robot.r);

      // loader progress in transition mode
      if (mode === 'transition') {
        var pct = Math.min((now() - startTime) / minMs, 1);
        if (loadFill) loadFill.style.width = (pct * 100) + '%';
        if (pct >= 1) { finish(); return; }
      }

      if (running) raf = requestAnimationFrame(step);
    }

    function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

    function bump() {
      // gentle penalty: knock robot back, small score loss, screen shake
      robot.vy = -5; robot.onGround = false;
      score = Math.max(0, score - 1); if (scoreEl) scoreEl.textContent = score;
      overlay.querySelector('.game-shell').animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
        { duration: 220 }
      );
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function drawGear(cx, cy, r, rot) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      ctx.fillStyle = '#3f4cc4';
      var teeth = 8;
      for (var i = 0; i < teeth; i++) {
        ctx.rotate((Math.PI * 2) / teeth);
        ctx.fillRect(-2.2, -r - 3, 4.4, 5);
      }
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f5f3ee'; ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawRobot(cx, cy, r) {
      // shadow
      ctx.fillStyle = 'rgba(40,38,30,0.12)';
      ctx.beginPath(); ctx.ellipse(cx, groundY + 2, r, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(cx, cy);
      // body
      ctx.fillStyle = '#23252b';
      roundRect(-r, -r, r * 2, r * 2, 7); ctx.fill();
      // face plate
      ctx.fillStyle = '#f5f3ee';
      roundRect(-r + 4, -r + 5, r * 2 - 8, r + 2, 5); ctx.fill();
      // eyes
      ctx.fillStyle = '#23252b';
      var blink = (Math.floor(now() / 140) % 24 === 0) ? 1 : 5;
      ctx.beginPath(); ctx.arc(-5, -3, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(3, -3 - blink / 2, 3.2, blink);
      // antenna
      ctx.strokeStyle = '#3f4cc4'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, -r - 6); ctx.stroke();
      ctx.fillStyle = '#3f4cc4'; ctx.beginPath(); ctx.arc(0, -r - 8, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function open(dest, m) {
      if (running) return;
      if (!overlay) build();
      mode = m || 'transition';
      destination = dest;
      closing = false;
      minMs = mode === 'transition' ? 1500 : 999999; // freeplay runs until skip
      overlay.classList.add('active');
      resize(); // must run while overlay is visible so canvas has real dimensions
      startTime = now();
      reset();
      running = true;
      if (mode === 'freeplay') {
        hintEl.textContent = 'Free play — Space / tap to hop, Esc to close';
        loadFill.parentNode.style.display = 'none';
        skipBtn.textContent = 'Close ✕';
      } else {
        hintEl.textContent = 'Loading next page — hop while you wait!';
        loadFill.parentNode.style.display = '';
        skipBtn.textContent = 'Skip →';
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(step);
    }

    function finish() {
      if (closing) return;
      closing = true; running = false;
      cancelAnimationFrame(raf);
      overlay.classList.add('closing');
      setTimeout(function () {
        overlay.classList.remove('active', 'closing');
        if (mode === 'transition' && destination) { window.location.href = destination; }
      }, 320);
    }

    return { open: open };
  })();

  /* ---------------- Wire internal links to the transition game ---------------- */
  function isInternal(href) {
    if (!href) return false;
    if (href.indexOf('#') === 0) return false;
    if (/^(https?:)?\/\//i.test(href)) return false;
    if (/^(mailto:|tel:)/i.test(href)) return false;
    return /\.html?($|\?)/i.test(href) || href === '/' ;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    if (a.hasAttribute('data-no-game')) return;
    if (a.target === '_blank') return;
    var href = a.getAttribute('href');
    if (!isInternal(href)) return;
    e.preventDefault();
    Game.open(href, 'transition');
  });

  /* expose for manual triggers */
  window.BoltRunner = Game;
  onScroll();
})();
