/* Page wiring: skill hand, float cards, toggles, blog preview. */
(function () {
  'use strict';

  /* =====================================================
     CONFIG — edit me!
     ===================================================== */
  var CONFIG = {
    // TODO: set your GitHub username, e.g. 'advayk'
    githubUser: 'Girff',
    // TODO: map project ids (the data-github attribute) to repo names
    repos: {
      'spelunking-penguin': 'spelunking-penguin' // e.g. 'spelunking-penguin'
    }
  };

  var SKILLS = [
    // languages — spades
    { name: 'Python',     suit: 'spade',   rank: 'A',  val: 14 },
    { name: 'Java',       suit: 'spade',   rank: 'K',  val: 13 },
    { name: 'C#',         suit: 'spade',   rank: 'Q',  val: 12 },
    { name: 'JavaScript', suit: 'spade',   rank: 'J',  val: 11 },
    { name: 'HTML/CSS',   suit: 'spade',   rank: '10', val: 10 },
    { name: 'Swift',      suit: 'spade',   rank: '9',  val: 9 },
    // frameworks & libraries — hearts
    { name: 'XNA / MonoGame', suit: 'heart', rank: 'A', val: 14 },
    { name: 'React',          suit: 'heart', rank: 'K', val: 13 },
    // dev skills — diamonds
    { name: 'Git & GitHub',    suit: 'diamond', rank: 'A', val: 14 },
    { name: 'Agile / Scrum',   suit: 'diamond', rank: 'K', val: 13 },
    { name: 'Algorithmic Problem Solving', suit: 'diamond', rank: 'Q', val: 12 }
  ];

  var SUIT_GLYPH = { spade: '♠', heart: '♥', diamond: '♦', club: '♣' };
  var SUIT_COLOR = { spade: 'suit-black', club: 'suit-black', heart: 'suit-red', diamond: 'suit-red' };
  var CAT_LABEL = { spade: 'LANGUAGE', heart: 'FRAMEWORK', diamond: 'SKILL', club: 'MISC' };

  var SFX = window.BalatroCards.SFX;

  /* ---------- build the skill hand ---------- */
  function buildSkillCard(s, i) {
    var card = document.createElement('div');
    card.className = 'bcard ' + SUIT_COLOR[s.suit];
    card.dataset.suit = s.suit;
    card.dataset.rankval = String(s.val);

    var glyph = SUIT_GLYPH[s.suit];
    card.innerHTML =
      '<div class="bcard-tilt" style="--bob:' + (-(i * 0.45)).toFixed(2) + 's">' +
        '<div class="corner tl"><span>' + s.rank + '</span><span>' + glyph + '</span></div>' +
        '<div class="pip">' + glyph + '</div>' +
        '<div class="bname">' + s.name + '</div>' +
        '<div class="cat">' + CAT_LABEL[s.suit] + '</div>' +
        '<div class="corner br"><span>' + s.rank + '</span><span>' + glyph + '</span></div>' +
      '</div>';
    return card;
  }

  var handEl = document.getElementById('skill-hand');
  var hand = null;

  if (handEl) {
    SKILLS.forEach(function (s, i) { handEl.appendChild(buildSkillCard(s, i)); });

    // decorative deck in the corner
    var deck = document.createElement('div');
    deck.className = 'deck';
    deck.setAttribute('data-count', SKILLS.length + '/52');
    deck.setAttribute('aria-hidden', 'true');
    handEl.appendChild(deck);

    var selCount = document.getElementById('selected-count');
    hand = new window.BalatroCards.Hand(handEl, {
      onSelect: function (n) {
        if (selCount) selCount.textContent = n ? 'SELECTED: ' + n : '';
      }
    });

    var sortRank = document.getElementById('sort-rank');
    var sortSuit = document.getElementById('sort-suit');
    if (sortRank) sortRank.addEventListener('click', function () { hand.sort('rank'); });
    if (sortSuit) sortSuit.addEventListener('click', function () { hand.sort('suit'); });

    var playBtn = document.getElementById('play-hand');
    if (playBtn) {
      playBtn.addEventListener('click', function () {
        var n = hand.selectedCount();
        if (!n) {
          toast('click some cards first.');
        } else {
          toast('<b>+' + n * 15 + ' chips.</b> nice hand.');
          SFX.chips();
          hand.clearSelection();
        }
      });
    }
  }

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

  /* ---------- toast ---------- */
  function toast(html) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = html;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1800);
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
