/* =============================================================================
   ecosystem.js - "Build Your Partnership": a four-step flow that ends in a
   scored strategy report.

   The scoring model is intentionally readable. Four components, stated weights,
   no hidden fudge factors - so a student can argue with it, which is the point.
   ============================================================================= */
(function (global) {
  'use strict';

  var U = global.U, D = global.SDG_DATA, C = global.Charts;

  var MAX_WEIGHT = D.STAKEHOLDERS.reduce(function (s, x) { return s + x.weight; }, 0);

  var state = {
    step: 1,
    challenge: null,
    stakeholders: [],
    budget: D.BUDGET_TIERS[3].value  /* ₹10 Crore */
  };

  var els = {};

  function init() {
    var root = U.$('#builder');
    if (!root) { return; }
    els.root = root;
    els.steps = U.$$('.wizard__panel', root);
    els.dots = U.$$('.wizard__dot', root);
    els.next = U.$('[data-wizard-next]', root);
    els.back = U.$('[data-wizard-back]', root);
    /* The report panel sits outside #builder, so it is queried from the
       document rather than scoped to the wizard root. */
    els.report = U.$('#strategy-report');

    renderChallenges();
    renderStakeholders();
    renderBudgets();

    els.next.addEventListener('click', function () {
      if (state.step === 4) { generate(); return; }
      go(state.step + 1, true);
    });
    els.back.addEventListener('click', function () { go(state.step - 1, true); });

    /* No focus move on the initial render - focusing the heading here would
       scroll the page straight past the hero on load. */
    go(1, false);
  }

  /* --- step 1: the challenge ---------------------------------------------- */
  function renderChallenges() {
    var host = U.$('#builder-challenges', els.root);
    U.clear(host);
    D.CHALLENGES.forEach(function (ch) {
      var btn = U.el('button', {
        class: 'pick-card', type: 'button', 'data-id': ch.id, 'aria-pressed': 'false'
      }, [
        U.el('span', { class: 'pick-card__icon', 'aria-hidden': 'true', text: ch.icon }),
        U.el('span', { class: 'pick-card__name', text: ch.name }),
        U.el('span', { class: 'pick-card__note', text: ch.blurb })
      ]);
      btn.addEventListener('click', function () {
        state.challenge = ch.id;
        U.$$('.pick-card', host).forEach(function (b) {
          var on = b.getAttribute('data-id') === ch.id;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        syncNav();
      });
      host.appendChild(btn);
    });
  }

  /* --- step 2: stakeholders ------------------------------------------------ */
  function renderStakeholders() {
    var host = U.$('#builder-stakeholders', els.root);
    U.clear(host);
    D.STAKEHOLDERS.forEach(function (sh) {
      var btn = U.el('button', {
        class: 'pick-card pick-card--multi', type: 'button', 'data-id': sh.id, 'aria-pressed': 'false'
      }, [
        U.el('span', { class: 'pick-card__icon', 'aria-hidden': 'true', text: sh.icon }),
        U.el('span', { class: 'pick-card__name', text: sh.name }),
        U.el('span', { class: 'pick-card__note', text: sh.note }),
        U.el('span', { class: 'pick-card__check', 'aria-hidden': 'true', text: '✓' })
      ]);
      btn.addEventListener('click', function () {
        var idx = state.stakeholders.indexOf(sh.id);
        if (idx === -1) { state.stakeholders.push(sh.id); }
        else { state.stakeholders.splice(idx, 1); }
        var on = state.stakeholders.indexOf(sh.id) !== -1;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        updateStakeCount();
        syncNav();
      });
      host.appendChild(btn);
    });
    updateStakeCount();
  }

  function updateStakeCount() {
    var out = U.$('#stake-count', els.root);
    if (!out) { return; }
    var n = state.stakeholders.length;
    out.textContent = n === 0 ? 'None selected yet — pick at least two.'
      : n + (n === 1 ? ' partner selected — add at least one more.' : ' partners selected.');
  }

  /* --- step 3: budget ------------------------------------------------------ */
  function renderBudgets() {
    var host = U.$('#builder-budget', els.root);
    U.clear(host);
    D.BUDGET_TIERS.forEach(function (tier) {
      var btn = U.el('button', {
        class: 'budget-chip' + (tier.value === state.budget ? ' is-active' : ''),
        type: 'button', 'data-value': String(tier.value),
        'aria-pressed': tier.value === state.budget ? 'true' : 'false'
      }, [
        U.el('span', { class: 'budget-chip__label', text: tier.label }),
        U.el('span', { class: 'budget-chip__exact', text: U.formatINR(tier.value) })
      ]);
      btn.addEventListener('click', function () {
        state.budget = tier.value;
        U.$$('.budget-chip', host).forEach(function (b) {
          var on = Number(b.getAttribute('data-value')) === tier.value;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        syncNav();
      });
      host.appendChild(btn);
    });
  }

  /* --- navigation ---------------------------------------------------------- */
  function go(step, moveFocus) {
    state.step = U.clamp(step, 1, 4);
    els.steps.forEach(function (panel, i) {
      var on = (i + 1) === state.step;
      panel.hidden = !on;
      panel.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    els.dots.forEach(function (dot, i) {
      dot.classList.toggle('is-active', (i + 1) === state.step);
      dot.classList.toggle('is-done', (i + 1) < state.step);
      dot.setAttribute('aria-current', (i + 1) === state.step ? 'step' : 'false');
    });
    if (state.step === 4) { renderReview(); }
    syncNav();
    if (moveFocus) {
      var heading = U.$('.wizard__panel:not([hidden]) .wizard__heading', els.root);
      if (heading) { heading.focus({ preventScroll: true }); }
    }
  }

  function syncNav() {
    els.back.disabled = state.step === 1;
    var ok = state.step === 1 ? !!state.challenge
      : state.step === 2 ? state.stakeholders.length >= 2
      : true;
    els.next.disabled = !ok;
    els.next.textContent = state.step === 4 ? 'Generate strategy report' : 'Continue';
  }

  /* --- step 4: review ------------------------------------------------------ */
  function renderReview() {
    var host = U.$('#builder-review', els.root);
    U.clear(host);
    var ch = byId(D.CHALLENGES, state.challenge);
    var picked = state.stakeholders.map(function (id) { return byId(D.STAKEHOLDERS, id); });

    host.appendChild(U.el('dl', { class: 'review' }, [
      U.el('div', { class: 'review__row' }, [
        U.el('dt', { text: 'Challenge' }),
        U.el('dd', { text: ch ? ch.icon + '  ' + ch.name : '—' })
      ]),
      U.el('div', { class: 'review__row' }, [
        U.el('dt', { text: 'Partners' }),
        U.el('dd', { text: picked.map(function (p) { return p.name; }).join(', ') || '—' })
      ]),
      U.el('div', { class: 'review__row' }, [
        U.el('dt', { text: 'Budget' }),
        U.el('dd', { text: U.formatINR(state.budget) })
      ])
    ]));
  }

  function byId(list, id) {
    return list.filter(function (x) { return x.id === id; })[0];
  }

  /* ---------------------------------------------------------------------------
     SCORING
     Four stated components:
       coverage  35%  do the partners cover what the challenge needs?
       capacity  30%  combined institutional weight
       diversity 15%  how many distinct kinds of actor
       resource  20%  budget adequacy
     --------------------------------------------------------------------------- */
  function score() {
    var ch = byId(D.CHALLENGES, state.challenge);
    var picked = state.stakeholders.map(function (id) { return byId(D.STAKEHOLDERS, id); });
    var tier = D.BUDGET_TIERS.filter(function (t) { return t.value === state.budget; })[0] || D.BUDGET_TIERS[3];

    var strengths = {};
    picked.forEach(function (p) {
      p.strengths.forEach(function (s) { strengths[s] = (strengths[s] || 0) + 1; });
    });

    var needs = ch ? ch.needs : [];
    var covered = needs.filter(function (n) { return strengths[n]; });
    var coverage = needs.length ? covered.length / needs.length : 0;

    var capacity = picked.reduce(function (s, p) { return s + p.weight; }, 0) / MAX_WEIGHT;
    var diversity = picked.length / D.STAKEHOLDERS.length;
    var resource = tier.scale;

    var total = (coverage * 0.35 + capacity * 0.30 + diversity * 0.15 + resource * 0.20) * 100;

    return {
      total: U.clamp(total, 0, 100),
      coverage: coverage * 100,
      capacity: capacity * 100,
      diversity: diversity * 100,
      resource: resource * 100,
      strengths: strengths,
      needs: needs,
      missing: needs.filter(function (n) { return !strengths[n]; }),
      picked: picked,
      challenge: ch,
      tier: tier
    };
  }

  /* Turn the numbers into the kind of note a programme officer would write. */
  function feedback(s) {
    var notes = [];
    var ids = s.picked.map(function (p) { return p.id; });

    if (s.missing.length) {
      var names = s.missing.map(function (m) {
        var p = D.PILLARS.filter(function (x) { return x.id === m; })[0];
        return p ? p.name : m;
      });
      notes.push({
        tone: 'warn',
        text: 'This challenge depends on ' + names.join(' and ') +
              ', and no selected partner brings that. Add an actor who does before committing budget.'
      });
    } else {
      notes.push({ tone: 'good', text: 'Every capability this challenge needs is represented in the partnership.' });
    }

    if (ids.indexOf('community') === -1) {
      notes.push({
        tone: 'warn',
        text: 'No community group is at the table. Programmes designed without the people they serve are the ones that stall after handover.'
      });
    } else {
      notes.push({ tone: 'good', text: 'Community representation is present, which is what usually decides whether this survives the funding cliff.' });
    }

    if (ids.indexOf('govt') === -1 && ids.indexOf('intl') === -1) {
      notes.push({
        tone: 'warn',
        text: 'Without a government or international body there is no route to policy change or scale beyond the pilot.'
      });
    }

    if (ids.indexOf('enterprise') === -1 && s.tier.value >= 100000000) {
      notes.push({
        tone: 'info',
        text: 'At ' + s.tier.label + ' the absence of private capital puts the whole burden on grant funding. Consider a blended structure.'
      });
    }

    if (s.picked.length >= 5) {
      notes.push({
        tone: 'info',
        text: 'Five or more partners is broad. Coordination cost is real — name a lead convener early.'
      });
    }

    if (s.resource < 60) {
      notes.push({
        tone: 'warn',
        text: 'The budget is thin relative to the ambition. Either narrow the geography or raise the envelope.'
      });
    }

    return notes;
  }

  /* --- generate ------------------------------------------------------------ */
  function generate() {
    var s = score();

    global.StatusBar.run({
      title: 'Generating strategy report',
      detail: s.challenge ? s.challenge.name : '',
      doneText: 'Partnership strength ' + Math.round(s.total) + '%',
      steps: [
        {
          label: 'Mapping partner capabilities', weight: 2,
          work: function (ctx) {
            ctx.log(s.picked.length + ' partners, ' + Object.keys(s.strengths).length + ' pillars covered');
            return global.Simulators.stepped(ctx, 520);
          }
        },
        {
          label: 'Testing coverage against challenge needs', weight: 2,
          work: function (ctx) {
            ctx.log(s.missing.length ? s.missing.length + ' capability gap(s) found' : 'no capability gaps');
            return global.Simulators.stepped(ctx, 560);
          }
        },
        {
          label: 'Modelling resource adequacy', weight: 2,
          work: function (ctx) {
            ctx.log(U.formatINR(state.budget) + ' across ' + s.picked.length + ' partners');
            return global.Simulators.stepped(ctx, 480);
          }
        },
        {
          label: 'Scoring partnership strength', weight: 3,
          work: function (ctx) {
            ctx.log('composite score ' + s.total.toFixed(1) + '%');
            return global.Simulators.stepped(ctx, 700);
          }
        }
      ]
    }).then(function () {
      renderReport(s);
      global.Gamify.award('partnership-champion', 60, 'Strategy report generated');
    }).catch(function (err) {
      if (!err || !err.cancelled) { console.error(err); }
    });
  }

  function renderReport(s) {
    var host = els.report;
    U.clear(host);
    host.hidden = false;

    host.appendChild(U.el('div', { class: 'report__head' }, [
      U.el('div', {}, [
        U.el('p', { class: 'report__eyebrow', text: 'Strategy report' }),
        U.el('h3', { class: 'report__title', text: s.challenge ? s.challenge.name : 'Partnership' })
      ]),
      U.el('p', { class: 'report__budget', text: U.formatINR(state.budget) })
    ]));

    var scoreWrap = U.el('div', { class: 'report__score' });
    var meterHost = U.el('div', { class: 'report__meter' });
    scoreWrap.appendChild(meterHost);

    var breakdown = U.el('div', { class: 'report__breakdown' });
    scoreWrap.appendChild(breakdown);
    host.appendChild(scoreWrap);

    C.meter(meterHost, { value: s.total, label: 'Partnership strength' });
    C.hbars(breakdown, {
      max: 100,
      rows: [
        { label: 'Capability coverage', value: Math.round(s.coverage), series: 1, note: 'weighted 35%' },
        { label: 'Institutional capacity', value: Math.round(s.capacity), series: 3, note: 'weighted 30%' },
        { label: 'Partner diversity', value: Math.round(s.diversity), series: 4, note: 'weighted 15%' },
        { label: 'Resource adequacy', value: Math.round(s.resource), series: 5, note: 'weighted 20%' }
      ],
      format: function (v) { return v + '%'; }
    });

    host.appendChild(U.el('h4', { class: 'panel__subtitle', text: 'Assessment' }));
    var list = U.el('ul', { class: 'notes' });
    feedback(s).forEach(function (n) {
      list.appendChild(U.el('li', { class: 'note note--' + n.tone }, [
        U.el('span', { class: 'note__icon', 'aria-hidden': 'true',
          text: n.tone === 'good' ? '✓' : n.tone === 'warn' ? '!' : 'i' }),
        U.el('span', { class: 'note__text', text: n.text })
      ]));
    });
    host.appendChild(list);

    host.appendChild(U.el('h4', { class: 'panel__subtitle', text: 'Partners at the table' }));
    var tags = U.el('ul', { class: 'taglist' });
    s.picked.forEach(function (p) {
      tags.appendChild(U.el('li', { class: 'tag' }, [
        U.el('span', { 'aria-hidden': 'true', text: p.icon }), ' ' + p.name
      ]));
    });
    host.appendChild(tags);

    var again = U.el('button', { class: 'btn btn--ghost', type: 'button', text: 'Start a new partnership' });
    again.addEventListener('click', function () {
      state.challenge = null;
      state.stakeholders = [];
      state.budget = D.BUDGET_TIERS[3].value;
      renderChallenges();
      renderStakeholders();
      renderBudgets();
      host.hidden = true;
      go(1, true);
    });
    host.appendChild(U.el('div', { class: 'sim-actions' }, [again]));

    host.scrollIntoView({ behavior: U.prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  global.Ecosystem = { init: init, score: score };
})(window);
