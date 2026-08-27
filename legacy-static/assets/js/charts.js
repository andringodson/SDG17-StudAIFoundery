/* =============================================================================
   charts.js - Hand-rolled SVG chart primitives. No Chart.js, no D3, no CDN.
   Everything renders from local data so the deck survives a dead conference
   wifi connection.

   Colour is never set in JS. Marks carry data-series="1..5" and the stylesheet
   paints them, so light/dark swap in one place. The categorical order is fixed
   and never cycled - a sixth series folds into "Other".
   ============================================================================= */
(function (global) {
  'use strict';

  var U = global.U;
  var svgEl = U.svgEl;

  /* ---------------------------------------------------------------------------
     SHARED TOOLTIP - one node reused by every chart.
     --------------------------------------------------------------------------- */

  var tip = null;

  function ensureTip() {
    if (tip) { return tip; }
    tip = U.el('div', { class: 'chart-tip', role: 'presentation', 'aria-hidden': 'true' });
    document.body.appendChild(tip);
    return tip;
  }

  function showTip(html, x, y) {
    var node = ensureTip();
    node.innerHTML = html;
    node.classList.add('is-on');
    var rect = node.getBoundingClientRect();
    var left = U.clamp(x - rect.width / 2, 8, global.innerWidth - rect.width - 8);
    var top = y - rect.height - 14;
    if (top < 8) { top = y + 18; }
    node.style.transform = 'translate(' + Math.round(left) + 'px,' + Math.round(top) + 'px)';
  }

  function hideTip() {
    if (tip) { tip.classList.remove('is-on'); }
  }

  /* Wire hover + keyboard focus on a mark to the shared tooltip. */
  function bindTip(node, htmlFn) {
    function place(ev) {
      var r = node.getBoundingClientRect();
      var x = ev && ev.clientX ? ev.clientX : r.left + r.width / 2;
      var y = r.top;
      showTip(htmlFn(), x, y);
    }
    node.addEventListener('mouseenter', place);
    node.addEventListener('mousemove', place);
    node.addEventListener('mouseleave', hideTip);
    node.addEventListener('focus', function () {
      var r = node.getBoundingClientRect();
      showTip(htmlFn(), r.left + r.width / 2, r.top);
    });
    node.addEventListener('blur', hideTip);
  }

  function tipHTML(label, value, note) {
    return '<span class="chart-tip__label">' + U.escapeHTML(label) + '</span>' +
           '<span class="chart-tip__value">' + U.escapeHTML(value) + '</span>' +
           (note ? '<span class="chart-tip__note">' + U.escapeHTML(note) + '</span>' : '');
  }

  /* ---------------------------------------------------------------------------
     DONUT - part-to-whole. Segments carry a 2px surface gap so adjacent fills
     never touch. Hero number sits in the hole.
     --------------------------------------------------------------------------- */

  function donut(host, opts) {
    U.clear(host);
    var data = opts.segments || [];
    var total = data.reduce(function (s, d) { return s + d.value; }, 0) || 1;
    var size = 260, cx = size / 2, cy = size / 2;
    var outer = 104, inner = 68;

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + size + ' ' + size,
      class: 'chart chart--donut',
      role: 'img',
      'aria-label': opts.ariaLabel || 'Distribution chart'
    });

    /* 2px gap expressed in degrees at the outer radius. */
    var gapDeg = (2 / outer) * (180 / Math.PI);
    var angle = -90;

    data.forEach(function (d, i) {
      var sweep = (d.value / total) * 360;
      if (sweep <= 0) { return; }
      var a0 = angle + gapDeg / 2;
      var a1 = angle + sweep - gapDeg / 2;
      if (a1 <= a0) { a1 = a0 + 0.4; }
      var path = svgEl('path', {
        d: arcPath(cx, cy, inner, outer, a0, a1),
        class: 'donut__seg',
        'data-series': (i % 5) + 1,
        tabindex: '0',
        role: 'listitem',
        'aria-label': d.label + ': ' + (opts.format ? opts.format(d.value) : d.value)
      });
      bindTip(path, function () {
        return tipHTML(d.label,
          opts.format ? opts.format(d.value) : String(d.value),
          Math.round((d.value / total) * 100) + '% of total');
      });
      svg.appendChild(path);
      angle += sweep;
    });

    if (opts.centerValue) {
      svg.appendChild(svgEl('text', {
        x: cx, y: cy - 2, class: 'donut__value', 'text-anchor': 'middle',
        text: opts.centerValue
      }));
      svg.appendChild(svgEl('text', {
        x: cx, y: cy + 20, class: 'donut__label', 'text-anchor': 'middle',
        text: opts.centerLabel || ''
      }));
    }

    host.appendChild(svg);

    /* Legend - always present for >= 2 series, so identity is never colour-alone. */
    if (data.length > 1) {
      var legend = U.el('ul', { class: 'legend', 'aria-label': 'Chart legend' });
      data.forEach(function (d, i) {
        legend.appendChild(U.el('li', { class: 'legend__item' }, [
          U.el('span', { class: 'legend__swatch', 'data-series': (i % 5) + 1, 'aria-hidden': 'true' }),
          U.el('span', { class: 'legend__text', text: d.label }),
          U.el('span', { class: 'legend__val', text: opts.format ? opts.format(d.value) : String(d.value) })
        ]));
      });
      host.appendChild(legend);
    }
    return svg;
  }

  /* Annulus wedge path between two radii and two angles (degrees). */
  function arcPath(cx, cy, r0, r1, a0, a1) {
    var p0 = polar(cx, cy, r1, a0), p1 = polar(cx, cy, r1, a1);
    var p2 = polar(cx, cy, r0, a1), p3 = polar(cx, cy, r0, a0);
    var large = (a1 - a0) > 180 ? 1 : 0;
    return [
      'M', p0.x, p0.y,
      'A', r1, r1, 0, large, 1, p1.x, p1.y,
      'L', p2.x, p2.y,
      'A', r0, r0, 0, large, 0, p3.x, p3.y,
      'Z'
    ].join(' ');
  }

  function polar(cx, cy, r, deg) {
    var rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  /* ---------------------------------------------------------------------------
     HORIZONTAL BARS - ranked magnitude. Rounded data-end, labels always visible
     so the chart reads without relying on colour.
     --------------------------------------------------------------------------- */

  function hbars(host, opts) {
    U.clear(host);
    var rows = opts.rows || [];
    var max = opts.max || Math.max.apply(null, rows.map(function (r) { return r.value; })) || 1;
    var list = U.el('div', { class: 'hbars', role: 'list' });

    rows.forEach(function (r, i) {
      var pct = U.clamp((r.value / max) * 100, 0, 100);
      var fill = U.el('span', {
        class: 'hbar__fill',
        'data-series': r.series || ((i % 5) + 1),
        style: 'width:0%'
      });
      var row = U.el('div', {
        class: 'hbar' + (r.active ? ' is-active' : ''),
        role: 'listitem',
        tabindex: '0',
        'aria-label': r.label + ': ' + (opts.format ? opts.format(r.value) : r.value)
      }, [
        U.el('span', { class: 'hbar__label', text: r.label }),
        U.el('span', { class: 'hbar__track' }, [fill]),
        U.el('span', { class: 'hbar__value', text: opts.format ? opts.format(r.value) : String(r.value) })
      ]);
      bindTip(row, function () {
        return tipHTML(r.label,
          opts.format ? opts.format(r.value) : String(r.value),
          r.note || (Math.round(pct) + '% of leader'));
      });
      list.appendChild(row);
      /* Grow on next frame so the transition actually plays. */
      requestAnimationFrame(function () {
        fill.style.width = pct + '%';
      });
    });

    host.appendChild(list);
    return list;
  }

  /* ---------------------------------------------------------------------------
     COLUMNS - change over an ordered dimension. Single series, so no legend;
     the figure title names it.
     --------------------------------------------------------------------------- */

  function columns(host, opts) {
    U.clear(host);
    var pts = opts.points || [];
    var w = 560, h = 220, padL = 46, padR = 12, padT = 16, padB = 30;
    var plotW = w - padL - padR, plotH = h - padT - padB;
    var max = Math.max.apply(null, pts.map(function (p) { return p.value; })) || 1;
    var niceMax = niceCeil(max);

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + w + ' ' + h, class: 'chart chart--columns',
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img', 'aria-label': opts.ariaLabel || 'Column chart'
    });

    /* Recessive gridlines + y labels. */
    [0, 0.5, 1].forEach(function (t) {
      var y = padT + plotH - t * plotH;
      svg.appendChild(svgEl('line', {
        x1: padL, y1: y, x2: w - padR, y2: y, class: 'grid-line'
      }));
      svg.appendChild(svgEl('text', {
        x: padL - 10, y: y + 4, class: 'axis-label', 'text-anchor': 'end',
        text: opts.format ? opts.format(niceMax * t) : String(Math.round(niceMax * t))
      }));
    });

    var slot = plotW / pts.length;
    var barW = Math.min(46, slot * 0.58);

    pts.forEach(function (p, i) {
      var bh = (p.value / niceMax) * plotH;
      var x = padL + slot * i + (slot - barW) / 2;
      var y = padT + plotH - bh;
      var rect = svgEl('rect', {
        x: x, y: y, width: barW, height: Math.max(bh, 2),
        rx: 4, class: 'column', 'data-series': p.series || 1,
        tabindex: '0', role: 'listitem',
        'aria-label': p.label + ': ' + (opts.format ? opts.format(p.value) : p.value)
      });
      bindTip(rect, function () {
        return tipHTML(p.label, opts.format ? opts.format(p.value) : String(p.value), p.note);
      });
      svg.appendChild(rect);
      svg.appendChild(svgEl('text', {
        x: x + barW / 2, y: h - 10, class: 'axis-label', 'text-anchor': 'middle',
        text: p.label
      }));
    });

    host.appendChild(svg);
    return svg;
  }

  /* Round an axis maximum up to something a human would pick. */
  function niceCeil(n) {
    if (n <= 0) { return 1; }
    var mag = Math.pow(10, Math.floor(Math.log10(n)));
    var norm = n / mag;
    var step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
    return step * mag;
  }

  /* ---------------------------------------------------------------------------
     METER - one bounded score, 0..100. Status colour by band, always paired
     with a text label so colour is never the only signal.
     --------------------------------------------------------------------------- */

  function meter(host, opts) {
    U.clear(host);
    var value = U.clamp(opts.value || 0, 0, 100);
    var band = value >= 75 ? 'good' : value >= 50 ? 'warn' : 'low';
    var bandText = value >= 75 ? 'Strong' : value >= 50 ? 'Developing' : 'Needs work';

    var size = 168, cx = size / 2, cy = size / 2, r = 66;
    var circumference = Math.PI * r; /* half circle */

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + size + ' ' + (size * 0.62),
      class: 'chart chart--meter', 'data-band': band,
      role: 'img',
      'aria-label': (opts.label || 'Score') + ': ' + Math.round(value) + ' out of 100, ' + bandText
    });

    svg.appendChild(svgEl('path', {
      d: arcLine(cx, cy, r, 180, 360), class: 'meter__track'
    }));
    var arc = svgEl('path', {
      d: arcLine(cx, cy, r, 180, 360), class: 'meter__value',
      'stroke-dasharray': circumference,
      'stroke-dashoffset': circumference
    });
    svg.appendChild(arc);
    svg.appendChild(svgEl('text', {
      x: cx, y: cy - 4, class: 'meter__num', 'text-anchor': 'middle',
      text: Math.round(value) + '%'
    }));
    svg.appendChild(svgEl('text', {
      x: cx, y: cy + 16, class: 'meter__band', 'text-anchor': 'middle', text: bandText
    }));

    host.appendChild(svg);

    requestAnimationFrame(function () {
      arc.style.strokeDashoffset = String(circumference * (1 - value / 100));
    });
    return svg;
  }

  function arcLine(cx, cy, r, a0, a1) {
    var p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1);
    var large = (a1 - a0) > 180 ? 1 : 0;
    return ['M', p0.x, p0.y, 'A', r, r, 0, large, 1, p1.x, p1.y].join(' ');
  }

  /* ---------------------------------------------------------------------------
     SPARK AREA - a small trend behind a KPI. Decorative support for the number,
     so it is aria-hidden and carries no tooltip.
     --------------------------------------------------------------------------- */

  function spark(host, values) {
    U.clear(host);
    var w = 120, h = 32;
    var max = Math.max.apply(null, values) || 1;
    var min = Math.min.apply(null, values);
    var span = (max - min) || 1;
    var pts = values.map(function (v, i) {
      return [(i / (values.length - 1)) * w, h - ((v - min) / span) * (h - 4) - 2];
    });
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var svg = svgEl('svg', {
      viewBox: '0 0 ' + w + ' ' + h, class: 'chart chart--spark', 'aria-hidden': 'true'
    }, [
      svgEl('path', { d: d + ' L' + w + ' ' + h + ' L0 ' + h + ' Z', class: 'spark__fill' }),
      svgEl('path', { d: d, class: 'spark__line' })
    ]);
    host.appendChild(svg);
    return svg;
  }

  global.Charts = {
    donut: donut,
    hbars: hbars,
    columns: columns,
    meter: meter,
    spark: spark,
    hideTip: hideTip,
    polar: polar
  };
})(window);
