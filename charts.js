/* Shared D3 charts for francisco-data.com. Sample data generated with a seeded RNG. */
(function () {
  const rand = seed => d3.randomLcg(seed);
  const charts = {
    // Voronoi cells standing in for electoral sections, filled by winning party.
    electoral(svg, w, h, r) {
      const pts = d3.range(140).map(() => [r() * w, r() * h]);
      const vor = d3.Delaunay.from(pts).voronoi([0, 0, w, h]);
      const party = ([x, y]) => { const v = Math.sin(x / 70) + Math.cos(y / 50) + r() * 0.8; return v > 1 ? 'p1' : v > 0.1 ? 'p2' : v > -0.7 ? 'p3' : 'p4'; };
      svg.append('g').selectAll('path').data(pts).join('path')
        .attr('d', (_, i) => vor.renderCell(i))
        .attr('class', d => party(d))
        .attr('fill-opacity', () => 0.45 + r() * 0.5)
        .attr('stroke', 'var(--bg)').attr('stroke-width', 1.2);
    },
    // Census blocks shaded by social lag (sequential), with business locations as dots.
    ageb(svg, w, h, r) {
      const cx = w / 2, cy = h / 2;
      const pts = d3.range(110).map(() => { const a = r() * 6.283, d = Math.sqrt(r()) * w * 0.48; return [cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.72]; });
      const vor = d3.Delaunay.from(pts).voronoi([0, 0, w, h]);
      const lag = d3.scaleLinear().domain([0, w * 0.5]).range([0.08, 0.85]).clamp(true);
      svg.append('g').selectAll('path').data(pts).join('path')
        .attr('d', (_, i) => vor.renderCell(i))
        .attr('fill', 'var(--accent)')
        .attr('fill-opacity', d => lag(Math.hypot(d[0] - cx, (d[1] - cy) * 1.4)) * (0.75 + r() * 0.4))
        .attr('stroke', 'var(--bg)').attr('stroke-width', 1);
      const biz = d3.range(240).map(() => { const a = r() * 6.283, d = Math.pow(r(), 1.7) * w * 0.38; return [cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7]; });
      svg.append('g').selectAll('circle').data(biz).join('circle')
        .attr('cx', d => d[0]).attr('cy', d => d[1]).attr('r', 1.2)
        .attr('fill', 'var(--fg)').attr('fill-opacity', 0.55);
    },
    // Kernel density contours of public works locations.
    heat(svg, w, h, r) {
      const n = d3.randomNormal.source(d3.randomLcg(7));
      const centers = [[0.3, 0.4, 70], [0.62, 0.55, 45], [0.75, 0.3, 25], [0.45, 0.75, 20]];
      const pts = centers.flatMap(([x, y, k]) => d3.range(k).map(() => [n(x * w, 26)(), n(y * h, 20)()]));
      const dens = d3.contourDensity().x(d => d[0]).y(d => d[1]).size([w, h]).bandwidth(16).thresholds(9)(pts);
      const op = d3.scaleLinear().domain(d3.extent(dens, d => d.value)).range([0.08, 0.9]);
      svg.append('g').selectAll('path').data(dens).join('path')
        .attr('d', d3.geoPath()).attr('fill', 'var(--hot)').attr('fill-opacity', d => op(d.value))
        .attr('stroke', 'var(--hot)').attr('stroke-opacity', 0.35).attr('stroke-width', 0.6);
      svg.append('g').selectAll('circle').data(pts).join('circle')
        .attr('cx', d => d[0]).attr('cy', d => d[1]).attr('r', 1.1).attr('fill', 'var(--fg)').attr('fill-opacity', 0.4);
    },
    // Yearly arsenic level against a regulatory limit.
    arsenic(svg, w, h, r) {
      const m = { t: 14, r: 14, b: 22, l: w > 400 ? 46 : 30 };
      let v = 0.022;
      const data = d3.range(1990, 2024).map(y => { v = Math.max(0.008, Math.min(0.05, v + (r() - 0.47) * 0.006)); return { y, v }; });
      const x = d3.scaleLinear().domain([1990, 2023]).range([m.l, w - m.r]);
      const y = d3.scaleLinear().domain([0, 0.05]).range([h - m.b, m.t]);
      svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).tickValues([1990, 2000, 2010, 2023]).tickFormat(d3.format('d')).tickSize(3));
      svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(3).tickFormat(d3.format('.2f')).tickSize(3));
      svg.append('path').datum(data).attr('fill', 'var(--accent)').attr('fill-opacity', 0.14)
        .attr('d', d3.area().x(d => x(d.y)).y0(y(0)).y1(d => y(d.v)).curve(d3.curveMonotoneX));
      svg.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(0.025)).attr('y2', y(0.025))
        .attr('stroke', 'var(--muted)').attr('stroke-dasharray', '4 4');
      svg.append('text').attr('class', 'lbl').attr('x', w - m.r).attr('y', y(0.025) - 5).attr('text-anchor', 'end').text('NOM-127 limit 0.025 mg/L');
      svg.append('path').datum(data).attr('fill', 'none').attr('stroke', 'var(--accent)').attr('stroke-width', 2)
        .attr('d', d3.line().x(d => x(d.y)).y(d => y(d.v)).curve(d3.curveMonotoneX));
      const last = data[data.length - 1];
      svg.append('circle').attr('cx', x(last.y)).attr('cy', y(last.v)).attr('r', 3.5).attr('fill', 'var(--fg)');
    },
    // Monthly incidence bars, current year highlighted.
    security(svg, w, h, r) {
      const m = { t: 12, r: 10, b: 22, l: 10 };
      const months = d3.range(54).map(i => ({ i, yr: 2022 + Math.floor(i / 12), v: 0.6 + 0.12 * Math.sin(i / 5) - i * 0.003 + r() * 0.12 }));
      const x = d3.scaleBand().domain(months.map(d => d.i)).range([m.l, w - m.r]).padding(0.18);
      const y = d3.scaleLinear().domain([0, 0.9]).range([h - m.b, m.t]);
      svg.append('g').selectAll('rect').data(months).join('rect')
        .attr('x', d => x(d.i)).attr('width', x.bandwidth())
        .attr('y', d => y(d.v)).attr('height', d => y(0) - y(d.v))
        .attr('fill', d => d.yr === 2026 ? 'var(--accent)' : 'var(--muted)')
        .attr('fill-opacity', d => d.yr === 2026 ? 1 : 0.4);
      svg.append('g').selectAll('text').data([2022, 2023, 2024, 2025, 2026]).join('text')
        .attr('class', 'lbl').attr('x', d => x((d - 2022) * 12)).attr('y', h - 7).text(d => d);
    },
    // Flows from several origins toward one destination.
    flows(svg, w, h, r) {
      const hub = [w * 0.82, h * 0.3];
      const origins = d3.range(9).map(() => ({ p: [w * (0.06 + r() * 0.6), h * (0.2 + r() * 0.7)], k: 1 + r() * 4 }));
      const curve = d => { const [x0, y0] = d.p, [x1, y1] = hub, mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 30 - (x1 - x0) * 0.15;
        const p = d3.path(); p.moveTo(x0, y0); p.quadraticCurveTo(mx, my, x1, y1); return p.toString(); };
      svg.append('g').selectAll('path').data(origins).join('path')
        .attr('d', curve).attr('fill', 'none').attr('stroke', 'var(--accent)')
        .attr('stroke-width', d => d.k).attr('stroke-opacity', 0.55).attr('stroke-linecap', 'round');
      svg.append('g').selectAll('circle').data(origins).join('circle')
        .attr('cx', d => d.p[0]).attr('cy', d => d.p[1]).attr('r', d => 2 + d.k * 0.6).attr('fill', 'var(--fg)');
      svg.append('circle').attr('cx', hub[0]).attr('cy', hub[1]).attr('r', 6).attr('fill', 'var(--bg)').attr('stroke', 'var(--fg)').attr('stroke-width', 2);
    }
  };

  const fmtPct = d3.format('.0%');
  const partyName = { p1: 'Party A', p2: 'Party B', p3: 'Party C', p4: 'Party D' };
  const tips = {
    electoral(svg, r) {
      svg.selectAll('path').attr('data-tip', function (d, i) {
        const c = this.getAttribute('class');
        return `Section ${String(1100 + i * 7)} · ${partyName[c]} · ${fmtPct(0.34 + r() * 0.22)} of vote`;
      });
      return Object.entries(partyName).map(([k, v]) => [`var(--${k})`, v]);
    },
    ageb(svg, r) {
      svg.select('g').selectAll('path').attr('data-tip', function (d, i) {
        const o = +this.getAttribute('fill-opacity');
        const lvl = o > 0.6 ? 'Alto' : o > 0.35 ? 'Medio' : o > 0.18 ? 'Bajo' : 'Muy bajo';
        return `AGEB 0535-${String(100 + i).padStart(3, '0')}A · rezago ${lvl} · ${d3.format(',')(Math.round(800 + r() * 3200))} residents`;
      });
      return [['var(--accent)', 'Darker = higher social lag (rezago)'], ['var(--fg)', 'Registered business (DENUE)']];
    },
    heat(svg, r) {
      svg.selectAll('circle').attr('r', 2.2).attr('data-tip', (d, i) => `Project ${i + 1} · $${d3.format(',.1f')(0.8 + r() * 14)}M MXN`);
      return [['var(--hot)', 'Concentration of public works spending'], ['var(--fg)', 'Individual project']];
    },
    arsenic(svg, r, w, h) {
      const m = { l: 46, r: 14 };
      const x = d3.scaleLinear().domain([1990, 2023]).range([m.l, w - m.r]);
      const line = svg.selectAll('path').filter(function () { return this.getAttribute('fill') === 'none' && this.getAttribute('stroke') === 'var(--accent)'; }).node();
      const step = (w - m.l - m.r) / 33;
      svg.append('g').selectAll('rect').data(d3.range(1990, 2024)).join('rect')
        .attr('x', d => x(d) - step / 2).attr('width', step).attr('y', 0).attr('height', h).attr('fill', 'transparent')
        .attr('data-tip', d => {
          const len = line.getTotalLength(); let lo = 0, hi = len, p;
          for (let k = 0; k < 24; k++) { const mid = (lo + hi) / 2; p = line.getPointAtLength(mid); if (p.x < x(d)) lo = mid; else hi = mid; }
          const v = d3.scaleLinear().domain([h - 22, 14]).range([0, 0.05])(p.y);
          return `${d} · ${v.toFixed(3)} mg/L ${v > 0.025 ? '· above limit' : ''}`;
        });
      return [['var(--accent)', 'Average arsenic, municipal wells'], ['var(--muted)', 'NOM-127 limit (0.025 mg/L)']];
    },
    security(svg) {
      const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      svg.selectAll('rect').attr('data-tip', d => `${mon[d.i % 12]} ${d.yr} · ${d3.format(',')(Math.round(d.v * 3000))} incidents`);
      return [['var(--accent)', '2026'], ['var(--muted)', '2022–2025']];
    },
    flows(svg, r) {
      const names = ['Guatemala', 'Honduras', 'El Salvador', 'Venezuela', 'Haiti', 'Cuba', 'Ecuador', 'Colombia', 'Nicaragua'];
      svg.selectAll('path').attr('data-tip', (d, i) => `${names[i]} → Mexico · ${d3.format(',')(Math.round(d.k * 9000))} people`);
      svg.selectAll('circle').filter(d => d).attr('data-tip', (d, i) => `${names[i]} · ${d3.format(',')(Math.round(d.k * 9000))} people`);
      return [['var(--accent)', 'Line width = size of flow']];
    }
  };


  const seeds = { electoral: 0.11, ageb: 0.18, heat: 0.25, arsenic: 0.32, security: 0.39, flows: 0.46 };
  window.FD = { charts, tips, seeds, rand };
})();
