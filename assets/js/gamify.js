/* =============================================================================
   gamify.js - Points, badges, the quiz, the pledge wall and the audience poll.
   All persistence goes through U.Store, which is localStorage with every call
   wrapped - a browser in private mode degrades to session-only, it never throws.
   ============================================================================= */
(function (global) {
  'use strict';

  var U = global.U, D = global.SDG_DATA, C = global.Charts;

  /* ---------------------------------------------------------------------------
     POINTS & BADGES
     --------------------------------------------------------------------------- */

  function award(badgeId, points, reason) {
    var gained = 0;
    var newBadge = null;

    if (points) {
      U.Store.set('points', (U.Store.get('points') || 0) + points);
      gained = points;
    }

    if (badgeId) {
      var have = U.Store.get('badges') || [];
      if (have.indexOf(badgeId) === -1) {
        U.Store.set('badges', have.concat([badgeId]));
        newBadge = D.BADGES.filter(function (b) { return b.id === badgeId; })[0];
      }
    }

    if (newBadge) {
      U.toast('Badge unlocked: ' + newBadge.name, {
        tone: 'badge', icon: newBadge.icon,
        detail: reason ? reason + ' · +' + gained + ' points' : '+' + gained + ' points'
      });
    } else if (gained) {
      U.toast('+' + gained + ' points', { tone: 'info', icon: '✦', detail: reason || '' });
    }

    renderBadges();
    renderPoints();
  }

  function renderPoints() {
    var pts = U.Store.get('points') || 0;
    U.$$('[data-points]').forEach(function (node) {
      node.textContent = U.formatCount(pts);
    });
    var have = (U.Store.get('badges') || []).length;
    U.$$('[data-badge-count]').forEach(function (node) {
      node.textContent = have + ' / ' + D.BADGES.length;
    });
    var bar = U.$('#points-progress');
    if (bar) {
      var pct = U.clamp((have / D.BADGES.length) * 100, 0, 100);
      bar.style.width = pct + '%';
      var wrap = bar.parentNode;
      if (wrap) { wrap.setAttribute('aria-valuenow', String(Math.round(pct))); }
    }
  }

  function renderBadges() {
    var host = U.$('#badge-grid');
    if (!host) { return; }
    var have = U.Store.get('badges') || [];
    U.clear(host);
    D.BADGES.forEach(function (b) {
      var earned = have.indexOf(b.id) !== -1;
      host.appendChild(U.el('li', {
        class: 'badge' + (earned ? ' is-earned' : ''),
        title: earned ? b.name : b.hint
      }, [
        U.el('span', { class: 'badge__icon', 'aria-hidden': 'true', text: b.icon }),
        U.el('span', { class: 'badge__name', text: b.name }),
        U.el('span', { class: 'badge__hint', text: earned ? 'Unlocked' : b.hint })
      ]));
    });
  }

  /* ---------------------------------------------------------------------------
     QUIZ
     --------------------------------------------------------------------------- */

  var quiz = { index: 0, correct: 0, answered: false };

  function initQuiz() {
    var host = U.$('#quiz');
    if (!host) { return; }
    renderQuestion();
  }

  function renderQuestion() {
    var host = U.$('#quiz');
    var q = D.QUIZ[quiz.index];
    U.clear(host);
    quiz.answered = false;

    host.appendChild(U.el('div', { class: 'quiz__meta' }, [
      U.el('span', { class: 'quiz__count', text: 'Question ' + (quiz.index + 1) + ' of ' + D.QUIZ.length }),
      U.el('span', { class: 'quiz__score', text: quiz.correct + ' correct' })
    ]));
    host.appendChild(U.el('h4', { class: 'quiz__question', text: q.q, tabindex: '-1' }));

    var list = U.el('ul', { class: 'quiz__options' });
    q.a.forEach(function (text, i) {
      var btn = U.el('button', { class: 'quiz__option', type: 'button' }, [
        U.el('span', { class: 'quiz__key', 'aria-hidden': 'true', text: String.fromCharCode(65 + i) }),
        U.el('span', { text: text })
      ]);
      btn.addEventListener('click', function () { answer(i, btn, list); });
      list.appendChild(U.el('li', {}, [btn]));
    });
    host.appendChild(list);
    host.appendChild(U.el('div', { class: 'quiz__feedback', id: 'quiz-feedback', 'aria-live': 'polite' }));
  }

  function answer(choice, btn, list) {
    if (quiz.answered) { return; }
    quiz.answered = true;
    var q = D.QUIZ[quiz.index];
    var right = choice === q.correct;
    if (right) { quiz.correct += 1; }

    U.$$('.quiz__option', list).forEach(function (b, i) {
      b.disabled = true;
      if (i === q.correct) { b.classList.add('is-correct'); }
      else if (i === choice) { b.classList.add('is-wrong'); }
    });

    var fb = U.$('#quiz-feedback');
    U.clear(fb);
    fb.appendChild(U.el('p', { class: 'quiz__verdict ' + (right ? 'is-right' : 'is-wrong'),
      text: right ? '✓ Correct' : '✕ Not quite' }));
    fb.appendChild(U.el('p', { class: 'quiz__why', text: q.why }));

    award(null, right ? 20 : 5, right ? 'Correct answer' : 'Good attempt');

    var next = U.el('button', {
      class: 'btn btn--primary', type: 'button',
      text: quiz.index === D.QUIZ.length - 1 ? 'See result' : 'Next question'
    });
    next.addEventListener('click', function () {
      if (quiz.index === D.QUIZ.length - 1) { finishQuiz(); }
      else { quiz.index += 1; renderQuestion(); U.$('.quiz__question').focus(); }
    });
    fb.appendChild(next);
  }

  function finishQuiz() {
    var host = U.$('#quiz');
    var best = Math.max(U.Store.get('quizBest') || 0, quiz.correct);
    U.Store.set('quizBest', best);

    U.clear(host);
    host.appendChild(U.el('div', { class: 'quiz__result' }, [
      U.el('p', { class: 'quiz__result-score', text: quiz.correct + ' / ' + D.QUIZ.length }),
      U.el('p', { class: 'quiz__result-label',
        text: quiz.correct >= 5 ? 'You know SDG 17 well.'
            : quiz.correct >= 3 ? 'A solid working grasp.'
            : 'Worth another pass through the pillars.' }),
      U.el('p', { class: 'quiz__result-best', text: 'Best score this browser: ' + best + ' / ' + D.QUIZ.length })
    ]));

    if (quiz.correct >= 5) { award('quiz-master', 50, 'Scored ' + quiz.correct + ' of ' + D.QUIZ.length); }

    var again = U.el('button', { class: 'btn btn--ghost', type: 'button', text: 'Try again' });
    again.addEventListener('click', function () {
      quiz.index = 0; quiz.correct = 0; renderQuestion();
    });
    host.appendChild(again);
  }

  /* ---------------------------------------------------------------------------
     PLEDGE WALL
     --------------------------------------------------------------------------- */

  function initPledges() {
    var form = U.$('#pledge-form');
    if (!form) { return; }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var name = U.$('#pledge-name').value.trim();
      var role = U.$('#pledge-role').value;
      var text = U.$('#pledge-text').value.trim();
      var err = U.$('#pledge-error');

      if (name.length < 2) { return fail(err, 'Please enter a name of at least two characters.', '#pledge-name'); }
      if (text.length < 12) { return fail(err, 'A pledge needs a bit more detail — at least twelve characters.', '#pledge-text'); }
      if (text.length > 240) { return fail(err, 'Please keep the pledge under 240 characters.', '#pledge-text'); }

      err.textContent = '';
      U.Store.update('pledges', function (list) {
        return [{ name: name, role: role, text: text, at: Date.now() }].concat(list || []);
      });
      form.reset();
      renderPledges();
      award('pledge-maker', 45, 'Pledge posted to the wall');
      U.$('#pledge-count').focus();
    });
  }

  function fail(errNode, message, focusSel) {
    errNode.textContent = message;
    var target = U.$(focusSel);
    if (target) { target.focus(); }
    return false;
  }

  function renderPledges() {
    var host = U.$('#pledge-wall');
    if (!host) { return; }
    var mine = U.Store.get('pledges') || [];
    var all = mine.concat(D.SEED_PLEDGES);

    U.clear(host);
    all.forEach(function (p, i) {
      host.appendChild(U.el('li', {
        class: 'pledge' + (p.seeded ? '' : ' pledge--mine'),
        style: '--i:' + Math.min(i, 8)
      }, [
        U.el('p', { class: 'pledge__text', text: '“' + p.text + '”' }),
        U.el('div', { class: 'pledge__foot' }, [
          U.el('span', { class: 'pledge__name', text: p.name }),
          U.el('span', { class: 'pledge__role', text: p.role })
        ]),
        p.seeded ? null : U.el('span', { class: 'pledge__tag', text: 'Yours' })
      ]));
    });

    var count = U.$('#pledge-count');
    if (count) {
      count.textContent = all.length + ' pledge' + (all.length === 1 ? '' : 's') + ' on the wall';
    }
  }

  /* ---------------------------------------------------------------------------
     AUDIENCE POLL
     Real votes from this browser are added to a simulated baseline so the chart
     is never empty in front of a room. The simulation is disclosed in the UI -
     a chart that quietly invents numbers is the thing this project is against.
     --------------------------------------------------------------------------- */

  var pollDrift = {};

  function initPoll() {
    var host = U.$('#poll-options');
    if (!host) { return; }

    D.POLL.options.forEach(function (o) { pollDrift[o.id] = 0; });

    U.clear(host);
    D.POLL.options.forEach(function (o) {
      var btn = U.el('button', {
        class: 'poll-option', type: 'button', 'data-id': o.id, text: o.label
      });
      btn.addEventListener('click', function () { vote(o.id); });
      host.appendChild(btn);
    });

    renderPoll();

    /* Gentle drift so a live demo looks alive without faking a scale. */
    if (!U.prefersReducedMotion()) {
      setInterval(function () {
        var pick = D.POLL.options[Math.floor(Math.random() * D.POLL.options.length)];
        pollDrift[pick.id] += Math.random() < 0.7 ? 1 : 2;
        renderPoll();
      }, 4200);
    }
  }

  function vote(id) {
    var prev = U.Store.get('myVote');
    var votes = Object.assign({}, U.Store.get('pollVotes') || {});
    if (prev) { votes[prev] = Math.max(0, (votes[prev] || 1) - 1); }
    votes[id] = (votes[id] || 0) + 1;
    U.Store.set({ pollVotes: votes, myVote: id });
    renderPoll();
    award(null, prev ? 0 : 15, prev ? null : 'Voted in the live poll');
    if (prev) { U.toast('Vote changed', { tone: 'info', icon: '↺' }); }
  }

  function renderPoll() {
    var host = U.$('#poll-chart');
    if (!host) { return; }
    var mine = U.Store.get('pollVotes') || {};
    var myVote = U.Store.get('myVote');

    var rows = D.POLL.options.map(function (o, i) {
      return {
        label: o.label,
        value: o.base + (pollDrift[o.id] || 0) + (mine[o.id] || 0),
        series: (i % 5) + 1,
        active: o.id === myVote,
        note: o.id === myVote ? 'Your vote' : null
      };
    });

    C.hbars(host, { rows: rows, format: function (v) { return Math.round(v) + ' votes'; } });

    U.$$('.poll-option').forEach(function (b) {
      var on = b.getAttribute('data-id') === myVote;
      b.classList.toggle('is-voted', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    var total = rows.reduce(function (s, r) { return s + r.value; }, 0);
    var out = U.$('#poll-total');
    if (out) { out.textContent = U.formatCount(total) + ' responses'; }
  }

  /* ---------------------------------------------------------------------------
     BOOT
     --------------------------------------------------------------------------- */

  function init() {
    renderPoints();
    renderBadges();
    initQuiz();
    initPledges();
    renderPledges();
    initPoll();
    U.Store.on('points', renderPoints);
  }

  function reset() {
    quiz = { index: 0, correct: 0, answered: false };
    D.POLL.options.forEach(function (o) { pollDrift[o.id] = 0; });
    renderPoints();
    renderBadges();
    renderQuestion();
    renderPledges();
    renderPoll();
  }

  global.Gamify = {
    init: init,
    award: award,
    reset: reset,
    renderPledges: renderPledges,
    renderBadges: renderBadges
  };
})(window);
