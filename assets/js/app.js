/* =============================================================================
   app.js - Shell: navigation, the modal layer, the pillar explorer, scroll
   behaviour and the emergency demo reset. Boots everything else.
   ============================================================================= */
(function (global) {
  'use strict';

  var U = global.U, D = global.SDG_DATA, C = global.Charts;

  /* ---------------------------------------------------------------------------
     MODAL - focus-trapped, Escape-closable, returns focus where it came from.
     --------------------------------------------------------------------------- */

  var modal = { root: null, body: null, title: null, lastFocus: null };

  function initModal() {
    modal.root = U.$('#modal');
    if (!modal.root) { return; }
    modal.body = U.$('.modal__body', modal.root);
    modal.title = U.$('#modal-title', modal.root);

    U.$('[data-modal-close]', modal.root).addEventListener('click', closeModal);
    U.$('.modal__scrim', modal.root).addEventListener('click', closeModal);

    document.addEventListener('keydown', function (ev) {
      if (!document.body.classList.contains('modal-open')) { return; }
      if (ev.key === 'Escape') { ev.preventDefault(); closeModal(); return; }
      if (ev.key === 'Tab') { trapFocus(ev); }
    });
  }

  function trapFocus(ev) {
    var focusables = U.$$(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])',
      modal.root
    ).filter(function (n) { return n.offsetParent !== null; });
    if (!focusables.length) { return; }
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  }

  function openModal(title, buildFn) {
    modal.lastFocus = document.activeElement;
    modal.title.textContent = title;
    U.clear(modal.body);
    buildFn(modal.body);
    modal.root.hidden = false;
    document.body.classList.add('modal-open');
    requestAnimationFrame(function () {
      modal.root.classList.add('is-open');
      U.$('[data-modal-close]', modal.root).focus();
    });
  }

  function closeModal() {
    modal.root.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    C.hideTip();
    setTimeout(function () {
      modal.root.hidden = true;
      U.clear(modal.body);
      if (modal.lastFocus && modal.lastFocus.focus) { modal.lastFocus.focus(); }
    }, 260);
  }

  /* ---------------------------------------------------------------------------
     PILLAR EXPLORER - five cards, each opening a full view.
     --------------------------------------------------------------------------- */

  function initPillars() {
    var host = U.$('#pillar-grid');
    if (!host) { return; }
    U.clear(host);

    D.PILLARS.forEach(function (p, i) {
      var card = U.el('article', { class: 'pillar', style: '--i:' + i });
      card.appendChild(U.el('span', { class: 'pillar__icon', 'aria-hidden': 'true', text: p.icon }));
      card.appendChild(U.el('h3', { class: 'pillar__name' }, [
        U.el('button', {
          class: 'pillar__btn', type: 'button',
          'aria-haspopup': 'dialog',
          onclick: function () { openPillar(p); }
        }, [p.name])
      ]));
      card.appendChild(U.el('p', { class: 'pillar__tagline', text: p.tagline }));
      card.appendChild(U.el('p', { class: 'pillar__stat' }, [
        U.el('strong', { text: p.stat.value }),
        ' ' + p.stat.label
      ]));
      card.appendChild(U.el('span', { class: 'pillar__cue', 'aria-hidden': 'true', text: 'Explore →' }));
      host.appendChild(card);
    });
  }

  function openPillar(p) {
    openModal(p.name, function (body) {
      body.appendChild(U.el('p', { class: 'modal__lede', text: p.blurb }));

      /* Every pillar shows its allocation; the numbers are INR crore. */
      var chart = U.el('div', { class: 'modal__chart' });
      body.appendChild(U.el('h4', { class: 'panel__subtitle', text: 'Where the resources go' }));
      body.appendChild(chart);
      C.donut(chart, {
        segments: p.allocation,
        centerValue: '₹' + U.formatCount(p.allocation.reduce(function (s, a) { return s + a.value; }, 0)),
        centerLabel: 'crore',
        format: function (v) { return '₹' + U.formatCount(v) + ' Cr'; },
        ariaLabel: p.name + ' resource allocation'
      });

      /* Pillar-specific interactive tool. */
      if (p.id === 'capacity') {
        body.appendChild(U.el('h4', { class: 'panel__subtitle', text: 'Build a learning path' }));
        var pathHost = U.el('div');
        body.appendChild(pathHost);
        global.Simulators.mountLearning(pathHost);
      } else if (p.id === 'trade') {
        body.appendChild(U.el('h4', { class: 'panel__subtitle', text: 'Fair trade simulator' }));
        var tradeHost = U.el('div');
        body.appendChild(tradeHost);
        global.Simulators.mountTrade(tradeHost);
      } else if (p.id === 'systemic') {
        body.appendChild(U.el('h4', { class: 'panel__subtitle', text: 'Build the ecosystem' }));
        body.appendChild(U.el('p', { class: 'modal__note',
          text: 'The multi-stakeholder builder lives in its own section — it needs the room.' }));
        var jump = U.el('button', { class: 'btn btn--primary', type: 'button', text: 'Open the partnership builder' });
        jump.addEventListener('click', function () {
          closeModal();
          setTimeout(function () { scrollToId('builder-section'); }, 300);
        });
        body.appendChild(U.el('div', { class: 'sim-actions' }, [jump]));
      } else if (p.id === 'finance') {
        var jumpF = U.el('button', { class: 'btn btn--primary', type: 'button', text: 'Open the finance simulator' });
        jumpF.addEventListener('click', function () {
          closeModal();
          setTimeout(function () { scrollToId('finance-section'); }, 300);
        });
        body.appendChild(U.el('div', { class: 'sim-actions' }, [jumpF]));
      }

      body.appendChild(U.el('h4', { class: 'panel__subtitle', text: 'Related SDG 17 targets' }));
      var targets = U.el('ul', { class: 'targetlist' });
      p.targets.forEach(function (t) {
        targets.appendChild(U.el('li', { class: 'targetlist__item', text: t }));
      });
      body.appendChild(targets);

      if (p.id === 'technology') { global.Gamify.award('tech-innovator', 30, 'Technology pillar explored'); }
      else { global.Gamify.award(null, 10, p.name + ' explored'); }
    });
  }

  /* ---------------------------------------------------------------------------
     "WHY PARTNERSHIPS MATTER" CARDS
     --------------------------------------------------------------------------- */

  function initWhy() {
    var host = U.$('#why-grid');
    if (!host) { return; }
    U.clear(host);
    D.WHY_CARDS.forEach(function (c, i) {
      host.appendChild(U.el('article', { class: 'whycard reveal', style: '--i:' + i }, [
        U.el('span', { class: 'whycard__icon', 'aria-hidden': 'true', text: c.icon }),
        U.el('h3', { class: 'whycard__title', text: c.title }),
        U.el('p', { class: 'whycard__text', text: c.text })
      ]));
    });
  }

  /* ---------------------------------------------------------------------------
     NAVIGATION - drawer, scroll spy, smooth anchors.
     --------------------------------------------------------------------------- */

  function initNav() {
    var toggle = U.$('#nav-toggle');
    var drawer = U.$('#nav-links');
    var header = U.$('.siteheader');

    if (toggle && drawer) {
      toggle.addEventListener('click', function () {
        var open = drawer.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.classList.toggle('is-open', open);
        document.body.classList.toggle('nav-open', open);
      });

      /* Close the drawer after any nav choice on small screens. */
      U.$$('a', drawer).forEach(function (a) {
        a.addEventListener('click', function () {
          drawer.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.classList.remove('is-open');
          document.body.classList.remove('nav-open');
        });
      });

      document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && drawer.classList.contains('is-open')) {
          drawer.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.classList.remove('is-open');
          document.body.classList.remove('nav-open');
          toggle.focus();
        }
      });
    }

    /* Shadow the header once the page has moved. */
    var onScroll = function () {
      if (header) { header.classList.toggle('is-stuck', global.scrollY > 12); }
      spy();
    };
    global.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    U.$$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        var id = a.getAttribute('href').slice(1);
        if (!id) { return; }
        var target = document.getElementById(id);
        if (!target) { return; }
        ev.preventDefault();
        scrollToId(id);
      });
    });
  }

  function scrollToId(id) {
    var target = document.getElementById(id);
    if (!target) { return; }
    var top = target.getBoundingClientRect().top + global.scrollY - 76;
    global.scrollTo({ top: top, behavior: U.prefersReducedMotion() ? 'auto' : 'smooth' });
    /* Move focus so keyboard users land where the page jumped. */
    target.setAttribute('tabindex', '-1');
    setTimeout(function () { target.focus({ preventScroll: true }); }, 420);
  }

  var sections = [];
  function spy() {
    if (!sections.length) {
      sections = U.$$('main section[id]');
    }
    var y = global.scrollY + 120;
    var currentId = null;
    sections.forEach(function (s) {
      if (s.offsetTop <= y) { currentId = s.id; }
    });
    U.$$('#nav-links a').forEach(function (a) {
      var on = a.getAttribute('href') === '#' + currentId;
      a.classList.toggle('is-current', on);
      if (on) { a.setAttribute('aria-current', 'true'); }
      else { a.removeAttribute('aria-current'); }
    });
  }

  /* ---------------------------------------------------------------------------
     REVEAL ON SCROLL - progressive enhancement, off under reduced motion.
     --------------------------------------------------------------------------- */

  function initReveal() {
    if (U.prefersReducedMotion() || !('IntersectionObserver' in global)) {
      U.$$('.reveal').forEach(function (n) { n.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    U.$$('.reveal').forEach(function (n) { io.observe(n); });
  }

  /* ---------------------------------------------------------------------------
     HERO COUNTERS
     --------------------------------------------------------------------------- */

  function initHero() {
    var totals = D.REGIONS.reduce(function (acc, r) {
      acc.projects += r.projects; acc.partners += r.partners; acc.funding += r.funding;
      return acc;
    }, { projects: 0, partners: 0, funding: 0 });

    var map = {
      'hero-projects': [totals.projects, U.formatCount],
      'hero-partners': [totals.partners, U.formatCount],
      'hero-funding': [totals.funding, function (v) { return '₹' + U.formatCount(v) + ' Cr'; }]
    };

    Object.keys(map).forEach(function (id) {
      var node = document.getElementById(id);
      if (node) { U.countUp(node, 0, map[id][0], 1200, map[id][1]); }
    });

    var spark = U.$('#hero-spark');
    if (spark) { C.spark(spark, [12, 18, 16, 24, 31, 29, 38, 44, 41, 52, 58, 67]); }
  }

  /* ---------------------------------------------------------------------------
     DEMO RESET - the button that saves a live presentation.
     --------------------------------------------------------------------------- */

  function initReset() {
    U.$$('[data-demo-reset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openModal('Reset the demo?', function (body) {
          body.appendChild(U.el('p', { class: 'modal__lede',
            text: 'This clears every point, badge, pledge and vote stored in this browser and puts the hub back to its opening state. Nothing leaves this device, and nothing else is affected.' }));

          var actions = U.el('div', { class: 'sim-actions' });
          var confirm = U.el('button', { class: 'btn btn--danger', type: 'button', text: 'Yes, reset everything' });
          var cancel = U.el('button', { class: 'btn btn--ghost', type: 'button', text: 'Keep my progress' });

          confirm.addEventListener('click', function () {
            U.Store.reset();
            global.Gamify.reset();
            global.WorldMap.applyFilter('all');
            var detail = U.$('#region-detail');
            if (detail) { detail.hidden = true; }
            var report = U.$('#strategy-report');
            if (report) { report.hidden = true; }
            var breakdown = U.$('#finance-breakdown');
            if (breakdown) { breakdown.hidden = true; }
            closeModal();
            U.toast('Demo reset', { tone: 'info', icon: '↺', detail: 'Clean slate — ready to present.' });
            setTimeout(function () { global.scrollTo({ top: 0, behavior: 'smooth' }); }, 200);
          });
          cancel.addEventListener('click', closeModal);

          actions.appendChild(confirm);
          actions.appendChild(cancel);
          body.appendChild(actions);
        });
      });
    });
  }

  /* ---------------------------------------------------------------------------
     BOOT
     --------------------------------------------------------------------------- */

  function boot() {
    global.StatusBar.init();
    initModal();
    initNav();
    initWhy();
    initPillars();
    initHero();
    global.WorldMap.init();
    global.Simulators.initFinance();
    global.Ecosystem.init();
    global.Gamify.init();
    initReveal();
    initReset();

    /* Returning visitors get their totals back without a fanfare. */
    var pts = U.Store.get('points') || 0;
    if (pts > 0) {
      setTimeout(function () {
        U.toast('Welcome back', { tone: 'info', icon: '✦', detail: U.formatCount(pts) + ' points restored from this browser.' });
      }, 900);
    }
    U.Store.set('lastSeen', Date.now());

    document.body.classList.add('is-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  global.App = { openModal: openModal, closeModal: closeModal, scrollToId: scrollToId };
})(window);
