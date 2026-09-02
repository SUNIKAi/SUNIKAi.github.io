/* Sunikai — interactions du site. Aucune dépendance. */
(function () {
  'use strict';

  /* ---------------------------------------------------------- menu mobile */
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('siteNav');

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        burger.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        burger.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
        burger.focus();
      }
    });
  }

  /* ------------------------------------------------------- ombre au scroll */
  var header = document.getElementById('siteHeader');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------ filtres du catalogue */
  var chips = document.querySelectorAll('.chip[data-cat]');
  var grid = document.getElementById('productGrid');

  if (chips.length && grid) {
    var cards = grid.querySelectorAll('.product-card');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var cat = chip.dataset.cat;
        chips.forEach(function (c) { c.classList.toggle('is-active', c === chip); });
        cards.forEach(function (card) {
          var show = cat === 'all' || card.dataset.cat === cat;
          card.hidden = !show;
        });
      });
    });
  }

  /* ------------------------------- pré-sélection du produit depuis l'URL */
  var select = document.getElementById('f-product');
  if (select) {
    var wanted = new URLSearchParams(window.location.search).get('product');
    if (wanted) {
      var match = Array.prototype.find.call(select.options, function (o) { return o.value === wanted; });
      if (match) {
        select.value = wanted;
        var msg = document.getElementById('f-message');
        if (msg && !msg.value) msg.focus();
      }
    }
  }

  /* --------------------------------- envoi du formulaire sans rechargement */
  var form = document.getElementById('quoteForm');
  var status = document.getElementById('formStatus');

  if (form && status) {
    form.addEventListener('submit', function (e) {
      if (!form.action || form.action.indexOf('VOTRE_ID_FORMSPREE') !== -1) return; // laisse le navigateur gérer
      if (!form.checkValidity()) {
        form.reportValidity();
        e.preventDefault();
        return;
      }
      e.preventDefault();

      var button = form.querySelector('button[type="submit"]');
      var label = button ? button.textContent : '';
      if (button) { button.disabled = true; button.textContent = '…'; }
      status.className = 'form-status';
      status.textContent = '';

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      })
        .then(function (r) {
          if (!r.ok) throw new Error('http ' + r.status);
          form.reset();
          status.className = 'form-status is-ok';
          status.textContent = status.dataset.success;
        })
        .catch(function () {
          status.className = 'form-status is-error';
          status.textContent = status.dataset.error;
        })
        .then(function () {
          if (button) { button.disabled = false; button.textContent = label; }
        });
    });
  }
})();
