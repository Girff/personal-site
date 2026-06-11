/* Movies section: renders assets/data/letterboxd.json (favorites + recent reviews).
   The JSON is refreshed daily by .github/workflows/letterboxd.yml. */
(function () {
  'use strict';

  var mount = document.getElementById('lb-content');
  if (!mount) return;

  function stars(rating) {
    if (rating == null) return '';
    var full = Math.floor(rating);
    var s = new Array(full + 1).join('★');
    if (rating - full >= 0.5) s += '½';
    return s;
  }

  function fmtDate(iso) {
    if (!iso) return '';
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

  // data ships embedded via assets/data/letterboxd.js (works on file://);
  // fetch() is just the fallback
  var load = window.LETTERBOXD_DATA
    ? Promise.resolve(window.LETTERBOXD_DATA)
    : fetch('assets/data/letterboxd.json').then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      });

  load
    .then(function (data) {
      mount.innerHTML = '';

      /* ----- favorites: four poster cards ----- */
      if (data.favorites && data.favorites.length) {
        mount.appendChild(el('span', 'r-plaque teal-pl', 'FAVORITE FILMS'));
        var row = el('div', 'fav-row');
        data.favorites.forEach(function (f, i) {
          var card = el('a', 'fav-card');
          card.href = f.url;
          card.target = '_blank';
          card.rel = 'noopener';
          card.setAttribute('data-float-card', '');
          card.style.rotate = ((i % 2 ? 1 : -1) * (1.5 + i * 0.4)) + 'deg';

          var tilt = el('div', 'bcard-tilt');
          var art = el('div', 'fav-art');
          if (f.poster) art.appendChild(poster(f.poster, f.title + ' poster'));
          var label = el('div', 'fav-label', f.title.toUpperCase());
          if (f.year) label.appendChild(el('span', 'fav-year', ' ' + f.year));
          tilt.appendChild(art);
          tilt.appendChild(label);
          card.appendChild(tilt);
          row.appendChild(card);
          if (window.BalatroCards) window.BalatroCards.makeFloatCard(card);
        });
        mount.appendChild(row);
      }

      /* ----- two most recent reviews (the full list lives on movies.html) ----- */
      if (data.reviews && data.reviews.length) {
        mount.appendChild(el('span', 'r-plaque purple-pl', 'LATEST REVIEWS'));
        var list = el('div', 'review-list');
        data.reviews.slice(0, 2).forEach(function (r) {
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
          list.appendChild(a);
        });
        mount.appendChild(list);
      }

      if (!mount.children.length) {
        mount.innerHTML = '<p class="muted">no letterboxd data yet — run the "Update Letterboxd data" workflow on GitHub.</p>';
      }

      var updated = document.getElementById('lb-updated');
      if (updated && data.updated) {
        updated.textContent = 'last synced ' + fmtDate(data.updated.slice(0, 10)).toLowerCase();
      }
      var profileLink = document.getElementById('lb-profile-link');
      if (profileLink && data.profile) profileLink.href = data.profile;
    })
    .catch(function () {
      mount.innerHTML =
        '<p class="muted">couldn\'t load the movie data — run ' +
        '<code>python3 scripts/fetch_letterboxd.py</code> or the GitHub workflow to generate it.</p>';
    });
})();
