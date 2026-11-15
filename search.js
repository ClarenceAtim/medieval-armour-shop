/* Search page: client-side search over /data/search-index.json.
   Matches product names, categories and subcategories. */
(function () {
  'use strict';
  var PER_PAGE = 48;
  var index = null;
  var results = [];
  var currentPage = 1;

  function el(id) { return document.getElementById(id); }
  function getQuery() {
    var m = /[?&]q=([^&]*)/.exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')).trim() : '';
  }

  function cardHTML(p) {
    var price = MAS.formatEUR(p.price);
    var old = '';
    var badge = '';
    if (p.old && p.old > p.price) {
      old = '<span class="old">' + MAS.formatEUR(p.old) + '</span>';
      badge = '<span class="badge-off">-' + Math.round(100 * (p.old - p.price) / p.old) + '%</span>';
    }
    return '<article class="card"><a class="thumb" href="/shop/product/' + p.slug + '/">' +
      '<img src="' + MAS.escapeHtml(p.img) + '" alt="' + MAS.escapeHtml(p.name) + '" loading="lazy"></a>' +
      '<div class="body"><h3><a href="/shop/product/' + p.slug + '/">' + MAS.escapeHtml(p.name) + '</a></h3>' +
      '<div class="cat">' + MAS.escapeHtml(p.cat) + '</div>' +
      '<div class="price">' + price + old + badge + '</div></div></article>';
  }

  function render() {
    var totalPages = Math.max(1, Math.ceil(results.length / PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;
    var start = (currentPage - 1) * PER_PAGE;
    var page = results.slice(start, start + PER_PAGE);
    var grid = el('search-results');
    if (grid) {
      grid.innerHTML = page.length ? page.map(cardHTML).join('') :
        '<p>No products found. Try different words, or browse the categories above.</p>';
    }
    var count = el('result-count');
    if (count) {
      count.textContent = results.length + ' result' + (results.length === 1 ? '' : 's') +
        (totalPages > 1 ? ' — page ' + currentPage + ' of ' + totalPages : '');
    }
    var pag = el('js-pagination');
    if (pag) {
      var html = '';
      if (totalPages > 1) {
        if (currentPage > 1) html += '<a href="#" data-page="' + (currentPage - 1) + '">\u2190 Previous</a>';
        for (var i = 1; i <= totalPages; i++) {
          if (i === currentPage) html += '<span class="current">' + i + '</span>';
          else if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
            html += '<a href="#" data-page="' + i + '">' + i + '</a>';
          } else if (Math.abs(i - currentPage) === 3) html += '<span>\u2026</span>';
        }
        if (currentPage < totalPages) html += '<a href="#" data-page="' + (currentPage + 1) + '">Next \u2192</a>';
      }
      pag.innerHTML = html;
      var links = pag.querySelectorAll('a[data-page]');
      for (var j = 0; j < links.length; j++) {
        links[j].addEventListener('click', function (ev) {
          ev.preventDefault();
          currentPage = parseInt(this.getAttribute('data-page'), 10);
          render();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }
    }
  }

  function runSearch(q) {
    var tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    results = index.map(function (p) {
      var hay = (p.name + ' ' + p.cat + ' ' + (p.sub || '')).toLowerCase();
      var score = 0;
      var all = true;
      tokens.forEach(function (t) {
        if (hay.indexOf(t) !== -1) {
          score += p.name.toLowerCase().indexOf(t) !== -1 ? 2 : 1;
        } else all = false;
      });
      return { p: p, score: score, all: all };
    }).filter(function (r) { return r.all && r.score > 0; })
      .sort(function (a, b) { return b.score - a.score || a.p.name.localeCompare(b.p.name); })
      .map(function (r) { return r.p; });
    currentPage = 1;
    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var q = getQuery();
    var input = el('search-input');
    if (input) input.value = q;
    var heading = el('search-heading');
    if (heading) heading.textContent = q ? 'Search results for "' + q + '"' : 'Search the shop';
    if (!q) {
      var count = el('result-count');
      if (count) count.textContent = 'Type a product name, category or keyword above to search ' +
        'helmets, armour, swords and more.';
      return;
    }
    fetch('/data/search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (json) { index = json; runSearch(q); })
      .catch(function () {
        var grid = el('search-results');
        if (grid) grid.innerHTML = '<p>Search is unavailable right now. Please try again later.</p>';
      });
  });
})();
