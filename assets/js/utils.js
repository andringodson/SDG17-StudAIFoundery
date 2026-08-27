/* =============================================================================
   utils.js - Formatting, DOM helpers, persistence and the reactive store.
   Everything downstream depends on this file, so it loads first.
   ============================================================================= */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------------------
     CURRENCY - en-IN throughout. Never a dollar sign, anywhere.
     --------------------------------------------------------------------------- */

  var inrFormatter = null;
  try {
    inrFormatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    });
  } catch (err) {
    inrFormatter = null; /* Ancient browser - fall back to manual grouping. */
  }

  /* Manual Indian digit grouping (last 3, then pairs) for the fallback path. */
  function groupIndian(n) {
    var s = String(Math.round(Math.abs(n)));
    if (s.length <= 3) { return s; }
    var last3 = s.slice(-3);
    var rest = s.slice(0, -3);
    rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return rest + ',' + last3;
  }

  /* Full precision: 10000000 -> "₹1,00,00,000" */
  function formatINR(value) {
    var n = Number(value) || 0;
    if (inrFormatter) { return inrFormatter.format(n); }
    return (n < 0 ? '-' : '') + '₹' + groupIndian(n);
  }

  /* Human scale: 10000000 -> "₹1 Crore", 500000 -> "₹5 Lakh" */
  function formatINRShort(value) {
    var n = Number(value) || 0;
    var sign = n < 0 ? '-' : '';
    var abs = Math.abs(n);

    if (abs >= 10000000) {
      return sign + '₹' + trimNum(abs / 10000000) + ' Crore';
    }
    if (abs >= 100000) {
      return sign + '₹' + trimNum(abs / 100000) + ' Lakh';
    }
    if (abs >= 1000) {
      return sign + '₹' + trimNum(abs / 1000) + 'K';
    }
    return formatINR(n);
  }

  /* Drop trailing ".0" but keep one decimal where it carries information. */
  function trimNum(n) {
    var rounded = Math.round(n * 10) / 10;
    if (rounded >= 100) { return String(Math.round(rounded)); }
    return String(rounded).replace(/\.0$/, '');
  }

  /* Plain integers with Indian grouping, no currency symbol. */
  function formatCount(value) {
    var n = Math.round(Number(value) || 0);
    try {
      return new Intl.NumberFormat('en-IN').format(n);
    } catch (err) {
      return groupIndian(n);
    }
  }

  /* Compact counts for tight KPI tiles: 1400000 -> "14 L" */
  function formatCountShort(value) {
    var n = Math.round(Number(value) || 0);
    if (n >= 10000000) { return trimNum(n / 10000000) + ' Cr'; }
    if (n >= 100000) { return trimNum(n / 100000) + ' L'; }
    if (n >= 1000) { return trimNum(n / 1000) + 'K'; }
    return formatCount(n);
  }

  /* ---------------------------------------------------------------------------
     DOM HELPERS
     --------------------------------------------------------------------------- */

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  /* el('div', { class: 'card', 'aria-label': 'x' }, [child, 'text']) */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var val = attrs[key];
        if (val === null || val === undefined || val === false) { return; }
        if (key === 'class') { node.className = val; }
        else if (key === 'text') { node.textContent = val; }
        else if (key === 'html') { node.innerHTML = val; }
        else if (key.indexOf('on') === 0 && typeof val === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), val);
        } else if (key === 'dataset') {
          Object.keys(val).forEach(function (d) { node.dataset[d] = val[d]; });
        } else {
          node.setAttribute(key, val === true ? '' : val);
        }
      });
    }
    appendChildren(node, children);
    return node;
  }

  function appendChildren(node, children) {
    if (children === null || children === undefined) { return; }
    if (!Array.isArray(children)) { children = [children]; }
    children.forEach(function (child) {
      if (child === null || child === undefined || child === false) { return; }
      node.appendChild(typeof child === 'object' && child.nodeType
        ? child
        : document.createTextNode(String(child)));
    });
  }

  /* Namespaced element factory for inline SVG. */
  var SVG_NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, children) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var val = attrs[key];
        if (val === null || val === undefined || val === false) { return; }
        if (key === 'text') { node.textContent = val; return; }
        if (key.indexOf('on') === 0 && typeof val === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), val);
          return;
        }
        node.setAttribute(key, val);
      });
    }
    appendChildren(node, children);
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) { node.removeChild(node.firstChild); }
    return node;
  }

  /* Escape anything that came from a user before it touches innerHTML. */
  function escapeHTML(str) {
    return String(str === null || str === undefined ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------------------------------------------------------------------------
     MATH / TIMING
     --------------------------------------------------------------------------- */

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function lerp(a, b, t) { return a + (b - a) * t; }

  /* easeOutCubic - used by every count-up and progress animation. */
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function prefersReducedMotion() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* Animate a number into an element. Respects reduced-motion. */
  function countUp(node, from, to, duration, formatter) {
    var fmt = formatter || formatCount;
    if (prefersReducedMotion() || duration <= 0) {
      node.textContent = fmt(to);
      return;
    }
    if (node._countRAF) { cancelAnimationFrame(node._countRAF); }
    var start = performance.now();
    function frame(now) {
      var t = clamp((now - start) / duration, 0, 1);
      node.textContent = fmt(lerp(from, to, easeOut(t)));
      if (t < 1) { node._countRAF = requestAnimationFrame(frame); }
      else { node._countRAF = null; }
    }
    node._countRAF = requestAnimationFrame(frame);
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /* ---------------------------------------------------------------------------
     STORAGE - every call guarded. Private mode and blocked cookies must not
     take the whole app down mid-presentation.
     --------------------------------------------------------------------------- */

  var STORE_KEY = 'sdg17-hub-v1';

  function readStore() {
    try {
      var raw = global.localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function writeStore(obj) {
    try {
      global.localStorage.setItem(STORE_KEY, JSON.stringify(obj));
      return true;
    } catch (err) {
      return false;
    }
  }

  function dropStore() {
    try { global.localStorage.removeItem(STORE_KEY); return true; }
    catch (err) { return false; }
  }

  /* ---------------------------------------------------------------------------
     REACTIVE STORE - a tiny pub/sub over one persisted object.
     --------------------------------------------------------------------------- */

  function defaultState() {
    return {
      points: 0,
      badges: [],            /* badge ids unlocked */
      visitedRegions: [],    /* region ids opened on the map */
      pledges: [],           /* user-authored pledges only; seeds render separately */
      pollVotes: {},         /* optionId -> count contributed by this browser */
      myVote: null,
      quizBest: 0,
      financeBudget: 100000000, /* ₹10 Crore default */
      lastSeen: null
    };
  }

  var listeners = {};
  var state = Object.assign(defaultState(), readStore() || {});

  var Store = {
    get: function (key) {
      return key === undefined ? state : state[key];
    },
    set: function (key, value) {
      var patch = {};
      if (typeof key === 'object') { patch = key; }
      else { patch[key] = value; }
      var changed = [];
      Object.keys(patch).forEach(function (k) {
        if (state[k] !== patch[k]) { state[k] = patch[k]; changed.push(k); }
      });
      if (!changed.length) { return; }
      writeStore(state);
      changed.forEach(function (k) { emit(k, state[k]); });
      emit('*', state);
    },
    /* Mutate an array/object in place then persist + notify. */
    update: function (key, mutator) {
      var next = mutator(state[key]);
      state[key] = next;
      writeStore(state);
      emit(key, next);
      emit('*', state);
    },
    on: function (key, fn) {
      (listeners[key] = listeners[key] || []).push(fn);
      return function off() {
        listeners[key] = (listeners[key] || []).filter(function (f) { return f !== fn; });
      };
    },
    reset: function () {
      dropStore();
      state = defaultState();
      Object.keys(listeners).forEach(function (k) { emit(k, state[k]); });
      emit('*', state);
    },
    persisted: function () { return readStore() !== null; }
  };

  function emit(key, value) {
    (listeners[key] || []).forEach(function (fn) {
      try { fn(value); } catch (err) { console.error('[store]', key, err); }
    });
  }

  /* ---------------------------------------------------------------------------
     TOASTS - lightweight, polite, auto-dismissing.
     --------------------------------------------------------------------------- */

  function toast(message, opts) {
    opts = opts || {};
    var host = $('#toast-region');
    if (!host) { return; }
    var node = el('div', { class: 'toast toast--' + (opts.tone || 'info'), role: 'status' }, [
      opts.icon ? el('span', { class: 'toast__icon', 'aria-hidden': 'true', text: opts.icon }) : null,
      el('div', { class: 'toast__body' }, [
        el('p', { class: 'toast__title', text: message }),
        opts.detail ? el('p', { class: 'toast__detail', text: opts.detail }) : null
      ])
    ]);
    host.appendChild(node);
    requestAnimationFrame(function () { node.classList.add('is-in'); });
    setTimeout(function () {
      node.classList.remove('is-in');
      setTimeout(function () { if (node.parentNode) { node.parentNode.removeChild(node); } }, 320);
    }, opts.duration || 3600);
  }

  global.U = {
    formatINR: formatINR,
    formatINRShort: formatINRShort,
    formatCount: formatCount,
    formatCountShort: formatCountShort,
    $: $, $$: $$, el: el, svgEl: svgEl, clear: clear, escapeHTML: escapeHTML,
    clamp: clamp, lerp: lerp, easeOut: easeOut, countUp: countUp,
    debounce: debounce, sleep: sleep, prefersReducedMotion: prefersReducedMotion,
    Store: Store, toast: toast, SVG_NS: SVG_NS
  };
})(window);
