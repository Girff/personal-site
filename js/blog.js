/* Blog: list + post rendering. Posts are markdown files in blog/posts/,
   indexed by blog/posts.json. Add a post = add a .md file + one JSON entry. */
(function () {
  'use strict';

  function fmtDate(iso) {
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function fetchPosts() {
    return fetch('posts.json').then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    });
  }

  function serveHint(el) {
    el.innerHTML =
      '<p class="muted">couldn\'t load posts. if you opened this file directly, serve it over http instead:<br>' +
      '<code>python3 -m http.server</code> — or just publish to GitHub Pages.</p>';
  }

  function initList() {
    initCrt();
    var list = document.getElementById('pack-list');
    fetchPosts()
      .then(function (posts) {
        posts.sort(function (a, b) { return b.date.localeCompare(a.date); });
        list.innerHTML = '';
        if (!posts.length) {
          list.innerHTML = '<p class="muted">no posts yet. the deck is still being shuffled.</p>';
          return;
        }
        posts.forEach(function (p) {
          var a = document.createElement('a');
          a.className = 'pack-row';
          a.href = 'post.html?p=' + encodeURIComponent(p.slug);

          var tags = (p.tags || []).map(function (t) {
            return '<span class="chip purple-c">' + escapeHtml(t) + '</span>';
          }).join('');

          a.innerHTML =
            '<span class="pack-art" aria-hidden="true">PACK</span>' +
            '<span class="pack-info">' +
              '<h3></h3>' +
              '<span class="post-date">' + fmtDate(p.date) + '</span>' +
              '<p></p>' +
              (tags ? '<span class="pack-tags">' + tags + '</span>' : '') +
            '</span>';
          a.querySelector('h3').textContent = p.title;
          a.querySelector('p').textContent = p.summary || '';
          list.appendChild(a);
        });
      })
      .catch(function () { serveHint(list); });
  }

  function initPost() {
    initCrt();
    var metaEl = document.getElementById('post-meta');
    var contentEl = document.getElementById('post-content');
    var slug = new URLSearchParams(location.search).get('p');

    fetchPosts()
      .then(function (posts) {
        var meta = posts.find(function (p) { return p.slug === slug; });
        if (!meta) {
          contentEl.innerHTML = '<p>that post doesn\'t exist. <a href="index.html">back to the deck →</a></p>';
          return;
        }
        document.title = meta.title + " · Advay's Blog";
        metaEl.innerHTML = '<span class="post-date">' + fmtDate(meta.date) + '</span>' +
          (meta.tags || []).map(function (t) { return ' · ' + escapeHtml(t); }).join('');

        return fetch('posts/' + meta.slug + '.md').then(function (r) {
          if (!r.ok) throw new Error('http ' + r.status);
          return r.text();
        }).then(function (md) {
          if (window.marked) {
            contentEl.innerHTML = window.marked.parse(md);
          } else {
            contentEl.innerHTML = '<pre style="white-space:pre-wrap">' + escapeHtml(md) + '</pre>';
          }
        });
      })
      .catch(function () { serveHint(contentEl); });
  }

  function initCrt() {
    var btn = document.getElementById('crt-toggle');
    var on = localStorage.getItem('crt') !== 'off';
    function apply() {
      document.body.classList.toggle('crt-off', !on);
      if (btn) btn.textContent = 'CRT: ' + (on ? 'ON' : 'OFF');
    }
    apply();
    if (btn) {
      btn.addEventListener('click', function () {
        on = !on;
        localStorage.setItem('crt', on ? 'on' : 'off');
        apply();
      });
    }
  }

  window.BlogPages = { initList: initList, initPost: initPost };
})();
