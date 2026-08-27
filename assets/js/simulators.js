/* =============================================================================
   simulators.js - The three interactive engines:
     1. Finance Impact Simulator  (logarithmic INR slider -> KPIs + charts)
     2. Fair Trade Simulator      (policy levers -> growth / jobs / sustainability)
     3. Capacity Learning Path    (role -> sequenced skill track)
   ============================================================================= */
(function (global) {
  'use strict';

  var U = global.U, D = global.SDG_DATA, C = global.Charts;

  /* ---------------------------------------------------------------------------
     1. FINANCE IMPACT SIMULATOR
     Slider range ₹10 Lakh .. ₹50 Crore on a logarithmic scale, because a linear
     slider would spend 98% of its travel above ₹1 Crore and make the low end
     unusable.
     --------------------------------------------------------------------------- */

  var MIN_BUDGET = 1000000;    /* ₹10 Lakh */
  var MAX_BUDGET = 500000000;  /* ₹50 Crore */
  var SLIDER_STEPS = 1000;

  function sliderToBudget(pos) {
    var t = U.clamp(pos / SLIDER_STEPS, 0, 1);
    var logMin = Math.log10(MIN_BUDGET), logMax = Math.log10(MAX_BUDGET);
    return Math.pow(10, logMin + t * (logMax - logMin));
  }

  function budgetToSlider(budget) {
    var logMin = Math.log10(MIN_BUDGET), logMax = Math.log10(MAX_BUDGET);
    var t = (Math.log10(U.clamp(budget, MIN_BUDGET, MAX_BUDGET)) - logMin) / (logMax - logMin);
    return Math.round(t * SLIDER_STEPS);
  }

  /* The three formulae, exactly as specified. */
  function financeModel(budget) {
    var projects = budget * 0.000025;
    var communities = projects * 200;
    var impact = Math.min(99, 40 + Math.log10(budget) * 7.5);
    return {
      budget: budget,
      projects: Math.round(projects),
      communities: Math.round(communities),
      impact: impact
    };
  }

  var financeEls = {};
  var lastModel = null;

  function initFinance() {
    var root = U.$('#finance-sim');
    if (!root) { return; }

    financeEls = {
      root: root,
      slider: U.$('#budget-slider', root),
      readout: U.$('#budget-readout', root),
      exact: U.$('#budget-exact', root),
      projects: U.$('[data-kpi="projects"] .kpi__value', root),
      communities: U.$('[data-kpi="communities"] .kpi__value', root),
      impact: U.$('[data-kpi="impact"] .kpi__value', root),
      meter: U.$('#impact-meter', root),
      alloc: U.$('#finance-alloc', root),
      breakdown: U.$('#finance-breakdown', root),
      run: U.$('#run-projection', root)
    };

    var stored = U.Store.get('financeBudget') || 100000000;
    financeEls.slider.min = 0;
    financeEls.slider.max = SLIDER_STEPS;
    financeEls.slider.value = budgetToSlider(stored);

    financeEls.slider.addEventListener('input', function () {
      updateFinance(sliderToBudget(Number(financeEls.slider.value)), false);
    });
    financeEls.slider.addEventListener('change', function () {
      U.Store.set('financeBudget', Math.round(sliderToBudget(Number(financeEls.slider.value))));
    });

    /* Preset chips give the audience round numbers to jump between. */
    U.$$('[data-budget-preset]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = Number(btn.getAttribute('data-budget-preset'));
        financeEls.slider.value = budgetToSlider(v);
        updateFinance(v, true);
        U.Store.set('financeBudget', v);
      });
    });

    financeEls.run.addEventListener('click', runProjection);

    updateFinance(stored, true);
  }

  function updateFinance(budget, immediate) {
    var m = financeModel(budget);
    var prev = lastModel || { projects: 0, communities: 0, impact: 0 };
    lastModel = m;

    financeEls.readout.textContent = U.formatINRShort(budget);
    financeEls.exact.textContent = U.formatINR(budget);

    var dur = immediate ? 620 : 0; /* dragging should feel instant */
    U.countUp(financeEls.projects, prev.projects, m.projects, dur, U.formatCount);
    U.countUp(financeEls.communities, prev.communities, m.communities, dur, U.formatCountShort);
    financeEls.impact.textContent = m.impact.toFixed(1) + '%';

    C.meter(financeEls.meter, { value: m.impact, label: 'Impact score' });

    /* Allocation scales with the budget so the chart moves with the slider. */
    var base = D.PILLARS[0].allocation;
    var factor = budget / 100000000; /* relative to the ₹10 Crore default */
    C.donut(financeEls.alloc, {
      segments: base.map(function (a) {
        return { label: a.label, value: Math.round(a.value * factor) };
      }),
      centerValue: U.formatINRShort(budget),
      centerLabel: 'deployed',
      format: function (v) { return U.formatINRShort(v * 100000); },
      ariaLabel: 'Allocation of ' + U.formatINR(budget) + ' across funding channels'
    });
  }

  /* The projection button is what exercises the status bar in front of an
     audience: five weighted steps, one deliberately recoverable. */
  function runProjection() {
    var budget = sliderToBudget(Number(financeEls.slider.value));
    var m = financeModel(budget);

    global.StatusBar.run({
      title: 'Running impact projection',
      detail: U.formatINR(budget),
      doneText: U.formatCount(m.projects) + ' projects modelled across ' +
                U.formatCountShort(m.communities) + ' communities',
      steps: [
        {
          label: 'Validating budget envelope', weight: 1,
          work: function (ctx) {
            ctx.log(U.formatINR(budget) + ' within ₹10 Lakh–₹50 Crore band');
            return stepped(ctx, 260);
          }
        },
        {
          label: 'Allocating across five channels', weight: 2,
          work: function (ctx) {
            ctx.log('grants, loans, private, domestic, blended');
            return stepped(ctx, 520);
          }
        },
        {
          label: 'Fetching regional cost baselines', weight: 2,
          work: function (ctx) {
            ctx.indeterminate();
            return U.sleep(460).then(function () {
              /* Simulated network reach that always falls back cleanly. */
              var err = new Error('remote baseline unavailable');
              err.recoverable = true;
              throw err;
            });
          }
        },
        {
          label: 'Modelling community reach', weight: 3,
          work: function (ctx) {
            ctx.log(U.formatCount(m.projects) + ' projects × 200 communities');
            return stepped(ctx, 700);
          }
        },
        {
          label: 'Scoring impact confidence', weight: 2,
          work: function (ctx) {
            ctx.log('impact score ' + m.impact.toFixed(1) + '%');
            return stepped(ctx, 480);
          }
        }
      ]
    }).then(function () {
      global.Gamify.award('finance-explorer', 40, 'Projection complete');
      renderBreakdown(m);
    }).catch(function (err) {
      if (!err || !err.cancelled) { console.error(err); }
    });
  }

  /* Drive ctx.progress smoothly across a step's duration. */
  function stepped(ctx, ms) {
    return new Promise(function (resolve) {
      var start = performance.now();
      (function tick(now) {
        if (ctx.cancelled) { return resolve(); }
        var t = U.clamp(((now || start) - start) / ms, 0, 1);
        ctx.progress(t);
        if (t < 1) { requestAnimationFrame(tick); } else { resolve(); }
      })(start);
    });
  }

  function renderBreakdown(m) {
    var host = financeEls.breakdown;
    if (!host) { return; }
    host.hidden = false;
    U.clear(host);
    host.appendChild(U.el('h4', { class: 'panel__subtitle', text: 'Projected regional distribution' }));
    var chartHost = U.el('div');
    host.appendChild(chartHost);

    var totalWeight = D.REGIONS.reduce(function (s, r) { return s + r.projects; }, 0);
    C.hbars(chartHost, {
      rows: D.REGIONS.map(function (r, i) {
        return {
          label: r.name,
          value: Math.round(m.projects * (r.projects / totalWeight)),
          series: (i % 5) + 1,
          note: r.focus
        };
      }),
      format: U.formatCount
    });
  }

  /* ---------------------------------------------------------------------------
     2. FAIR TRADE SIMULATOR
     Three levers produce three scores. Deliberately simple and legible - the
     point is to show the trade-offs, not to pretend at econometrics.
     --------------------------------------------------------------------------- */

  function tradeModel(tariffCut, infra, certification) {
    /* tariffCut 0..100 (%), infra 0..100 (index), certification 0..100 (%) */
    var growth = U.clamp(28 + tariffCut * 0.42 + infra * 0.22 - certification * 0.06, 0, 100);
    var jobs = U.clamp(20 + infra * 0.46 + certification * 0.20 + tariffCut * 0.14, 0, 100);
    var sustain = U.clamp(18 + certification * 0.58 + infra * 0.16 - tariffCut * 0.10, 0, 100);
    var balance = 100 - (Math.max(growth, jobs, sustain) - Math.min(growth, jobs, sustain));
    return { growth: growth, jobs: jobs, sustain: sustain, balance: U.clamp(balance, 0, 100) };
  }

  function mountTrade(host) {
    U.clear(host);
    var state = { tariff: 40, infra: 55, cert: 50 };

    var controls = U.el('div', { class: 'sim-controls' });
    var out = U.el('div', { class: 'sim-out' });

    [
      { key: 'tariff', label: 'Tariff reduction', unit: '%', hint: 'Lower barriers into export markets' },
      { key: 'infra', label: 'Logistics investment', unit: '', hint: 'Ports, cold chain, customs systems' },
      { key: 'cert', label: 'Fair-trade certification', unit: '%', hint: 'Wage floors and environmental standards' }
    ].forEach(function (cfg) {
      var val = U.el('span', { class: 'sim-control__val', text: state[cfg.key] + (cfg.unit || '') });
      var input = U.el('input', {
        type: 'range', min: '0', max: '100', value: String(state[cfg.key]),
        class: 'slider', id: 'trade-' + cfg.key,
        'aria-describedby': 'trade-hint-' + cfg.key
      });
      input.addEventListener('input', function () {
        state[cfg.key] = Number(input.value);
        val.textContent = input.value + (cfg.unit || '');
        render();
      });
      controls.appendChild(U.el('div', { class: 'sim-control' }, [
        U.el('div', { class: 'sim-control__head' }, [
          U.el('label', { class: 'sim-control__label', for: 'trade-' + cfg.key, text: cfg.label }),
          val
        ]),
        input,
        U.el('p', { class: 'sim-control__hint', id: 'trade-hint-' + cfg.key, text: cfg.hint })
      ]));
    });

    var runBtn = U.el('button', { class: 'btn btn--primary', type: 'button', text: 'Run trade scenario' });
    runBtn.addEventListener('click', function () {
      var m = tradeModel(state.tariff, state.infra, state.cert);
      global.StatusBar.run({
        title: 'Simulating trade scenario',
        doneText: 'Balance score ' + Math.round(m.balance) + '%',
        steps: [
          { label: 'Applying tariff schedule', work: function (c) { return stepped(c, 420); } },
          { label: 'Costing logistics corridors', weight: 2, work: function (c) { return stepped(c, 620); } },
          { label: 'Auditing certification compliance', weight: 2, work: function (c) { return stepped(c, 560); } },
          { label: 'Scoring outcomes', work: function (c) { return stepped(c, 380); } }
        ]
      }).then(function () {
        global.Gamify.award('fair-trade', 35, 'Trade scenario modelled');
      }).catch(function () { /* cancelled - nothing to do */ });
    });

    host.appendChild(U.el('div', { class: 'sim-grid' }, [controls, out]));
    host.appendChild(U.el('div', { class: 'sim-actions' }, [runBtn]));

    function render() {
      var m = tradeModel(state.tariff, state.infra, state.cert);
      U.clear(out);
      out.appendChild(U.el('h4', { class: 'panel__subtitle', text: 'Projected outcomes' }));
      var bars = U.el('div');
      out.appendChild(bars);
      C.hbars(bars, {
        max: 100,
        rows: [
          { label: 'Economic growth', value: Math.round(m.growth), series: 1 },
          { label: 'Job creation', value: Math.round(m.jobs), series: 3 },
          { label: 'Sustainability', value: Math.round(m.sustain), series: 4 }
        ],
        format: function (v) { return v + '%'; }
      });
      out.appendChild(U.el('p', { class: 'sim-verdict', text: tradeVerdict(m) }));
    }

    render();
  }

  function tradeVerdict(m) {
    if (m.sustain < 40) {
      return 'Growth is being bought with environmental and labour cost. Raise certification before scaling volume.';
    }
    if (m.growth < 40) {
      return 'Standards are strong but market access is thin. Tariff relief would let producers actually sell.';
    }
    if (m.balance > 80) {
      return 'Well balanced. Growth, employment and sustainability are moving together rather than trading off.';
    }
    return 'Workable, but uneven. The weakest of the three scores is what will limit this in practice.';
  }

  /* ---------------------------------------------------------------------------
     3. CAPACITY BUILDING - role-based learning path
     --------------------------------------------------------------------------- */

  function mountLearning(host) {
    U.clear(host);
    var roles = Object.keys(D.LEARNING_PATHS);
    var active = null;

    var picker = U.el('div', { class: 'role-picker', role: 'group', 'aria-label': 'Choose a role' });
    var pathHost = U.el('div', { class: 'path-host' });

    roles.forEach(function (id) {
      var role = D.LEARNING_PATHS[id];
      var btn = U.el('button', {
        class: 'role-chip', type: 'button', 'data-role': id, 'aria-pressed': 'false'
      }, [
        U.el('span', { class: 'role-chip__icon', 'aria-hidden': 'true', text: role.icon }),
        U.el('span', { text: role.name })
      ]);
      btn.addEventListener('click', function () { select(id); });
      picker.appendChild(btn);
    });

    host.appendChild(picker);
    host.appendChild(pathHost);

    function select(id) {
      active = id;
      U.$$('.role-chip', picker).forEach(function (b) {
        var on = b.getAttribute('data-role') === id;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      renderPath(id);
      global.Gamify.award('skill-builder', 30, 'Learning path built');
    }

    function renderPath(id) {
      var role = D.LEARNING_PATHS[id];
      U.clear(pathHost);
      pathHost.appendChild(U.el('h4', { class: 'panel__subtitle', text: role.name + ' pathway' }));
      var ol = U.el('ol', { class: 'path' });
      role.steps.forEach(function (step, i) {
        var li = U.el('li', { class: 'path__step', style: '--i:' + i }, [
          U.el('span', { class: 'path__num', 'aria-hidden': 'true', text: String(i + 1) }),
          U.el('div', { class: 'path__body' }, [
            U.el('p', { class: 'path__label', text: step }),
            U.el('p', { class: 'path__meta', text: 'Stage ' + (i + 1) + ' of ' + role.steps.length })
          ])
        ]);
        ol.appendChild(li);
      });
      pathHost.appendChild(ol);
    }

    renderPath('student');
    U.$$('.role-chip', picker)[0].classList.add('is-active');
    U.$$('.role-chip', picker)[0].setAttribute('aria-pressed', 'true');
  }

  global.Simulators = {
    initFinance: initFinance,
    mountTrade: mountTrade,
    mountLearning: mountLearning,
    financeModel: financeModel,
    tradeModel: tradeModel,
    stepped: stepped
  };
})(window);
