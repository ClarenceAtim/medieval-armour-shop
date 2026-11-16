/* Cart page, checkout form and order confirmation.
   Orders are order REQUESTS: no payment is taken on this site. When the
   customer places an order, it is emailed to the shop
   (shopmedievalarmour@gmail.com) via FormSubmit and also saved in the
   customer's own browser (localStorage) so the confirmation page can
   show it. The shop confirms the order and payment details by email. */
(function () {
  'use strict';
  function el(id) { return document.getElementById(id); }

  /* ---------------- cart page ---------------- */
  function renderCart() {
    var body = el('cart-lines');
    if (!body) return;
    var cart = MAS.getCart();
    var wrap = el('cart-wrap');
    var empty = el('cart-empty');
    if (!cart.length) {
      if (wrap) wrap.style.display = 'none';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (wrap) wrap.style.display = 'block';
    if (empty) empty.style.display = 'none';
    var total = 0;
    var html = '';
    cart.forEach(function (it, i) {
      var line = it.price * it.qty;
      total += line;
      html += '<tr><td><a href="/product/' + it.slug + '/"><img src="' +
        MAS.escapeHtml(it.img) + '" alt=""></a></td>' +
        '<td><a href="/product/' + it.slug + '/">' + MAS.escapeHtml(it.name) + '</a></td>' +
        '<td>' + MAS.formatEUR(it.price) + '</td>' +
        '<td><input type="number" min="1" max="99" value="' + it.qty +
        '" data-qty="' + i + '" aria-label="Quantity"></td>' +
        '<td>' + MAS.formatEUR(line) + '</td>' +
        '<td><button type="button" class="rm" data-rm="' + i + '">Remove</button></td></tr>';
    });
    body.innerHTML = html;
    var t = el('cart-total');
    if (t) t.textContent = MAS.formatEUR(total);
    var st = el('cart-subtotal');
    if (st) st.textContent = MAS.formatEUR(total);
    body.querySelectorAll('[data-qty]').forEach(function (input) {
      input.addEventListener('change', function () {
        var cart2 = MAS.getCart();
        var idx = parseInt(this.getAttribute('data-qty'), 10);
        var q = Math.max(1, Math.min(99, parseInt(this.value, 10) || 1));
        if (cart2[idx]) { cart2[idx].qty = q; MAS.saveCart(cart2); renderCart(); }
      });
    });
    body.querySelectorAll('[data-rm]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cart2 = MAS.getCart();
        cart2.splice(parseInt(this.getAttribute('data-rm'), 10), 1);
        MAS.saveCart(cart2);
        renderCart();
      });
    });
  }

  /* ---------------- checkout page ---------------- */
  function orderNumber() {
    var d = new Date();
    var ymd = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var rand = '';
    for (var i = 0; i < 4; i++) rand += chars[Math.floor(Math.random() * chars.length)];
    return 'MAS-' + ymd + '-' + rand;
  }

  function renderCheckoutSummary() {
    var box = el('checkout-summary');
    if (!box) return;
    var cart = MAS.getCart();
    if (!cart.length) {
      box.innerHTML = '<p>Your cart is empty. <a href="/">Continue shopping</a>.</p>';
      var btn = el('place-order');
      if (btn) btn.disabled = true;
      return;
    }
    var total = 0;
    var html = '<table class="lines"><thead><tr><th>Product</th><th>Qty</th><th>Price</th></tr></thead><tbody>';
    cart.forEach(function (it) {
      total += it.price * it.qty;
      html += '<tr><td>' + MAS.escapeHtml(it.name) + '</td><td>' + it.qty +
        '</td><td>' + MAS.formatEUR(it.price * it.qty) + '</td></tr>';
    });
    html += '</tbody></table><div class="totals"><div class="row grand"><span>Total</span><span>' +
      MAS.formatEUR(total) + '</span></div></div>' +
      '<p style="font-size:.9rem;color:#6b645a;">Shipping costs are to be confirmed by the store.</p>';
    box.innerHTML = html;
  }

  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function placeOrder(ev) {
    ev.preventDefault();
    var cart = MAS.getCart();
    if (!cart.length) { MAS.toast('Your cart is empty.'); return; }
    var form = el('checkout-form');
    var fields = ['f-name', 'f-email', 'f-address', 'f-city', 'f-postcode', 'f-country'];
    var ok = true;
    fields.forEach(function (id) {
      var input = el(id);
      var err = el(id + '-err');
      var bad = !input.value.trim() || (id === 'f-email' && !validEmail(input.value.trim()));
      if (err) err.textContent = bad ? (id === 'f-email' ? 'Enter a valid email address.' : 'This field is required.') : '';
      if (bad) ok = false;
    });
    if (!ok) return;
    var total = cart.reduce(function (s, it) { return s + it.price * it.qty; }, 0);
    var order = {
      number: orderNumber(),
      date: new Date().toISOString(),
      items: cart,
      total: Math.round(total * 100) / 100,
      customer: {
        name: el('f-name').value.trim(),
        email: el('f-email').value.trim(),
        address: el('f-address').value.trim(),
        city: el('f-city').value.trim(),
        postcode: el('f-postcode').value.trim(),
        country: el('f-country').value,
        notes: el('f-notes') ? el('f-notes').value.trim() : ''
      }
    };
    var orders = MAS.readLS(MAS.ORDERS_KEY, []);
    orders.push(order);
    MAS.writeLS(MAS.ORDERS_KEY, orders);
    /* Email the order to the shop (FormSubmit AJAX — same pattern as the
       Illuminati site's form). Only clear the cart and show the
       confirmation page once the shop has the order. */
    var btn = el('place-order');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending order\u2026'; }
    var itemsText = cart.map(function (it) {
      return it.name + ' \u00d7 ' + it.qty + ' \u2014 ' + MAS.formatEUR(it.price * it.qty);
    }).join('\n');
    fetch('https://formsubmit.co/ajax/shopmedievalarmour@gmail.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        'Order number': order.number,
        'Customer name': order.customer.name,
        'Customer email': order.customer.email,
        'Delivery address': order.customer.address + ', ' + order.customer.city + ' ' +
          order.customer.postcode + ', ' + order.customer.country,
        'Order notes': order.customer.notes || '(none)',
        'Items': itemsText,
        'Order total': MAS.formatEUR(order.total),
        _subject: 'New order ' + order.number + ' \u2014 Medieval Armour Shop',
        _template: 'table',
        _captcha: 'false'
      })
    }).then(function (res) { return res.json(); }).then(function (data) {
      if (!data || data.success !== 'true') throw new Error('order email failed');
      MAS.saveCart([]);
      location.href = '/order-confirmation/?order=' + encodeURIComponent(order.number);
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Place order request'; }
      MAS.toast('Something went wrong sending your order \u2014 please try again, or email the shop directly at shopmedievalarmour@gmail.com.');
    });
  }

  /* ---------------- confirmation page ---------------- */
  function renderConfirmation() {
    var box = el('confirmation-box');
    if (!box) return;
    var m = /[?&]order=([^&]*)/.exec(location.search);
    var num = m ? decodeURIComponent(m[1]) : '';
    var orders = MAS.readLS(MAS.ORDERS_KEY, []);
    var order = null;
    for (var i = 0; i < orders.length; i++) {
      if (orders[i].number === num) { order = orders[i]; break; }
    }
    if (!order) {
      box.innerHTML = '<p>We could not find that order on this device. Orders are saved in the ' +
        'browser they were placed from — if you placed it on another device, it will not show here.</p>' +
        '<p><a class="btn" href="/">Continue shopping</a></p>';
      return;
    }
    var html = '<p>Thank you, ' + MAS.escapeHtml(order.customer.name) +
      '. Your order request has been received.</p>' +
      '<p><strong>Order number: ' + MAS.escapeHtml(order.number) + '</strong><br>' +
      'Please keep this number for your records.</p>' +
      '<p>The shop will confirm your order and send payment details to <strong>' +
      MAS.escapeHtml(order.customer.email) + '</strong>. No payment has been taken.</p>' +
      '<h2>Order summary</h2><table class="lines"><thead><tr><th>Product</th><th>Qty</th><th>Price</th></tr></thead><tbody>';
    order.items.forEach(function (it) {
      html += '<tr><td>' + MAS.escapeHtml(it.name) + '</td><td>' + it.qty +
        '</td><td>' + MAS.formatEUR(it.price * it.qty) + '</td></tr>';
    });
    html += '</tbody></table><div class="totals"><div class="row grand"><span>Total</span><span>' +
      MAS.formatEUR(order.total) + '</span></div></div>' +
      '<p style="font-size:.9rem;color:#6b645a;">Delivery to: ' +
      MAS.escapeHtml(order.customer.address) + ', ' + MAS.escapeHtml(order.customer.city) + ' ' +
      MAS.escapeHtml(order.customer.postcode) + ', ' + MAS.escapeHtml(order.customer.country) + '.</p>' +
      '<p><a class="btn" href="/">Continue shopping</a></p>';
    box.innerHTML = html;
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderCart();
    renderCheckoutSummary();
    renderConfirmation();
    var form = el('checkout-form');
    if (form) form.addEventListener('submit', placeOrder);
  });
})();
