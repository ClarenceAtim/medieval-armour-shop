/* Category page: client-side sort / filter / pagination.
   The static paginated pages are the SEO version; these controls re-render
   the grid from /data/<category>.json when the shopper changes them. */
(function () {
  'use strict';
  var PER_PAGE = 48;
  var data = null;
  var currentPage = 1;

  function el(id) { return document.getElementById(id); }

  function cardHTML(p) {
    var price = MAS.formatEUR(p.price);
    var old = '';
    var badge = '';
    if (p.old && p.old > p.price) {
      old = '<span class="old">' + MAS.formatEUR(p.old) + '</span>';
      badge = '<span class="badge-off">-' + Math.round(100 * (p.old - p.price) / p.old) + '%</span>';
    }
    var stars = '';
    if (p.rating) {
      stars = '<div class="stars">' + '\u2605'.repeat(p.rating) +
        (p.rcount ? ' <span class="n">(' + p.rcount + ')</span>' : '') + '</div>';
    }
    return '<article class="card"><a class="thumb" href="/product/' + p.slug + '/">' +
      '<img src="' + MAS.escapeHtml(p.img) + '" alt="' + MAS.escapeHtml(p.name) + '" loading="lazy"></a>' +
      '<div class="body"><h3><a href="/product/' + p.slug + '/">' + MAS.escapeHtml(p.name) + '</a></h3>' +
      (p.sub ? '<div class="cat">' + MAS.escapeHtml(p.sub) + '</div>' : '') +
      stars + '<div class="price">' + price + old + badge + '</div></div></article>';
  }

  function filtered() {
    var sub = el('subfilter') ? el('subfilter').value : '';
    var saleOnly = el('saleonly') ? el('saleonly').checked : false;
    var min = el('pricemin') ? parseFloat(el('pricemin').value) : NaN;
    var max = el('pricemax') ? parseFloat(el('pricemax').value) : NaN;
    var list = data.filter(function (p) {
      if (sub && p.subslug !== sub) return false;
      if (saleOnly && !(p.old && p.old > p.price)) return false;
      if (!isNaN(min) && p.price < min) return false;
      if (!isNaN(max) && p.price > max) return false;
      return true;
    });
    var sort = el('sort') ? el('sort').value : 'featured';
    if (sort === 'price-asc') list.sort(function (a, b) { return a.price - b.price; });
    else if (sort === 'price-desc') list.sort(function (a, b) { return b.price - a.price; });
    else if (sort === 'name') list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    else if (sort === 'rating') list.sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
    return list;
  }

  function render() {
    var list = filtered();
    var totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;
    var start = (currentPage - 1) * PER_PAGE;
    var page = list.slice(start, start + PER_PAGE);
    var grid = el('product-grid');
    if (grid) {
      grid.innerHTML = page.length ? page.map(cardHTML).join('') :
        '<p>No products match these filters.</p>';
    }
    var count = el('result-count');
    if (count) {
      count.textContent = list.length + ' product' + (list.length === 1 ? '' : 's') +
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
    var sp = el('static-pagination');
    if (sp) sp.style.display = 'none';
  }

  function loadAndRender() {
    if (data) { render(); return; }
    fetch('/data/' + window.MAS_CATEGORY + '.json')
      .then(function (r) { return r.json(); })
      .then(function (json) { data = json; render(); })
      .catch(function () { /* keep the static page if data fails */ });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var controls = ['sort', 'subfilter', 'saleonly'];
    controls.forEach(function (id) {
      var c = el(id);
      if (c) c.addEventListener('change', function () { currentPage = 1; loadAndRender(); });
    });
    var apply = el('apply-filters');
    if (apply) apply.addEventListener('click', function (ev) {
      ev.preventDefault();
      currentPage = 1;
      loadAndRender();
    });
    ['pricemin', 'pricemax'].forEach(function (id) {
      var c = el(id);
      if (c) c.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); currentPage = 1; loadAndRender(); }
      });
    });
  });
})();
