/* Page wiring: float cards, logo, toggles, GitHub links.
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

})();
