/* Page wiring: float cards, logo, toggles, GitHub links, blog preview.
   The skills mini-game lives in js/game.js — don't build the hand here. */
(function () {
  'use strict';

  /* =====================================================
     CONFIG — edit me!
     ===================================================== */
  var CONFIG = {
    githubUser: 'Girff',
    // map project ids (the data-github attribute) to repo names
    repos: {
      'spelunking-penguin': 'spelunking-penguin'
    }
  };

  var SFX = window.BalatroCards.SFX;

  /* ---------- free-floating cards ---------- */
  document.querySelectorAll('[data-float-card]').forEach(function (c) {
    window.BalatroCards.makeFloatCard(c);
  });

  /* ---------- bobbing logo letters ---------- */
  var logo = document.getElementById('logo');
  if (logo) {
    var chars = logo.textContent.split('');
    logo.textContent = '';
    chars.forEach(function (ch, i) {
      var span = document.createElement('span');
      span.className = 'lg';
      span.style.setProperty('--i', i);
      span.textContent = ch;
      logo.appendChild(span);
    });
  }

  /* ---------- CRT + SFX toggles ---------- */
  var crtBtn = document.getElementById('crt-toggle');
  var crtOn = localStorage.getItem('crt') !== 'off';

  function applyCrt() {
    document.body.classList.toggle('crt-off', !crtOn);
    if (crtBtn) crtBtn.textContent = 'CRT: ' + (crtOn ? 'ON' : 'OFF');
  }
  applyCrt();
  if (crtBtn) {
    crtBtn.addEventListener('click', function () {
      crtOn = !crtOn;
      localStorage.setItem('crt', crtOn ? 'on' : 'off');
      applyCrt();
    });
  }

  var sfxBtn = document.getElementById('sfx-toggle');
  var sfxOn = localStorage.getItem('sfx') !== 'off';
  SFX.setEnabled(sfxOn);

  function applySfx() {
    if (sfxBtn) sfxBtn.textContent = 'SFX: ' + (sfxOn ? 'ON' : 'OFF');
  }
  applySfx();
  if (sfxBtn) {
    sfxBtn.addEventListener('click', function () {
      sfxOn = !sfxOn;
      localStorage.setItem('sfx', sfxOn ? 'on' : 'off');
      SFX.setEnabled(sfxOn);
      applySfx();
    });
  }

  /* ---------- GitHub links from CONFIG ---------- */
  document.querySelectorAll('a[data-github]').forEach(function (a) {
    if (!CONFIG.githubUser) return;
    var key = a.getAttribute('data-github');
    var repo = key && CONFIG.repos[key];
    a.href = 'https://github.com/' + CONFIG.githubUser + (repo ? '/' + repo : '');
  });

  /* ---------- blog preview on the homepage ---------- */
  var preview = document.getElementById('blog-preview');
  if (preview) {
    fetch('blog/posts.json')
      .then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      })
      .then(function (posts) {
        posts.sort(function (a, b) { return b.date.localeCompare(a.date); });
        preview.innerHTML = '';
        posts.slice(0, 3).forEach(function (p) {
          var a = document.createElement('a');
          a.className = 'post-row';
          a.href = 'blog/post.html?p=' + encodeURIComponent(p.slug);
          a.innerHTML =
            '<span class="post-date">' + fmtDate(p.date) + '</span>' +
            '<span class="post-title"></span>' +
            '<span class="post-arrow">→</span>';
          a.querySelector('.post-title').textContent = p.title;
          preview.appendChild(a);
        });
        if (!posts.length) {
          preview.innerHTML = '<p class="muted">no posts yet — the deck is still being shuffled.</p>';
        }
      })
      .catch(function () {
        preview.innerHTML =
          '<p class="muted">posts load when the site is served over http ' +
          '(run <code>python3 -m http.server</code> locally, or just publish to GitHub Pages).</p>';
      });
  }

  function fmtDate(iso) {
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  }
})();
