/* Shared D3 charts for francisco-data.com.
   Maps use real boundaries: INE 2021 electoral sections (via github.com/emagar/mxDistritos)
   and Natural Earth countries (world-atlas). Values drawn on top are sample data from a seeded RNG. */
(function () {
  const rand = seed => d3.randomLcg(seed);
  const fmt = d3.format(',');
  const seeds = { electoral: 0.11, ageb: 0.18, heat: 0.25, arsenic: 0.32, security: 0.39, flows: 0.46 };
  const geoFiles = { electoral: 'geo/coahuila.json', ageb: 'geo/laguna.json', heat: 'geo/laguna.json', flows: 'geo/world.json' };
  const cache = {};
  const load = id => geoFiles[id] ? (cache[geoFiles[id]] ||= fetch(geoFiles[id]).then(r => r.json())) : Promise.resolve(null);
  const sections = topo => topojson.feature(topo, topo.objects.secc).features;
  const stateName = e => (e === 10 ? 'Durango' : 'Coahuila');
  const partyName = { p1: 'Party A', p2: 'Party B', p3: 'Party C', p4: 'Party D' };
  const cities = [['Torreón', -103.418, 25.543], ['Gómez Palacio', -103.498, 25.566], ['Lerdo', -103.523, 25.537]];

  function cityLabels(svg, proj, big) {
    if (!big) return;
    const g = svg.append('g').attr('pointer-events', 'none');
    cities.forEach(([n, lon, lat]) => {
      const [x, y] = proj([lon, lat]);
      g.append('text').attr('class', 'place').attr('x', x).attr('y', y).attr('text-anchor', 'middle').text(n);
    });
  }

  const charts = {
    // Coahuila: every electoral section, colored by (sample) winning party, with municipal borders.
    electoral(svg, w, h, r, topo) {
      const big = w > 400;
      const obj = topo.objects.secc, feats = sections(topo);
      const proj = d3.geoMercator().fitExtent([[8, 8], [w - 8, h - 8]], topojson.mesh(topo, obj, (a, b) => a === b));
      const path = d3.geoPath(proj);
      feats.forEach(f => {
        const [lon, lat] = d3.geoCentroid(f);
        const v = Math.sin((lon + 101) * 1.9) + Math.cos((lat - 27) * 2.3) + (r() - 0.5) * 1.1;
        f.party = v > 0.9 ? 'p1' : v > 0 ? 'p2' : v > -0.8 ? 'p3' : 'p4';
        f.share = 0.33 + r() * 0.24;
      });
      svg.append('g').selectAll('path').data(feats).join('path')
        .attr('d', path).attr('class', f => f.party).attr('fill-opacity', f => 0.35 + (f.share - 0.33) * 2.6)
        .attr('stroke', 'var(--bg)').attr('stroke-width', big ? 0.4 : 0.15)
        .attr('data-tip', f => `Sección ${f.properties.SECCION} · ${partyName[f.party]} · ${d3.format('.0%')(f.share)} of vote`);
      svg.append('path').datum(topojson.mesh(topo, obj, (a, b) => a.properties.MUNICIPIO !== b.properties.MUNICIPIO))
        .attr('d', path).attr('fill', 'none').attr('stroke', 'var(--fg)').attr('stroke-opacity', 0.45).attr('stroke-width', big ? 0.8 : 0.4).attr('pointer-events', 'none');
      svg.append('path').datum(topojson.mesh(topo, obj, (a, b) => a === b))
        .attr('d', path).attr('fill', 'none').attr('stroke', 'var(--fg)').attr('stroke-width', big ? 1.2 : 0.7).attr('pointer-events', 'none');
      if (big) [['Torreón', -103.42, 25.54], ['Saltillo', -101.0, 25.42], ['Monclova', -101.42, 26.9], ['Piedras Negras', -100.52, 28.7]]
        .forEach(([n, lon, lat]) => { const [x, y] = proj([lon, lat]); svg.append('text').attr('class', 'place').attr('x', x).attr('y', y - 6).attr('text-anchor', 'middle').attr('pointer-events', 'none').text(n); });
      return Object.entries(partyName).map(([k, v]) => [`var(--${k})`, v]);
    },

    // La Laguna metro (Torreón, Gómez Palacio, Lerdo): sections shaded by (sample) social lag, plus business points.
    ageb(svg, w, h, r, topo) {
      const big = w > 400, feats = sections(topo);
      const proj = d3.geoMercator().fitExtent([[0, 0], [w, h]], { type: 'MultiPoint', coordinates: [[-103.58, 25.48], [-103.30, 25.64]] });
      const path = d3.geoPath(proj);
      const centers = [[-103.43, 25.545], [-103.495, 25.565]];
      feats.forEach(f => {
        const c = d3.geoCentroid(f), a = d3.geoArea(f) * 1e7;
        const d = Math.min(...centers.map(k => Math.hypot(c[0] - k[0], c[1] - k[1])));
        f.lag = Math.max(0.05, Math.min(0.95, d * 9 + Math.min(a, 60) / 120 + (r() - 0.5) * 0.3));
        f.urban = a < 6;
      });
      const lvl = v => v > 0.7 ? 'Muy alto' : v > 0.5 ? 'Alto' : v > 0.3 ? 'Medio' : v > 0.15 ? 'Bajo' : 'Muy bajo';
      svg.append('g').selectAll('path').data(feats).join('path')
        .attr('d', path).attr('fill', 'var(--accent)').attr('fill-opacity', f => 0.06 + f.lag * 0.75)
        .attr('stroke', 'var(--bg)').attr('stroke-width', big ? 0.5 : 0.25)
        .attr('data-tip', f => `Sección ${f.properties.SECCION} (${stateName(f.properties.ENTIDAD)}) · rezago ${lvl(f.lag)} · ${fmt(Math.round(600 + r() * 2600))} residents`);
      const urban = feats.filter(f => f.urban);
      const pts = d3.range(big ? 900 : 420).map(() => {
        const f = urban[Math.floor(r() * urban.length)], [x, y] = path.centroid(f), b = path.bounds(f);
        return [x + (r() - 0.5) * (b[1][0] - b[0][0]) * 0.6, y + (r() - 0.5) * (b[1][1] - b[0][1]) * 0.6];
      });
      svg.append('g').attr('pointer-events', 'none').selectAll('circle').data(pts).join('circle')
        .attr('cx', d => d[0]).attr('cy', d => d[1]).attr('r', big ? 1.3 : 0.8).attr('fill', 'var(--fg)').attr('fill-opacity', 0.55);
      cityLabels(svg, proj, big);
      return [['var(--accent)', 'Darker = higher social lag (rezago)'], ['var(--fg)', 'Registered business (DENUE)']];
    },

    // Torreón: density of (sample) public works projects over the city's electoral sections.
    heat(svg, w, h, r, topo) {
      const big = w > 400;
      const feats = sections(topo);
      const proj = d3.geoMercator().fitExtent([[0, 0], [w, h]], { type: 'MultiPoint', coordinates: [[-103.49, 25.49], [-103.31, 25.62]] });
      const path = d3.geoPath(proj);
      svg.append('g').selectAll('path').data(feats).join('path')
        .attr('d', path).attr('fill', 'var(--thumb)').attr('stroke', 'var(--muted)').attr('stroke-opacity', 0.35).attr('stroke-width', big ? 0.5 : 0.25);
      const torreon = feats.filter(f => f.properties.ENTIDAD === 5 && d3.geoArea(f) * 1e7 < 6);
      const hubs = [[-103.43, 25.54, 40], [-103.39, 25.57, 25], [-103.36, 25.525, 18], [-103.45, 25.585, 19]];
      const projects = [];
      hubs.forEach(([lon, lat, k]) => {
        const near = torreon.map(f => [f, d3.geoDistance(d3.geoCentroid(f), [lon, lat])]).sort((a, b) => a[1] - b[1]).slice(0, 30);
        for (let i = 0; i < k; i++) { const f = near[Math.floor(r() * near.length)][0]; projects.push({ f, p: path.centroid(f), cost: 0.8 + r() * 14 }); }
      });
      const dens = d3.contourDensity().x(d => d.p[0]).y(d => d.p[1]).weight(d => d.cost).size([w, h]).bandwidth(big ? 28 : 12).thresholds(9)(projects);
      const op = d3.scaleLinear().domain(d3.extent(dens, d => d.value)).range([0.06, 0.75]);
      svg.append('g').attr('pointer-events', 'none').selectAll('path').data(dens).join('path')
        .attr('d', d3.geoPath()).attr('fill', 'var(--hot)').attr('fill-opacity', d => op(d.value))
        .attr('stroke', 'var(--hot)').attr('stroke-opacity', 0.4).attr('stroke-width', 0.6);
      svg.append('g').selectAll('circle').data(projects).join('circle')
        .attr('cx', d => d.p[0]).attr('cy', d => d.p[1]).attr('r', big ? 3 : 1.4)
        .attr('fill', 'var(--fg)').attr('fill-opacity', 0.7)
        .attr('data-tip', (d, i) => `Project ${i + 1} · Sección ${d.f.properties.SECCION} · $${d3.format(',.1f')(d.cost)}M MXN`);
      if (big) { const [x, y] = proj([-103.418, 25.543]); svg.append('text').attr('class', 'place').attr('x', x).attr('y', y - 14).attr('text-anchor', 'middle').attr('pointer-events', 'none').text('Centro'); }
      return [['var(--hot)', 'Concentration of public works spending'], ['var(--fg)', 'Individual project']];
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
      const step = x(1991) - x(1990);
      svg.append('g').selectAll('rect').data(data).join('rect')
        .attr('x', d => x(d.y) - step / 2).attr('width', step).attr('y', 0).attr('height', h).attr('fill', 'transparent')
        .attr('data-tip', d => `${d.y} · ${d.v.toFixed(3)} mg/L${d.v > 0.025 ? ' · above limit' : ''}`);
      return [['var(--accent)', 'Average arsenic, municipal wells'], ['var(--muted)', 'NOM-127 limit (0.025 mg/L)']];
    },

    // Monthly incidence bars, current year highlighted.
    security(svg, w, h, r) {
      const m = { t: 12, r: 10, b: 22, l: 10 };
      const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const months = d3.range(54).map(i => ({ i, yr: 2022 + Math.floor(i / 12), v: 0.6 + 0.12 * Math.sin(i / 5) - i * 0.003 + r() * 0.12 }));
      const x = d3.scaleBand().domain(months.map(d => d.i)).range([m.l, w - m.r]).padding(0.18);
      const y = d3.scaleLinear().domain([0, 0.9]).range([h - m.b, m.t]);
      svg.append('g').selectAll('rect').data(months).join('rect')
        .attr('x', d => x(d.i)).attr('width', x.bandwidth())
        .attr('y', d => y(d.v)).attr('height', d => y(0) - y(d.v))
        .attr('fill', d => d.yr === 2026 ? 'var(--accent)' : 'var(--muted)')
        .attr('fill-opacity', d => d.yr === 2026 ? 1 : 0.4)
        .attr('data-tip', d => `${mon[d.i % 12]} ${d.yr} · ${fmt(Math.round(d.v * 3000))} incidents`);
      svg.append('g').selectAll('text').data([2022, 2023, 2024, 2025, 2026]).join('text')
        .attr('class', 'lbl').attr('x', d => x((d - 2022) * 12)).attr('y', h - 7).text(d => d);
      return [['var(--accent)', '2026'], ['var(--muted)', '2022–2025']];
    },

    // Migration flows into Mexico from countries in the region (sample sizes), on a real map.
    flows(svg, w, h, r, topo) {
      const big = w > 400;
      const countries = topojson.feature(topo, topo.objects.countries).features;
      const proj = d3.geoMercator().fitExtent([[0, 0], [w, h]], { type: 'MultiPoint', coordinates: [[-112, 31], [-62, -2]] });
      const path = d3.geoPath(proj);
      const origins = ['Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Cuba', 'Haiti', 'Venezuela', 'Colombia', 'Ecuador'];
      svg.append('g').selectAll('path').data(countries).join('path')
        .attr('d', path)
        .attr('fill', f => f.properties.name === 'Mexico' ? 'var(--accent)' : origins.includes(f.properties.name) ? 'var(--muted)' : 'var(--line)')
        .attr('fill-opacity', f => f.properties.name === 'Mexico' ? 0.18 : origins.includes(f.properties.name) ? 0.35 : 0.6)
        .attr('stroke', 'var(--bg)').attr('stroke-width', 0.6);
      const dest = proj([-99.13, 19.43]);
      const flows = origins.map(n => {
        const f = countries.find(c => c.properties.name === n);
        const c = n === 'Ecuador' ? [-78.5, -1.2] : n === 'Colombia' ? [-74.3, 4.6] : d3.geoCentroid(f);
        return { n, p: proj(c), k: 1 + r() * 4 };
      });
      const curve = d => { const [x0, y0] = d.p, [x1, y1] = dest; const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - Math.hypot(x1 - x0, y1 - y0) * 0.25;
        const p = d3.path(); p.moveTo(x0, y0); p.quadraticCurveTo(mx, my, x1, y1); return p.toString(); };
      const scale = big ? 1.6 : 0.8;
      svg.append('g').selectAll('path').data(flows).join('path')
        .attr('d', curve).attr('fill', 'none').attr('stroke', 'var(--accent)')
        .attr('stroke-width', d => d.k * scale).attr('stroke-opacity', 0.6).attr('stroke-linecap', 'round')
        .attr('data-tip', d => `${d.n} → Mexico · ${fmt(Math.round(d.k * 9000))} people`);
      svg.append('g').selectAll('circle').data(flows).join('circle')
        .attr('cx', d => d.p[0]).attr('cy', d => d.p[1]).attr('r', d => (2 + d.k * 0.6) * (big ? 1 : 0.7)).attr('fill', 'var(--fg)')
        .attr('data-tip', d => `${d.n} · ${fmt(Math.round(d.k * 9000))} people`);
      svg.append('circle').attr('cx', dest[0]).attr('cy', dest[1]).attr('r', big ? 6 : 4).attr('fill', 'var(--bg)').attr('stroke', 'var(--fg)').attr('stroke-width', 2);
      if (big) {
        flows.forEach(d => svg.append('text').attr('class', 'place').attr('x', d.p[0] + 7).attr('y', d.p[1] + 4).attr('pointer-events', 'none').text(d.n));
        svg.append('text').attr('class', 'place').attr('x', dest[0]).attr('y', dest[1] - 11).attr('text-anchor', 'middle').attr('pointer-events', 'none').text('Mexico');
      }
      return [['var(--accent)', 'Line width = size of flow'], ['var(--muted)', 'Country of origin']];
    }
  };

  async function draw(id, svg, w, h) {
    const geo = await load(id);
    return charts[id](svg, w, h, rand(seeds[id]), geo) || [];
  }

  window.FD = { draw, charts, seeds };
})();
