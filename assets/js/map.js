/* =============================================================================
   map.js - The interactive global partnership map.

   Deliberately low-poly: this is a diagram of where partnerships sit, not an
   atlas. Continents are traced from a handful of [lon,lat] points and projected
   equirectangularly, which keeps the whole thing offline and under a kilobyte
   of geometry.

   Encoding note: region nodes carry a SEQUENTIAL blue ramp keyed to funding and
   are SIZED by project count. They are not categorical - five independent hues
   read side by side would fail colour-vision separation on an all-pairs basis.
   ============================================================================= */
(function (global) {
  'use strict';

  var U = global.U, D = global.SDG_DATA;
  var svgEl = U.svgEl;

  var VB_W = 1000, VB_H = 500;
  var activeFilter = 'all';
  var activeRegion = null;
  var nodeEls = {};

  /* Equirectangular projection into the viewBox. */
  function project(lon, lat) {
    return {
      x: ((Number(lon) + 180) / 360) * VB_W,
      y: ((90 - Number(lat)) / 180) * VB_H
    };
  }

  function init() {
    var host = U.$('#map-canvas');
    if (!host) { return; }
    render(host);
    buildFilters();
    renderDashboard();
  }

  function render(host) {
    U.clear(host);
    nodeEls = {};

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + VB_W + ' ' + VB_H,
      class: 'worldmap',
      preserveAspectRatio: 'xMidYMid meet',
      role: 'group',
      'aria-label': 'Interactive map of regional partnership activity'
    });

    /* --- graticule ------------------------------------------------------- */
    var grid = svgEl('g', { class: 'map__grid', 'aria-hidden': 'true' });
    for (var lon = -180; lon <= 180; lon += 30) {
      var a = project(lon, 90), b = project(lon, -90);
      grid.appendChild(svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y }));
    }
    for (var lat = -60; lat <= 60; lat += 30) {
      var c = project(-180, lat), d = project(180, lat);
      grid.appendChild(svgEl('line', { x1: c.x, y1: c.y, x2: d.x, y2: d.y }));
    }
    svg.appendChild(grid);

    /* --- landmasses ------------------------------------------------------ */
    var land = svgEl('g', { class: 'map__land', 'aria-hidden': 'true' });
    D.LANDMASSES.forEach(function (mass) {
      var pts = mass.points.map(function (p) {
        var q = project(p[0], p[1]);
        return q.x.toFixed(1) + ',' + q.y.toFixed(1);
      }).join(' ');
      land.appendChild(svgEl('polygon', { points: pts, class: 'landmass', 'data-mass': mass.id }));
    });
    svg.appendChild(land);

    /* --- partnership arcs ------------------------------------------------ */
    var arcs = svgEl('g', { class: 'map__links', 'aria-hidden': 'true' });
    D.LINKS.forEach(function (pair, i) {
      var a = regionById(pair[0]), b = regionById(pair[1]);
      if (!a || !b) { return; }
      var p = project(a.pos[0], a.pos[1]), q = project(b.pos[0], b.pos[1]);
      /* Bow the arc upward so overlapping routes stay distinguishable. */
      var mx = (p.x + q.x) / 2;
      var my = (p.y + q.y) / 2 - Math.abs(q.x - p.x) * 0.18 - 14;
      arcs.appendChild(svgEl('path', {
        d: 'M' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) +
           ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) +
           ' ' + q.x.toFixed(1) + ' ' + q.y.toFixed(1),
        class: 'map__link',
        'data-a': pair[0], 'data-b': pair[1],
        style: '--delay:' + (i * 0.35) + 's'
      }));
    });
    svg.appendChild(arcs);

    /* --- region nodes ---------------------------------------------------- */
    var maxProjects = Math.max.apply(null, D.REGIONS.map(function (r) { return r.projects; }));
    var maxFunding = Math.max.apply(null, D.REGIONS.map(function (r) { return r.funding; }));

    var nodes = svgEl('g', { class: 'map__nodes' });
    D.REGIONS.forEach(function (region) {
      var p = project(region.pos[0], region.pos[1]);
      /* Area-proportional radius so a node twice the value looks twice the size. */
      var r = 12 + Math.sqrt(region.projects / maxProjects) * 20;
      /* Sequential ramp step 1..5 by funding share. */
      var step = 1 + Math.round((region.funding / maxFunding) * 4);

      var g = svgEl('g', {
        class: 'mapnode',
        'data-region': region.id,
        'data-seq': step,
        tabindex: '0',
        role: 'button',
        'aria-label': region.name + ': ' + U.formatCount(region.projects) +
                      ' projects, ' + region.partners + ' partners, ₹' +
                      U.formatCount(region.funding) + ' crore committed'
      });

      g.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: r + 12, class: 'mapnode__halo' }));
      g.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: r, class: 'mapnode__dot' }));
      g.appendChild(svgEl('text', {
        x: p.x, y: p.y + 4, class: 'mapnode__count', 'text-anchor': 'middle',
        text: U.formatCountShort(region.projects)
      }));
      /* Direct label - identity never depends on colour alone. */
      g.appendChild(svgEl('text', {
        x: p.x, y: p.y + r + 18, class: 'mapnode__name', 'text-anchor': 'middle',
        text: region.name
      }));

      function open() { selectRegion(region.id); }
      g.addEventListener('click', open);
      g.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); }
      });

      nodes.appendChild(g);
      nodeEls[region.id] = g;
    });
    svg.appendChild(nodes);

    host.appendChild(svg);

    /* Scale legend - explains the sequential encoding in words. */
    host.appendChild(U.el('p', { class: 'map__note' }, [
      U.el('span', { class: 'map__note-key', 'aria-hidden': 'true' }),
      'Circle size shows active projects; shade shows committed funding. Select a region for detail.'
    ]));
  }

  function regionById(id) {
    return D.REGIONS.filter(function (r) { return r.id === id; })[0];
  }

  /* ---------------------------------------------------------------------------
     FILTERS
     --------------------------------------------------------------------------- */

  function buildFilters() {
    var host = U.$('#map-filters');
    if (!host) { return; }
    U.clear(host);

    var opts = [{ id: 'all', name: 'All partnerships' }].concat(
      D.PILLARS.map(function (p) { return { id: p.id === 'capacity' ? 'capacity' : p.id, name: p.name }; })
    );

    opts.forEach(function (o) {
      var btn = U.el('button', {
        class: 'filter-chip' + (o.id === 'all' ? ' is-active' : ''),
        type: 'button', 'data-filter': o.id,
        'aria-pressed': o.id === 'all' ? 'true' : 'false',
        text: o.name
      });
      btn.addEventListener('click', function () { applyFilter(o.id); });
      host.appendChild(btn);
    });
  }

  function applyFilter(id) {
    activeFilter = id;
    U.$$('#map-filters .filter-chip').forEach(function (b) {
      var on = b.getAttribute('data-filter') === id;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    /* Colour follows the region, never its rank - filtering only dims, it
       never repaints the survivors. */
    D.REGIONS.forEach(function (r) {
      var node = nodeEls[r.id];
      if (!node) { return; }
      var match = id === 'all' || r.categories.indexOf(id) !== -1;
      node.classList.toggle('is-dimmed', !match);
      node.setAttribute('aria-hidden', match ? 'false' : 'true');
      node.setAttribute('tabindex', match ? '0' : '-1');
    });

    U.$$('.map__link').forEach(function (link) {
      var a = regionById(link.getAttribute('data-a'));
      var b = regionById(link.getAttribute('data-b'));
      var match = id === 'all' ||
        (a && b && a.categories.indexOf(id) !== -1 && b.categories.indexOf(id) !== -1);
      link.classList.toggle('is-dimmed', !match);
    });

    var count = D.REGIONS.filter(function (r) {
      return id === 'all' || r.categories.indexOf(id) !== -1;
    }).length;
    var live = U.$('#map-live');
    if (live) {
      live.textContent = count + ' of ' + D.REGIONS.length + ' regions match this filter.';
    }
    renderDashboard();
  }

  /* ---------------------------------------------------------------------------
     REGION DETAIL
     --------------------------------------------------------------------------- */

  function selectRegion(id) {
    var region = regionById(id);
    if (!region) { return; }
    activeRegion = id;

    Object.keys(nodeEls).forEach(function (k) {
      nodeEls[k].classList.toggle('is-selected', k === id);
    });

    var panel = U.$('#region-detail');
    if (!panel) { return; }
    U.clear(panel);
    panel.hidden = false;

    panel.appendChild(U.el('div', { class: 'region__head' }, [
      U.el('div', {}, [
        U.el('p', { class: 'region__eyebrow', text: 'Regional profile' }),
        U.el('h3', { class: 'region__title', text: region.name })
      ]),
      (function () {
        var close = U.el('button', {
          class: 'icon-btn', type: 'button', 'aria-label': 'Close regional profile', text: '✕'
        });
        close.addEventListener('click', function () {
          panel.hidden = true;
          Object.keys(nodeEls).forEach(function (k) { nodeEls[k].classList.remove('is-selected'); });
          if (nodeEls[id]) { nodeEls[id].focus(); }
        });
        return close;
      })()
    ]));

    panel.appendChild(U.el('p', { class: 'region__focus', text: region.focus }));

    var stats = U.el('div', { class: 'region__stats' });
    [
      { label: 'Active projects', value: U.formatCount(region.projects) },
      { label: 'Partner organisations', value: U.formatCount(region.partners) },
      { label: 'Committed funding', value: '₹' + U.formatCount(region.funding) + ' Cr' },
      { label: 'Population reach', value: region.reach + '%' }
    ].forEach(function (s) {
      stats.appendChild(U.el('div', { class: 'region__stat' }, [
        U.el('span', { class: 'region__stat-value', text: s.value }),
        U.el('span', { class: 'region__stat-label', text: s.label })
      ]));
    });
    panel.appendChild(stats);

    panel.appendChild(U.el('h4', { class: 'panel__subtitle', text: 'Active pillars' }));
    var tags = U.el('ul', { class: 'taglist' });
    region.categories.forEach(function (cat) {
      var pillar = D.PILLARS.filter(function (p) { return p.id === cat; })[0];
      tags.appendChild(U.el('li', { class: 'tag' }, [
        U.el('span', { 'aria-hidden': 'true', text: pillar ? pillar.icon : '•' }),
        ' ' + (pillar ? pillar.name : cat)
      ]));
    });
    panel.appendChild(tags);

    panel.appendChild(U.el('h4', { class: 'panel__subtitle', text: 'Partner organisations' }));
    var orgs = U.el('ul', { class: 'orglist' });
    region.orgs.forEach(function (o) {
      orgs.appendChild(U.el('li', { class: 'orglist__item', text: o }));
    });
    panel.appendChild(orgs);

    /* Track exploration for the Globe Trotter badge. */
    var seen = U.Store.get('visitedRegions') || [];
    if (seen.indexOf(id) === -1) {
      seen = seen.concat([id]);
      U.Store.set('visitedRegions', seen);
      global.Gamify.award(null, 10, region.name + ' explored');
      if (seen.length >= D.REGIONS.length) {
        global.Gamify.award('globe-trotter', 50, 'Every region explored');
      }
    }

    panel.focus();
  }

  /* ---------------------------------------------------------------------------
     DASHBOARD - the two charts beside the map.
     --------------------------------------------------------------------------- */

  function renderDashboard() {
    var visible = D.REGIONS.filter(function (r) {
      return activeFilter === 'all' || r.categories.indexOf(activeFilter) !== -1;
    });

    var fundingHost = U.$('#chart-funding');
    if (fundingHost) {
      global.Charts.hbars(fundingHost, {
        rows: visible.map(function (r, i) {
          return { label: r.name, value: r.funding, series: (i % 5) + 1, note: r.focus };
        }),
        format: function (v) { return '₹' + U.formatCount(v) + ' Cr'; }
      });
    }

    var reachHost = U.$('#chart-reach');
    if (reachHost) {
      global.Charts.columns(reachHost, {
        points: visible.map(function (r) {
          return { label: r.name, value: r.reach, series: 1, note: U.formatCount(r.projects) + ' projects' };
        }),
        format: function (v) { return Math.round(v) + '%'; },
        ariaLabel: 'Population reach by region, percent'
      });
    }

    var totalHost = U.$('#dash-total');
    if (totalHost) {
      var total = visible.reduce(function (s, r) { return s + r.funding; }, 0);
      totalHost.textContent = '₹' + U.formatCount(total) + ' Cr';
    }
    var projHost = U.$('#dash-projects');
    if (projHost) {
      projHost.textContent = U.formatCount(visible.reduce(function (s, r) { return s + r.projects; }, 0));
    }
    var partnerHost = U.$('#dash-partners');
    if (partnerHost) {
      partnerHost.textContent = U.formatCount(visible.reduce(function (s, r) { return s + r.partners; }, 0));
    }
  }

  global.WorldMap = {
    init: init,
    selectRegion: selectRegion,
    applyFilter: applyFilter
  };
})(window);
