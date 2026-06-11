/* Balatro-style card interactions:
   - Hand: fanned layout, hover tilt, drag to reorder, click to select
   - FloatCard: free-draggable card that springs back home
   - SFX: tiny synthesized clicks (no audio files) */
(function () {
  'use strict';

  /* ---------- sfx ---------- */
  var SFX = (function () {
    var ctx = null;
    var enabled = true;

    function ac() {
      if (!ctx) {
        try {
          ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { /* no audio, no problem */ }
      }
      return ctx;
    }

    function blip(freq, dur, gain, type) {
      if (!enabled) return;
      var c = ac();
      if (!c) return;
      if (c.state === 'suspended') c.resume();
      try {
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = type || 'triangle';
        o.frequency.value = freq;
        g.gain.setValueAtTime(gain, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
        o.connect(g);
        g.connect(c.destination);
        o.start();
        o.stop(c.currentTime + dur);
      } catch (e) { /* ignore */ }
    }

    return {
      setEnabled: function (v) { enabled = v; },
      isEnabled: function () { return enabled; },
      hover:  function () { blip(950, 0.035, 0.012, 'sine'); },
      pick:   function () { blip(640, 0.06, 0.035); },
      drop:   function () { blip(430, 0.07, 0.04); },
      select: function () { blip(780, 0.06, 0.04, 'square'); },
      chips:  function () {
        blip(520, 0.05, 0.03, 'square');
        setTimeout(function () { blip(700, 0.05, 0.03, 'square'); }, 55);
        setTimeout(function () { blip(880, 0.07, 0.03, 'square'); }, 110);
      }
    };
  })();

  /* ---------- hover tilt (3D follow-the-cursor) ----------
     scale defaults to a slight grow; pass 1 for cards that must not
     change size (e.g. the hand, where growing blocks the neighbors) */
  function attachTilt(card, inner, scale) {
    if (!inner) return;
    var s = scale == null ? 1.07 : scale;

    card.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      card.classList.add('hovered');
      SFX.hover();
    });

    card.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      if (card.classList.contains('dragging')) return;
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      inner.style.transform =
        'rotateY(' + (px * 24).toFixed(2) + 'deg)' +
        ' rotateX(' + (-py * 24).toFixed(2) + 'deg)' +
        (s !== 1 ? ' scale(' + s + ')' : '');
    });

    card.addEventListener('pointerleave', function () {
      card.classList.remove('hovered');
      inner.style.transform = '';
    });
  }

  /* ---------- hand of cards ---------- */
  function Hand(el, opts) {
    this.el = el;
    this.onSelect = (opts && opts.onSelect) || null;
    this.maxSelect = (opts && opts.maxSelect) || Infinity;
    this.cards = Array.prototype.slice.call(el.querySelectorAll('.bcard'));
    this.drag = null;

    var self = this;
    this.cards.forEach(function (c) { self.attachCard(c); });
    this.layout();

    if (window.ResizeObserver) {
      new ResizeObserver(function () { self.layout(); }).observe(el);
    } else {
      addEventListener('resize', function () { self.layout(); });
    }
  }

  Hand.prototype.layout = function () {
    var W = this.el.clientWidth;
    var H = this.el.clientHeight;
    var n = this.cards.length;
    if (!n) return;

    var cw = this.cards[0].offsetWidth;
    var ch = this.cards[0].offsetHeight;
    var spread = Math.max(0, Math.min(W - cw - 12, n * cw * 0.82));
    var maxRot = Math.min(22, 3 + n * 1.7);
    var arc = Math.min(46, H * 0.15);

    for (var i = 0; i < n; i++) {
      var c = this.cards[i];
      var t = n > 1 ? i / (n - 1) - 0.5 : 0; // -0.5 .. 0.5
      c._home = {
        x: (W - cw) / 2 + t * spread,
        y: (H - ch) * 0.45 + t * t * 4 * arc,
        r: t * 2 * maxRot
      };
      c.style.zIndex = 10 + i;
      if (!this.drag || this.drag.card !== c) this.place(c);
    }
  };

  Hand.prototype.place = function (c) {
    var lift = c.classList.contains('selected') ? -28 : 0;
    c.style.transform =
      'translate(' + c._home.x + 'px, ' + (c._home.y + lift) + 'px)' +
      ' rotate(' + c._home.r + 'deg)';
  };

  Hand.prototype.selectedCount = function () {
    return this.el.querySelectorAll('.bcard.selected').length;
  };

  Hand.prototype.clearSelection = function () {
    var self = this;
    this.cards.forEach(function (c) { c.classList.remove('selected'); self.place(c); });
    if (this.onSelect) this.onSelect(0);
  };

  Hand.prototype.sort = function (by) {
    var suitOrder = { spade: 0, heart: 1, diamond: 2, club: 3 };
    this.cards.sort(function (a, b) {
      if (by === 'suit') {
        var s = suitOrder[a.dataset.suit] - suitOrder[b.dataset.suit];
        if (s) return s;
      }
      return parseInt(b.dataset.rankval, 10) - parseInt(a.dataset.rankval, 10);
    });
    SFX.drop();
    this.layout();
  };

  Hand.prototype.attachCard = function (card) {
    var self = this;
    var inner = card.querySelector('.bcard-tilt');
    attachTilt(card, inner, 1); // no size change in the hand

    card.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      try { card.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      var rect = self.el.getBoundingClientRect();
      self.drag = {
        card: card,
        id: e.pointerId,
        moved: 0,
        v: 0,
        startX: e.clientX,
        startY: e.clientY,
        offX: e.clientX - rect.left - card._home.x,
        offY: e.clientY - rect.top - card._home.y,
        lastX: e.clientX,
        picked: false
      };
    });

    card.addEventListener('pointermove', function (e) {
      var d = self.drag;
      if (!d || d.card !== card || e.pointerId !== d.id) return;
      d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.startX, e.clientY - d.startY));
      if (d.moved < 5) return;

      if (!d.picked) {
        d.picked = true;
        card.classList.add('dragging');
        SFX.pick();
      }

      var rect = self.el.getBoundingClientRect();
      var x = e.clientX - rect.left - d.offX;
      var y = e.clientY - rect.top - d.offY;

      // swing the card based on horizontal velocity, like dragging in-game
      d.v = d.v * 0.75 + (e.clientX - d.lastX) * 0.25;
      d.lastX = e.clientX;
      var rot = Math.max(-22, Math.min(22, d.v * 1.6));

      card.style.transform = 'translate(' + x + 'px, ' + y + 'px) rotate(' + rot + 'deg)';

      // live reorder: find which slot the card's center is over
      var centerX = x + card.offsetWidth / 2;
      var others = self.cards.filter(function (c) { return c !== card; });
      var idx = others.length;
      for (var i = 0; i < others.length; i++) {
        if (centerX < others[i]._home.x + card.offsetWidth / 2) { idx = i; break; }
      }
      var cur = self.cards.indexOf(card);
      if (idx !== cur) {
        self.cards.splice(cur, 1);
        self.cards.splice(idx, 0, card);
        self.layout();
      }
    });

    function finish(e) {
      var d = self.drag;
      if (!d || d.card !== card || e.pointerId !== d.id) return;
      self.drag = null;
      card.classList.remove('dragging');
      if (d.moved < 5) {
        if (!card.classList.contains('selected') && self.selectedCount() >= self.maxSelect) {
          SFX.drop(); // hand's full — same rule as the game
        } else {
          card.classList.toggle('selected');
          SFX.select();
          if (self.onSelect) self.onSelect(self.selectedCount());
        }
      } else {
        SFX.drop();
      }
      self.layout();
    }

    card.addEventListener('pointerup', finish);
    card.addEventListener('pointercancel', finish);
  };

  /* ---------- free-floating draggable card ---------- */
  function makeFloatCard(card) {
    var inner = card.querySelector('.bcard-tilt');
    attachTilt(card, inner);
    var d = null;

    card.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('a, button')) return; // let links inside cards work
      e.preventDefault();
      try { card.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      d = { id: e.pointerId, sx: e.clientX, sy: e.clientY, v: 0, lastX: e.clientX, moved: false };
    });

    card.addEventListener('pointermove', function (e) {
      if (!d || e.pointerId !== d.id) return;
      var dx = e.clientX - d.sx;
      var dy = e.clientY - d.sy;
      if (!d.moved && Math.hypot(dx, dy) > 4) {
        d.moved = true;
        card.classList.add('dragging');
        SFX.pick();
      }
      if (!d.moved) return;
      d.v = d.v * 0.75 + (e.clientX - d.lastX) * 0.25;
      d.lastX = e.clientX;
      var rot = Math.max(-20, Math.min(20, d.v * 1.5));
      card.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) rotate(' + rot + 'deg)';
    });

    function up(e) {
      if (!d || e.pointerId !== d.id) return;
      if (d.moved) {
        card.classList.remove('dragging');
        card.style.transform = ''; // spring home (CSS transition does the bounce)
        SFX.drop();
      }
      d = null;
    }

    card.addEventListener('pointerup', up);
    card.addEventListener('pointercancel', up);
  }

  /* ---------- exports ---------- */
  window.BalatroCards = {
    Hand: Hand,
    makeFloatCard: makeFloatCard,
    attachTilt: attachTilt,
    SFX: SFX
  };
})();
