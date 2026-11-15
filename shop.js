/* Medieval Armour Shop — shared cart + helpers. No frameworks. */
(function () {
  'use strict';
  var CART_KEY = 'mas_cart';
  var ORDERS_KEY = 'mas_orders';

  function readLS(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function writeLS(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function getCart() {
    var c = readLS(CART_KEY, []);
    return Array.isArray(c) ? c : [];
  }
  function saveCart(cart) { writeLS(CART_KEY, cart); updateCartCount(); }
  function cartCount() {
    return getCart().reduce(function (n, it) { return n + (it.qty || 0); }, 0);
  }
  function updateCartCount() {
    var el = document.getElementById('cart-count');
    if (el) el.textContent = String(cartCount());
  }
  function formatEUR(n) {
    return '\u20AC' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.style.display = 'none'; }, 2600);
  }

  function addToCart(item, qty) {
    qty = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
    var cart = getCart();
    var found = null;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === item.id) { found = cart[i]; break; }
    }
    if (found) found.qty = Math.min(99, found.qty + qty);
    else cart.push({ id: item.id, slug: item.slug, name: item.name, price: item.price, img: item.img, qty: qty });
    saveCart(cart);
    toast('Added to cart: ' + item.name);
  }

  window.MAS = {
    getCart: getCart, saveCart: saveCart, cartCount: cartCount,
    updateCartCount: updateCartCount, formatEUR: formatEUR,
    escapeHtml: escapeHtml, toast: toast, addToCart: addToCart,
    readLS: readLS, writeLS: writeLS,
    CART_KEY: CART_KEY, ORDERS_KEY: ORDERS_KEY
  };

  document.addEventListener('DOMContentLoaded', function () {
    updateCartCount();
    // Mobile hamburger menu (nested: Shop > categories > subcategories)
    var navToggle = document.getElementById('nav-toggle');
    var mobileNav = document.getElementById('mobilenav');
    if (navToggle && mobileNav) {
      function closePanel() {
        mobileNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        // collapse any expanded sub-menus so the menu reopens tidy
        var subs = mobileNav.querySelectorAll('.mnav-sub.open');
        for (var s = 0; s < subs.length; s++) subs[s].classList.remove('open');
        var tg = mobileNav.querySelectorAll('.mnav-toggle[aria-expanded="true"]');
        for (var t = 0; t < tg.length; t++) tg[t].setAttribute('aria-expanded', 'false');
      }
      navToggle.addEventListener('click', function () {
        if (mobileNav.classList.contains('open')) closePanel();
        else {
          mobileNav.classList.add('open');
          navToggle.setAttribute('aria-expanded', 'true');
        }
      });
      var toggles = mobileNav.querySelectorAll('.mnav-toggle');
      for (var i = 0; i < toggles.length; i++) {
        toggles[i].addEventListener('click', function () {
          var target = document.getElementById(this.getAttribute('aria-controls'));
          if (!target) return;
          var open = target.classList.toggle('open');
          this.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
      }
      mobileNav.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') closePanel();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && mobileNav.classList.contains('open')) closePanel();
      });
    }
    // Product page add-to-cart
    var btn = document.getElementById('add-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        var qtyEl = document.getElementById('qty');
        addToCart({
          id: btn.getAttribute('data-id'),
          slug: btn.getAttribute('data-slug'),
          name: btn.getAttribute('data-name'),
          price: parseFloat(btn.getAttribute('data-price')),
          img: btn.getAttribute('data-img')
        }, qtyEl ? qtyEl.value : 1);
      });
    }
  });
})();
