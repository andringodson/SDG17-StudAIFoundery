/* =============================================================================
   statusbar.js - The persistent accessible bottom status bar and the async
   operation controller that drives it.

   Contract:
     StatusBar.run({ title, steps:[{label, weight, work}] })  -> Promise
   Each `work` receives a context with .progress(0..1), .log(msg) and
   .cancelled, so a long step can report inside itself. Rejecting with
   { recoverable:true } surfaces a Retry affordance instead of a hard failure.
   ============================================================================= */
(function (global) {
  'use strict';

  var U = global.U;

  var bar = null;          /* root element */
  var els = {};            /* cached children */
  var current = null;      /* active operation */
  var logSeq = 0;

  function init() {
    bar = U.$('#status-bar');
    if (!bar) { return; }

    els.title = U.$('.statusbar__title', bar);
    els.detail = U.$('.statusbar__detail', bar);
    els.track = U.$('.statusbar__track', bar);
    els.fill = U.$('.statusbar__fill', bar);
    els.percent = U.$('.statusbar__percent', bar);
    els.cancel = U.$('[data-status-cancel]', bar);
    els.toggle = U.$('[data-status-toggle]', bar);
    els.panel = U.$('#status-panel');
    els.steps = U.$('.statuspanel__steps', bar);
    els.log = U.$('.statuspanel__log', bar);
    els.live = U.$('#status-live');

    els.cancel.addEventListener('click', function () { cancel('Cancelled by user.'); });
    els.toggle.addEventListener('click', togglePanel);

    /* Escape cancels a running operation from anywhere on the page, as long as
       no modal is open (the modal owns Escape while it is up). */
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape') { return; }
      if (document.body.classList.contains('modal-open')) { return; }
      if (current && current.running) {
        ev.preventDefault();
        cancel('Cancelled with the Escape key.');
      }
    });
  }

  function togglePanel() {
    var open = bar.classList.toggle('is-expanded');
    els.toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    els.panel.hidden = !open;
    els.toggle.querySelector('.statusbar__chev').textContent = open ? '▾' : '▴';
  }

  function announce(msg) {
    if (els.live) { els.live.textContent = msg; }
  }

  function stamp() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' +
           String(d.getMinutes()).padStart(2, '0') + ':' +
           String(d.getSeconds()).padStart(2, '0');
  }

  function log(message, tone) {
    if (!els.log) { return; }
    var row = U.el('li', { class: 'logline' + (tone ? ' logline--' + tone : '') }, [
      U.el('span', { class: 'logline__time', text: stamp() }),
      U.el('span', { class: 'logline__msg', text: message })
    ]);
    els.log.appendChild(row);
    els.log.scrollTop = els.log.scrollHeight;
    logSeq += 1;
    /* Keep the DOM bounded during a long session. */
    while (els.log.children.length > 80) { els.log.removeChild(els.log.firstChild); }
  }

  function show() {
    bar.hidden = false;
    requestAnimationFrame(function () { bar.classList.add('is-visible'); });
    document.body.classList.add('has-statusbar');
  }

  function hide() {
    bar.classList.remove('is-visible');
    document.body.classList.remove('has-statusbar');
    setTimeout(function () {
      if (!current || !current.running) { bar.hidden = true; }
    }, 380);
  }

  function setProgress(fraction, indeterminate) {
    if (indeterminate) {
      els.track.classList.add('is-indeterminate');
      els.track.removeAttribute('aria-valuenow');
      els.percent.textContent = '';
      return;
    }
    els.track.classList.remove('is-indeterminate');
    var pct = Math.round(U.clamp(fraction, 0, 1) * 100);
    els.fill.style.width = pct + '%';
    els.track.setAttribute('aria-valuenow', String(pct));
    els.percent.textContent = pct + '%';
  }

  function renderSteps(steps) {
    U.clear(els.steps);
    steps.forEach(function (s, i) {
      els.steps.appendChild(U.el('li', {
        class: 'statusstep', 'data-state': 'pending', 'data-index': i
      }, [
        U.el('span', { class: 'statusstep__mark', 'aria-hidden': 'true', text: '○' }),
        U.el('span', { class: 'statusstep__label', text: s.label }),
        U.el('span', { class: 'statusstep__state', text: 'Pending' })
      ]));
    });
  }

  function markStep(index, state) {
    var node = els.steps.children[index];
    if (!node) { return; }
    var marks = { pending: '○', active: '◐', done: '✓', failed: '✕', skipped: '–' };
    var words = { pending: 'Pending', active: 'Working', done: 'Done', failed: 'Failed', skipped: 'Skipped' };
    node.setAttribute('data-state', state);
    U.$('.statusstep__mark', node).textContent = marks[state] || '○';
    U.$('.statusstep__state', node).textContent = words[state] || '';
  }

  function cancel(reason) {
    if (!current || !current.running) { return; }
    current.cancelled = true;
    current.cancelReason = reason || 'Cancelled.';
    log(current.cancelReason, 'warn');
    announce('Operation cancelled.');
  }

  /* ---------------------------------------------------------------------------
     THE RUNNER
     --------------------------------------------------------------------------- */

  function run(config) {
    var steps = config.steps || [];
    var totalWeight = steps.reduce(function (s, x) { return s + (x.weight || 1); }, 0) || 1;

    /* Only one operation at a time - a second request cancels the first. */
    if (current && current.running) { cancel('Superseded by a new operation.'); }

    var op = {
      running: true,
      cancelled: false,
      cancelReason: null,
      done: 0
    };
    current = op;

    show();
    bar.setAttribute('data-state', 'running');
    els.title.textContent = config.title || 'Working';
    els.detail.textContent = config.detail || '';
    els.cancel.hidden = false;
    els.cancel.disabled = false;
    setProgress(0, false);
    renderSteps(steps);
    log('▶ ' + (config.title || 'Operation') + ' started', 'start');
    announce((config.title || 'Operation') + ' started.');

    return steps.reduce(function (chain, step, i) {
      return chain.then(function (carry) {
        if (op.cancelled) { return carry; }

        markStep(i, 'active');
        els.detail.textContent = step.label;
        announce(step.label);
        log(step.label + '…');

        var weight = step.weight || 1;
        var base = op.done / totalWeight;

        var ctx = {
          get cancelled() { return op.cancelled; },
          progress: function (f) {
            if (op.cancelled) { return; }
            setProgress(base + (U.clamp(f, 0, 1) * weight) / totalWeight, false);
          },
          log: function (msg, tone) { log('   ' + msg, tone); },
          indeterminate: function () { setProgress(0, true); }
        };

        return Promise.resolve()
          .then(function () { return step.work ? step.work(ctx, carry) : carry; })
          .then(function (result) {
            if (op.cancelled) { markStep(i, 'skipped'); return carry; }
            op.done += weight;
            setProgress(op.done / totalWeight, false);
            markStep(i, 'done');
            return result === undefined ? carry : result;
          })
          .catch(function (err) {
            markStep(i, 'failed');
            log('✕ ' + step.label + ' — ' + (err && err.message ? err.message : String(err)), 'error');
            if (err && err.recoverable) {
              /* Recoverable: note it, keep the pipeline alive. */
              log('   recovered with fallback data', 'warn');
              op.done += weight;
              setProgress(op.done / totalWeight, false);
              markStep(i, 'done');
              return carry;
            }
            err.__stepFailed = true;
            throw err;
          });
      });
    }, Promise.resolve(config.seed))
      .then(function (result) {
        op.running = false;
        if (op.cancelled) {
          finishState('cancelled', op.cancelReason);
          var e = new Error(op.cancelReason);
          e.cancelled = true;
          throw e;
        }
        finishState('done', config.doneText || 'Complete');
        return result;
      })
      .catch(function (err) {
        op.running = false;
        if (err && err.cancelled) { throw err; }
        finishState('error', (err && err.message) || 'Something went wrong');
        throw err;
      });
  }

  function finishState(state, message) {
    bar.setAttribute('data-state', state);
    els.cancel.hidden = true;
    els.title.textContent = state === 'done' ? 'Complete'
      : state === 'cancelled' ? 'Cancelled' : 'Failed';
    els.detail.textContent = message || '';
    if (state === 'done') { setProgress(1, false); }
    log(state === 'done' ? '✓ ' + (message || 'Complete')
      : state === 'cancelled' ? '⊘ ' + (message || 'Cancelled')
      : '✕ ' + (message || 'Failed'), state === 'done' ? 'ok' : state === 'cancelled' ? 'warn' : 'error');
    announce(els.title.textContent + '. ' + (message || ''));
    /* Leave a completed bar up briefly so the result is readable. */
    setTimeout(function () {
      if (!current || !current.running) { hide(); }
    }, state === 'done' ? 1600 : 4200);
  }

  /* A one-shot indeterminate blip for very short operations. */
  function pulse(title, detail, ms) {
    return run({
      title: title,
      detail: detail,
      steps: [{
        label: detail || title,
        work: function (ctx) {
          ctx.indeterminate();
          return U.sleep(ms || 600);
        }
      }],
      doneText: detail || title
    });
  }

  global.StatusBar = {
    init: init,
    run: run,
    pulse: pulse,
    cancel: cancel,
    log: log
  };
})(window);
