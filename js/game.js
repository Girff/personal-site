/* The skills section as a playable blind: random ranks each deal, rare editions,
   real poker-hand scoring, discards, and an endless ladder of CS-themed boss blinds.
   Suits always map to skill categories; only ranks and editions reshuffle. */
(function () {
  'use strict';

  var handEl = document.getElementById('skill-hand');
  if (!handEl || !window.BalatroCards) return;

  var SFX = window.BalatroCards.SFX;

  /* ---------- data ---------- */
  var SKILLS = [
    // languages — spades
    { name: 'Python',     suit: 'spade' },
    { name: 'Java',       suit: 'spade' },
    { name: 'C#',         suit: 'spade' },
    { name: 'JavaScript', suit: 'spade' },
    { name: 'HTML/CSS',   suit: 'spade' },
    { name: 'Swift',      suit: 'spade' },
    // frameworks & libraries — hearts
    { name: 'XNA', suit: 'heart' },
    { name: 'React',          suit: 'heart' },
    // dev skills — diamonds
    { name: 'Git & GitHub',  suit: 'diamond' },
    { name: 'Agile / Scrum', suit: 'diamond' },
    { name: 'Algorithmic Problem Solving', suit: 'diamond' }
  ];

  var SUIT_GLYPH = { spade: '♠', heart: '♥', diamond: '♦', club: '♣' };
  var SUIT_COLOR = { spade: 'suit-black', club: 'suit-black', heart: 'suit-red', diamond: 'suit-red' };
  var CAT_LABEL = { spade: 'LANGUAGE', heart: 'FRAMEWORK', diamond: 'SKILL', club: 'MISC' };
  var RANK_NAME = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

  // editions: weight = deal probability; bonuses mirror the game's flavor
  var EDITIONS = [
    { id: 'foil',        label: 'FOIL',       weight: 0.06, chips: 50 },
    { id: 'holographic', label: 'HOLOGRAPHIC', weight: 0.05, mult: 10 },
    { id: 'steel',       label: 'STEEL',      weight: 0.04, xmult: 1.25 },
    { id: 'gold',        label: 'GOLD',       weight: 0.04, chips: 20 },
    { id: 'polychrome',  label: 'POLYCHROME', weight: 0.02, xmult: 1.5 },
    { id: 'glass',       label: 'GLASS',      weight: 0.01, xmult: 2, fragile: true }
  ];

  var HAND_TYPES = {
    'five-of-a-kind':  { label: 'FIVE OF A KIND',  chips: 120, mult: 12 },
    'straight-flush':  { label: 'STRAIGHT FLUSH',  chips: 100, mult: 8 },
    'four-of-a-kind':  { label: 'FOUR OF A KIND',  chips: 60,  mult: 7 },
    'full-house':      { label: 'FULL HOUSE',      chips: 40,  mult: 4 },
    'flush':           { label: 'FLUSH',           chips: 35,  mult: 4 },
    'straight':        { label: 'STRAIGHT',        chips: 30,  mult: 4 },
    'three-of-a-kind': { label: 'THREE OF A KIND', chips: 30,  mult: 3 },
    'two-pair':        { label: 'TWO PAIR',        chips: 20,  mult: 2 },
    'pair':            { label: 'PAIR',            chips: 10,  mult: 2 },
    'high-card':       { label: 'HIGH CARD',       chips: 5,   mult: 1 }
  };

  var BOSS_NAMES = [
    'The Null Pointer', 'The Merge Conflict', 'The Segfault', 'The Infinite Loop',
    'The Race Condition', 'The Stack Overflow', 'The Memory Leak', 'The Spaghetti Code',
    'The Legacy Codebase', 'The Off-By-One', 'The Scope Creep', 'The Heisenbug',
    'The Deadline', 'The Friday Deploy'
  ];

  var HANDS_PER_BLIND = 4;
  var DISCARDS_PER_BLIND = 4;

  /* ---------- state ---------- */
  var state = {
    total: 0,
    beaten: 0,
    blindName: '',
    target: 300,
    roundScore: 0,
    hands: HANDS_PER_BLIND,
    discards: DISCARDS_PER_BLIND
  };

  try {
    var saved = JSON.parse(localStorage.getItem('skill-game') || 'null');
    if (saved && typeof saved.total === 'number') {
      state.total = saved.total;
      state.beaten = saved.beaten || 0;
      state.blindName = saved.blindName || '';
      state.target = saved.target || 300;
    }
  } catch (e) { /* fresh run */ }

  if (!state.blindName) rollBlind(false);

  function save() {
    try {
      localStorage.setItem('skill-game', JSON.stringify({
        total: state.total, beaten: state.beaten,
        blindName: state.blindName, target: state.target
      }));
    } catch (e) { /* private mode */ }
  }

  function rollBlind(scale) {
    var prev = state.blindName;
    var pick;
    do { pick = BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]; }
    while (pick === prev && BOSS_NAMES.length > 1);
    state.blindName = pick;
    if (scale) {
      state.target = Math.ceil(state.target * (1.5 + Math.random() * 0.7) / 50) * 50;
    }
  }

  /* ---------- dealing ---------- */
  function randRank() { return 2 + Math.floor(Math.random() * 13); } // 2..14

  function rankLabel(v) { return RANK_NAME[v] || String(v); }

  function chipValue(v) { return v === 14 ? 11 : Math.min(v, 10); }

  function rollEdition() {
    var r = Math.random();
    for (var i = 0; i < EDITIONS.length; i++) {
      if (r < EDITIONS[i].weight) return EDITIONS[i];
      r -= EDITIONS[i].weight;
    }
    return null;
  }

  function dealCard(card) {
    var v = randRank();
    var ed = rollEdition();
    card.dataset.rankval = String(v);
    card.dataset.edition = ed ? ed.id : '';

    EDITIONS.forEach(function (e) { card.classList.remove('ed-' + e.id); });
    if (ed) card.classList.add('ed-' + ed.id);

    var label = rankLabel(v);
    var glyph = SUIT_GLYPH[card.dataset.suit];
    card.querySelectorAll('.corner').forEach(function (c) {
      c.innerHTML = '<span>' + label + '</span><span>' + glyph + '</span>';
    });
    card.querySelector('.edition-label').textContent = ed ? ed.label : '';
  }

  function buildCard(s, i) {
    var card = document.createElement('div');
    card.className = 'bcard ' + SUIT_COLOR[s.suit];
    card.dataset.suit = s.suit;
    card.innerHTML =
      '<div class="bcard-tilt" style="--bob:' + (-(i * 0.45)).toFixed(2) + 's">' +
        '<div class="corner tl"></div>' +
        '<div class="bname">' + s.name + '</div>' +
        '<div class="cat">' + CAT_LABEL[s.suit] + '</div>' +
        '<div class="edition-label"></div>' +
        '<div class="corner br"></div>' +
      '</div>';
    dealCard(card);
    return card;
  }

  SKILLS.forEach(function (s, i) { handEl.appendChild(buildCard(s, i)); });

  var deck = document.createElement('div');
  deck.className = 'deck';
  deck.setAttribute('data-count', SKILLS.length + '/52');
  deck.setAttribute('aria-hidden', 'true');
  handEl.appendChild(deck);

  var hand = new window.BalatroCards.Hand(handEl, {
    maxSelect: 5,
    onSelect: updatePreview
  });

  /* ---------- hud ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var ui = {
    blindName: $('blind-name'), blindTarget: $('blind-target'),
    roundScore: $('round-score'), handsLeft: $('hands-left'),
    discardsLeft: $('discards-left'), totalScore: $('total-score'),
    blindsBeaten: $('blinds-beaten'), preview: $('hand-preview'),
    playBtn: $('play-hand'), discardBtn: $('discard-hand')
  };

  function fmt(n) { return n.toLocaleString('en-US'); }

  function render() {
    ui.blindName.textContent = state.blindName;
    ui.blindTarget.textContent = fmt(state.target);
    ui.roundScore.textContent = fmt(state.roundScore);
    ui.handsLeft.textContent = state.hands;
    ui.discardsLeft.textContent = state.discards;
    ui.totalScore.textContent = fmt(state.total);
    ui.blindsBeaten.textContent = state.beaten;
    ui.discardBtn.classList.toggle('disabled', state.discards === 0);
  }

  /* ---------- poker hand detection ---------- */
  function selectedCards() {
    return Array.prototype.slice.call(handEl.querySelectorAll('.bcard.selected'));
  }

  function detectHand(cards) {
    var vals = cards.map(function (c) { return parseInt(c.dataset.rankval, 10); });
    var suits = cards.map(function (c) { return c.dataset.suit; });

    var counts = {};
    vals.forEach(function (v) { counts[v] = (counts[v] || 0) + 1; });
    var groups = Object.keys(counts).map(function (k) { return counts[k]; }).sort(function (a, b) { return b - a; });

    var isFlush = cards.length === 5 && suits.every(function (s) { return s === suits[0]; });

    var isStraight = false;
    if (cards.length === 5 && groups[0] === 1) {
      var sorted = vals.slice().sort(function (a, b) { return a - b; });
      isStraight = sorted[4] - sorted[0] === 4;
      // wheel: A-2-3-4-5
      if (!isStraight && sorted.join(',') === '2,3,4,5,14') isStraight = true;
    }

    // duplicate ranks are possible here (every card rolls independently)
    if (groups[0] >= 5) return 'five-of-a-kind';
    if (isStraight && isFlush) return 'straight-flush';
    if (groups[0] === 4) return 'four-of-a-kind';
    if (groups[0] === 3 && groups[1] === 2) return 'full-house';
    if (isFlush) return 'flush';
    if (isStraight) return 'straight';
    if (groups[0] === 3) return 'three-of-a-kind';
    if (groups[0] === 2 && groups[1] === 2) return 'two-pair';
    if (groups[0] === 2) return 'pair';
    return 'high-card';
  }

  function scoreHand(cards) {
    var type = HAND_TYPES[detectHand(cards)];
    var chips = type.chips;
    var mult = type.mult;
    var xmult = 1;

    cards.forEach(function (c) {
      chips += chipValue(parseInt(c.dataset.rankval, 10));
      var ed = EDITIONS.find(function (e) { return e.id === c.dataset.edition; });
      if (!ed) return;
      if (ed.chips) chips += ed.chips;
      if (ed.mult) mult += ed.mult;
      if (ed.xmult) xmult *= ed.xmult;
    });

    return { type: type, chips: chips, mult: mult, xmult: xmult, total: Math.round(chips * mult * xmult) };
  }

  function updatePreview(n) {
    if (!n) { ui.preview.innerHTML = '&nbsp;'; return; }
    var s = scoreHand(selectedCards());
    ui.preview.innerHTML =
      '<b>' + s.type.label + '</b> — <span class="num-blue">' + fmt(s.chips) + '</span>' +
      ' × <span class="num-red">' + fmt(Math.round(s.mult * s.xmult * 100) / 100) + '</span>' +
      (n === 5 ? ' <span class="muted">(hand full)</span>' : '');
  }

  /* ---------- toast ---------- */
  function toast(html, cls) {
    var t = document.createElement('div');
    t.className = 'toast' + (cls ? ' ' + cls : '');
    t.innerHTML = html;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1900);
  }

  /* ---------- redeal animations ---------- */
  var busy = false;

  function flyOutAndRedeal(cards, done) {
    var H = handEl.clientHeight;
    cards.forEach(function (c, i) {
      c.classList.remove('selected');
      c.classList.add('flying');
      c.style.transform = 'translate(' + (c._home.x + 60) + 'px, ' + (H + 240) + 'px) rotate(38deg)';
    });
    setTimeout(function () {
      var W = handEl.clientWidth;
      cards.forEach(function (c) {
        dealCard(c);
        // jump (transition off) to the deck side, then slide back into the fan
        c.style.transition = 'none';
        c.style.transform = 'translate(' + W + 'px, ' + (H * 0.3) + 'px) rotate(-20deg)';
        void c.offsetWidth; // reflow so the jump isn't animated
        c.style.transition = '';
        c.classList.remove('flying');
      });
      hand.layout();
      SFX.drop();
      if (done) done();
    }, 430);
  }

  function redealAll(done) {
    flyOutAndRedeal(hand.cards.slice(), done);
  }

  /* ---------- actions ---------- */
  ui.playBtn.addEventListener('click', function () {
    if (busy) return;
    var cards = selectedCards();
    if (!cards.length) { toast('select some cards first.'); return; }
    busy = true;

    var s = scoreHand(cards);

    // pop the scoring cards one by one
    cards.forEach(function (c, i) {
      setTimeout(function () {
        c.classList.add('scoring');
        SFX.select();
        setTimeout(function () { c.classList.remove('scoring'); }, 420);
      }, i * 130);
    });

    setTimeout(function () {
      state.roundScore += s.total;
      state.total += s.total;
      state.hands -= 1;
      SFX.chips();
      toast('<b>' + s.type.label + '</b><br>' +
        '<span class="num-blue">' + fmt(s.chips) + '</span> × ' +
        '<span class="num-red">' + fmt(Math.round(s.mult * s.xmult * 100) / 100) + '</span>' +
        ' = <b class="num-gold">' + fmt(s.total) + '</b>');

      // glass cards can shatter after scoring
      var glass = cards.filter(function (c) { return c.dataset.edition === 'glass' && Math.random() < 0.25; });

      hand.clearSelection();
      updatePreview(0);
      render();
      save();

      setTimeout(function () {
        if (glass.length) {
          toast('a glass card shattered!', 'toast-small');
          flyOutAndRedeal(glass);
        }
        if (state.roundScore >= state.target) {
          defeatBlind();
        } else if (state.hands <= 0) {
          blindEscapes();
        } else {
          busy = false;
        }
      }, 900);
    }, cards.length * 130 + 250);
  });

  ui.discardBtn.addEventListener('click', function () {
    if (busy) return;
    var cards = selectedCards();
    if (!cards.length) { toast('select cards to discard.'); return; }
    if (state.discards <= 0) { toast('no discards left this blind.'); return; }
    busy = true;
    state.discards -= 1;
    SFX.pick();
    updatePreview(0);
    render();
    flyOutAndRedeal(cards, function () { busy = false; });
  });

  function defeatBlind() {
    state.beaten += 1;
    rollBlind(true);
    toast('<b class="num-gold">BLIND DEFEATED!</b><br>next up: ' + state.blindName +
      ' — score at least ' + fmt(state.target), 'toast-gold');
    SFX.chips();
    state.roundScore = 0;
    state.hands = HANDS_PER_BLIND;
    state.discards = DISCARDS_PER_BLIND;
    render();
    save();
    setTimeout(function () { redealAll(function () { busy = false; }); }, 700);
  }

  function blindEscapes() {
    toast('out of hands — <b>the blind escaped.</b><br>fresh deal, same boss.', 'toast-red');
    state.roundScore = 0;
    state.hands = HANDS_PER_BLIND;
    state.discards = DISCARDS_PER_BLIND;
    render();
    setTimeout(function () { redealAll(function () { busy = false; }); }, 700);
  }

  /* ---------- sort ---------- */
  var sortRank = $('sort-rank');
  var sortSuit = $('sort-suit');
  if (sortRank) sortRank.addEventListener('click', function () { hand.sort('rank'); });
  if (sortSuit) sortSuit.addEventListener('click', function () { hand.sort('suit'); });

  render();
})();
