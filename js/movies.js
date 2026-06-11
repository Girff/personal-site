/* The Movie Corner: ratings histogram (clickable), this month's reviews
   (paginated, 5 per page), and the watchlist — all from
   assets/data/letterboxd.json (refreshed daily by the GitHub workflow). */
(function () {
  'use strict';

  var histEl = document.getElementById('histogram');
  if (!histEl) return;

  var REVIEWS_PER_PAGE = 5;

  /* ---------- helpers ---------- */
  function stars(rating) {
    if (rating == null) return '';
    var full = Math.floor(rating);
    var s = new Array(full + 1).join('★');
    if (rating - full >= 0.5) s += '½';
    return s;
  }

  function fmtDate(iso) {
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function poster(src, alt) {
    var img = document.createElement('img');
    img.src = src || '';
    img.alt = alt || '';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.draggable = false;
    img.onerror = function () { img.classList.add('lb-noimg'); };
    return img;
  }

  /* ---------- ratings histogram ---------- */
  function renderHistogram(data) {
    var hist = data.histogram || { total: 0, buckets: [] };
    var sample = data.ratings || [];
    histEl.innerHTML = '';

    var sub = document.getElementById('hist-sub');
    if (sub && hist.total) {
      var avg = 0;
      hist.buckets.forEach(function (b) { avg += b.rating * b.count; });
      avg = (avg / hist.total).toFixed(2);
      sub.textContent = hist.total + ' films rated · ' + avg + '★ average';
    }

    histEl.appendChild(el('span', 'hist-star', '★'));
    var bars = el('div', 'hist-bars');
    var max = 1;
    hist.buckets.forEach(function (b) { max = Math.max(max, b.count); });

    var detail = document.getElementById('hist-detail');

    hist.buckets.forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hist-bar';
      btn.title = b.count + ' ' + (stars(b.rating) || '½') + ' rating' + (b.count === 1 ? '' : 's');
      btn.setAttribute('aria-label', btn.title);

      btn.appendChild(el('span', 'cnt', String(b.count)));
      var fill = el('span', 'fill');
      fill.style.height = Math.max(4, Math.round(b.count / max * 100)) + '%';
      btn.appendChild(fill);

      btn.addEventListener('click', function () {
        var wasActive = btn.classList.contains('active');
        bars.querySelectorAll('.hist-bar').forEach(function (x) { x.classList.remove('active'); });
        if (wasActive) { detail.innerHTML = ''; return; }
        btn.classList.add('active');
        renderBucketDetail(detail, b, sample);
      });

      bars.appendChild(btn);
    });

    histEl.appendChild(bars);
    histEl.appendChild(el('span', 'hist-star', '★★★★★'));
  }

  function renderBucketDetail(detail, bucket, sample) {
    detail.innerHTML = '';
    var box = el('div', 'hist-detail-box');
    var label = stars(bucket.rating) || '½';

    box.appendChild(el('b', 'hd-title', label + ' — ' + bucket.count + ' film' + (bucket.count === 1 ? '' : 's')));

    var films = sample.filter(function (f) { return f.rating === bucket.rating; });
    if (films.length) {
      var list = el('div', 'hd-films');
      films.forEach(function (f) {
        var a = el('a', 'hd-film');
        a.href = f.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.appendChild(el('span', null, f.title));
        if (f.year) a.appendChild(el('span', 'yr', f.year));
        list.appendChild(a);
      });
      box.appendChild(list);
    }

    if (!bucket.count) {
      box.appendChild(el('p', 'hd-note', 'nothing here yet. some film will earn it eventually.'));
    } else if (films.length < bucket.count && bucket.url) {
      var more = el('a', 'hd-more',
        films.length
          ? 'plus ' + (bucket.count - films.length) + ' more from deeper in the archive — see all on letterboxd ↗'
          : 'these are deeper in the archive — see all ' + bucket.count + ' on letterboxd ↗');
      more.href = bucket.url;
      more.target = '_blank';
      more.rel = 'noopener';
      box.appendChild(more);
    }

    detail.appendChild(box);
  }

  /* ---------- this month's reviews ---------- */
  function renderMonth(data) {
    var mount = document.getElementById('month-reviews');
    var pager = document.getElementById('month-pager');
    var title = document.getElementById('month-title');
    var sub = document.getElementById('month-sub');

    // ?month=YYYY-MM lets you peek at other months (and makes testing easy)
    var param = new URLSearchParams(location.search).get('month');
    var now = new Date();
    var ym = /^\d{4}-\d{2}$/.test(param || '') ? param
      : now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

    var monthName = new Date(ym + '-01T00:00:00')
      .toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
    if (title) title.textContent = monthName;

    var reviews = (data.reviews || []).filter(function (r) {
      return r.watched && r.watched.slice(0, 7) === ym;
    });

    if (sub) sub.textContent = reviews.length ? reviews.length + ' review' + (reviews.length === 1 ? '' : 's') + ' logged' : '';

    if (!reviews.length) {
      mount.innerHTML = '';
      mount.appendChild(el('p', 'mv-empty', 'nothing to see here… seems I’m busy.'));
      pager.innerHTML = '';
      return;
    }

    var pages = Math.ceil(reviews.length / REVIEWS_PER_PAGE);
    var page = 0;

    function renderPage() {
      mount.innerHTML = '';
      var list = el('div', 'review-list');
      reviews.slice(page * REVIEWS_PER_PAGE, (page + 1) * REVIEWS_PER_PAGE).forEach(function (r) {
        list.appendChild(reviewRow(r));
      });
      mount.appendChild(list);

      pager.innerHTML = '';
      if (pages > 1) {
        var prev = el('button', 'bbtn dark sm' + (page === 0 ? ' disabled' : ''), '← PREV');
        prev.type = 'button';
        prev.addEventListener('click', function () { if (page > 0) { page--; renderPage(); } });
        var next = el('button', 'bbtn dark sm' + (page === pages - 1 ? ' disabled' : ''), 'NEXT →');
        next.type = 'button';
        next.addEventListener('click', function () { if (page < pages - 1) { page++; renderPage(); } });
        pager.appendChild(prev);
        pager.appendChild(el('span', 'pg-label', 'PAGE ' + (page + 1) + '/' + pages));
        pager.appendChild(next);
      }
    }

    renderPage();
  }

  function reviewRow(r) {
    var a = el('a', 'review-row');
    a.href = r.url;
    a.target = '_blank';
    a.rel = 'noopener';

    var thumb = el('div', 'review-thumb');
    if (r.poster) thumb.appendChild(poster(r.poster, ''));

    var body = el('div', 'review-body');
    var head = el('div', 'review-head');
    head.appendChild(el('b', null, r.title));
    if (r.year) head.appendChild(el('span', 'review-year', r.year));
    if (r.rating != null) head.appendChild(el('span', 'review-stars', stars(r.rating)));
    if (r.rewatch) head.appendChild(el('span', 'review-rewatch', 'REWATCH'));
    body.appendChild(head);
    if (r.watched) body.appendChild(el('div', 'review-date', 'watched ' + fmtDate(r.watched)));
    if (r.review) body.appendChild(el('p', 'review-text', r.review));

    a.appendChild(thumb);
    a.appendChild(body);
    return a;
  }

  /* ---------- watchlist ---------- */
  function renderWatchlist(data) {
    var mount = document.getElementById('watchlist');
    var sub = document.getElementById('wl-sub');
    var wl = data.watchlist || { total: 0, films: [] };
    mount.innerHTML = '';

    if (sub && wl.total) sub.textContent = wl.total + ' films deep and growing';

    var shown = 0;
    wl.films.forEach(function (f) {
      if (!f.poster) return;
      var card = el('a', 'wl-card');
      card.href = f.url;
      card.target = '_blank';
      card.rel = 'noopener';
      card.setAttribute('data-float-card', '');
      card.style.rotate = ((shown % 2 ? 1 : -1) * (0.8 + (shown % 5) * 0.3)) + 'deg';

      var tilt = el('div', 'bcard-tilt');
      var art = el('div', 'wl-art');
      art.appendChild(poster(f.poster, f.title + ' poster'));
      tilt.appendChild(art);
      tilt.appendChild(el('div', 'wl-name', f.title));
      card.appendChild(tilt);
      mount.appendChild(card);
      if (window.BalatroCards) window.BalatroCards.makeFloatCard(card);
      shown++;
    });

    var rest = wl.total - shown;
    if (rest > 0) {
      var more = el('a', 'wl-card wl-more');
      more.href = data.profile ? data.profile + 'watchlist/' : 'https://letterboxd.com/';
      more.target = '_blank';
      more.rel = 'noopener';
      var tilt2 = el('div', 'bcard-tilt');
      tilt2.appendChild(el('span', 'wl-more-num', '+' + rest));
      tilt2.appendChild(el('span', 'wl-more-txt', 'MORE ON LETTERBOXD'));
      more.appendChild(tilt2);
      mount.appendChild(more);
      if (window.BalatroCards) window.BalatroCards.makeFloatCard(more);
    }

    if (!mount.children.length) {
      mount.appendChild(el('p', 'mv-empty', 'the watchlist is empty. that can’t be right.'));
    }
  }

  /* ---------- load ---------- */
  fetch('assets/data/letterboxd.json')
    .then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    })
    .then(function (data) {
      renderHistogram(data);
      renderMonth(data);
      renderWatchlist(data);

      var hud = document.getElementById('movie-hud');
      if (hud) {
        var avg = 0;
        (data.histogram.buckets || []).forEach(function (b) { avg += b.rating * b.count; });
        avg = data.histogram.total ? (avg / data.histogram.total).toFixed(1) : '—';
        hud.innerHTML =
          '<div class="hud-chip"><span>FILMS RATED</span><b class="num-blue">' + data.histogram.total + '</b></div>' +
          '<div class="hud-chip"><span>AVERAGE RATING</span><b class="num-gold">' + avg + '★</b></div>' +
          '<div class="hud-chip"><span>WATCHLIST</span><b class="num-red">' + (data.watchlist ? data.watchlist.total : 0) + '</b></div>';
      }

      var updated = document.getElementById('lb-updated');
      if (updated && data.updated) {
        updated.textContent = 'last synced ' + fmtDate(data.updated.slice(0, 10)).toLowerCase();
      }
      var profileLink = document.getElementById('lb-profile-link');
      if (profileLink && data.profile) profileLink.href = data.profile;
    })
    .catch(function () {
      histEl.innerHTML = '';
      document.querySelectorAll('.mv-panel').forEach(function (p) { p.style.display = 'none'; });
      var page = document.querySelector('.subpage');
      var err = el('p', 'mv-empty',
        'couldn’t load the movie data — serve the site over http or run scripts/fetch_letterboxd.py first.');
      page.insertBefore(err, document.querySelector('.movies-foot'));
    });
})();
