const D = window.FOCO_DATA;
const $ = id => document.getElementById(id);
let view = 'rd';

const dir = D.directory.map(d => ({...d, ceco:String(d.ceco)}));
const byCeco = Object.fromEntries(dir.map(d => [d.ceco, d]));
const metrics = {};
D.metrics.forEach(r => { metrics[String(r.ceco)+'|'+Number(r.semana)] = r; });

const monthOrder = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const monthWeeks5 = {
  Ene:[1,2,3,4,5], Feb:[5,6,7,8,9], Mar:[9,10,11,12,13], Abr:[14,15,16,17,18],
  May:[18,19,20,21,22], Jun:[22,23,24,25,26], Jul:[27,28,29,30,31], Ago:[31,32,33,34,35],
  Sep:[36,37,38,39,40], Oct:[40,41,42,43,44], Nov:[45,46,47,48,49], Dic:[48,49,50,51,52]
};
const months = monthOrder.filter(m => monthWeeks5[m] || D.monthWeeks[m]);

const metricDefs = {
  omt:    {name:'OMT', fmt:'num0', dir:'up',   threshold:0},
  seg:    {name:'Segundas Conexiones', fmt:'num1', dir:'up', threshold:10},
  cx:     {name:'Conexión', fmt:'pct1', dir:'up', threshold:.60},
  bebida: {name:'Calidad de Bebidas', fmt:'pct1', dir:'up', threshold:.71},
  iplh:   {name:'IPLH / TPLH', fmt:'num1', dir:'up', threshold:16},
  peak:   {name:'Peak Hour', fmt:'num0', dir:'up', threshold:5},
  costo:  {name:'Variación de Inventario', fmt:'pct1', dir:'down', threshold:.009},
  ctc:    {name:'Cada Taza Cuenta', fmt:'pct1', dir:'up', threshold:.10}
};
const pillars = [
  {title:'Obsesión por las ventas.', metrics:['omt','seg']},
  {title:'Exceder las expectativas del cliente.', metrics:['cx','bebida']},
  {title:'Partners correctos en el momento correcto.', metrics:['iplh','peak']},
  {title:'Control de costo ideal.', metrics:['costo','ctc']}
];
const allMetricKeys = pillars.flatMap(p => p.metrics).filter(k => k !== 'peak');

let actions = JSON.parse(localStorage.focoV6Actions || localStorage.focoV5Actions || localStorage.focoV4Actions || '{}');
let objectives = JSON.parse(localStorage.focoV6Objectives || localStorage.focoV5Objectives || localStorage.focoV4Objectives || '{}');
let manual = JSON.parse(localStorage.focoV6Manual || localStorage.focoV5Manual || localStorage.focoV4Manual || '{}');

function init(){
  months.forEach(m => $('mes').add(new Option(m,m)));
  $('mes').value = months.includes('May') ? 'May' : months[0];

  [...new Set(dir.map(d => d.region).filter(Boolean))].sort().forEach(r => $('region').add(new Option(r,r)));
  if ([...$('region').options].some(o => o.value === 'Centro Norte')) $('region').value = 'Centro Norte';

  fillDMAll();
  fillStoreAll();

  document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
    view = b.dataset.view;
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === b));
    syncFilters();
    render();
  });

  $('mes').onchange = render;
  $('region').onchange = render;
  $('dm').onchange = render;
  $('storeSearch').oninput = () => { resolveStore(); render(); };
  $('store').onchange = () => { seedStoreSearch(); render(); };

  syncFilters();
  seedStoreSearch();
  render();
}

function fillDMAll(){
  $('dm').innerHTML = '';
  [...new Set(dir.map(d => d.dm).filter(Boolean))].sort().forEach(d => $('dm').add(new Option(d,d)));
}
function fillStoreAll(){
  $('store').innerHTML = '';
  dir.slice().sort((a,b) => a.tienda.localeCompare(b.tienda)).forEach(s => $('store').add(new Option(`${s.ceco} · ${s.tienda}`, s.ceco)));
  $('storeList').innerHTML = dir.slice().sort((a,b)=>a.tienda.localeCompare(b.tienda)).map(s =>
    `<option value="${escapeHtml(s.tienda)}">${s.ceco} · ${escapeHtml(s.tienda)}</option><option value="${s.ceco}">${s.ceco} · ${escapeHtml(s.tienda)}</option>`
  ).join('');
}
function seedStoreSearch(){
  const c = $('store').value || (dir[0] && dir[0].ceco);
  if(c && byCeco[c]) $('storeSearch').value = `${byCeco[c].tienda}`;
}
function syncFilters(){
  $('regionWrap').classList.toggle('hide', view !== 'rd');
  $('dmWrap').classList.toggle('hide', view !== 'dm');
  $('searchWrap').classList.toggle('hide', view !== 'tienda');
  $('storeWrap').classList.toggle('hide', view !== 'tienda');
  $('filters').className = 'filters ' + view;
}
function weeks(){ return (monthWeeks5[$('mes').value] || D.monthWeeks[$('mes').value] || []).slice(0,5); }
function avg(arr){ arr = arr.filter(v => v != null && !Number.isNaN(v)); return arr.length ? arr.reduce((x,y)=>x+y,0)/arr.length : null; }
function sum(arr){ arr = arr.filter(v => v != null && !Number.isNaN(v)); return arr.length ? arr.reduce((x,y)=>x+y,0) : null; }
function val(c,w,k){
  if(k === 'peak') return manual[`peak|${c}|${w}`] ?? null;
  const r = metrics[String(c)+'|'+Number(w)];
  return r && r[k] != null ? Number(r[k]) : null;
}
function cls(k,v){
  if(v == null || Number.isNaN(v)) return 'neutral';
  if(k === 'omt') return v < 0 ? 'red' : 'green';
  const t = metricDefs[k].threshold;
  if(metricDefs[k].dir === 'down') return v > t ? 'red' : 'green';
  return v < t ? 'red' : 'green';
}
function fmt(v,type){
  if(v == null || Number.isNaN(v)) return '';
  if(type === 'pct1') return (v*100).toFixed(1)+'%';
  if(type === 'num1') return Number(v).toFixed(1);
  return String(Math.round(v));
}
function entity(cecos,k){
  const ws = weeks();
  const vals = ws.map(w => avg(cecos.map(c => val(c,w,k))));
  return {weeks:vals, prom:avg(vals)};
}
function score(cecos){
  let total = 0, ok = 0;
  allMetricKeys.forEach(k => { const p = entity(cecos,k).prom; if(p != null){ total++; if(cls(k,p) === 'green') ok++; } });
  return total ? ok/total : null;
}
function trend(vals){
  const clean = vals.filter(v => v != null && !Number.isNaN(v));
  if(clean.length < 2) return {delta:null, dir:'flat'};
  const delta = clean[clean.length-1] - clean[0];
  return {delta, dir: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'};
}
function trendText(k, vals){
  const t = trend(vals);
  if(t.delta == null) return '—';
  const arrow = t.delta > 0 ? '▲' : t.delta < 0 ? '▼' : '■';
  const type = metricDefs[k].fmt;
  return `${arrow} ${fmt(Math.abs(t.delta), type)}`;
}
function trendClass(k, vals){
  const t = trend(vals);
  if(t.delta == null || t.delta === 0) return 'neutral';
  const good = metricDefs[k].dir === 'down' ? t.delta < 0 : t.delta > 0;
  return good ? 'green' : 'red';
}
function trendLabel(k, cecos){ return trendText(k, entity(cecos,k).weeks); }
function trendLabelClass(k, cecos){ return trendClass(k, entity(cecos,k).weeks); }

function renderScopeWeekSummary(k, metric, weekNums, label){
  const def = metricDefs[k];
  const wk = metric.weeks.map((v,i) => `<div class="wk"><small>${weekNums[i]}</small><b class="${cls(k,v)}">${fmt(v,def.fmt)}</b></div>`).join('');
  return `<div class="metricSummary">${wk}<div class="promMini"><small>Prom</small><b class="${cls(k,metric.prom)}">${fmt(metric.prom,def.fmt)}</b></div><div class="trendMini"><small>Tend.</small><b class="${trendClass(k,metric.weeks)}">${trendText(k,metric.weeks)}</b></div></div>`;
}

function resolveStore(){
  const q = $('storeSearch').value.trim().toLowerCase();
  if(!q) return;
  const f = dir.find(d => d.ceco === q || d.ceco.includes(q) || d.tienda.toLowerCase().includes(q));
  if(f) $('store').value = f.ceco;
}

function render(){
  if(view === 'tienda') renderStore(); else renderExec(view);
}

function renderContext(type, cecos, leader, scoreValue){
  const m = $('mes').value;
  let text = '';
  if(type === 'rd') text = `Mes ${m} · Región ${escapeHtml($('region').value)} · Ranking de DMs por promedio mensual`;
  if(type === 'dm') text = `Mes ${m} · DM ${escapeHtml($('dm').value)} · Ranking de tiendas por promedio mensual`;
  if(type === 'tienda') text = `Mes ${m} · ${leader ? escapeHtml(leader.tienda) : 'Selecciona una tienda'}`;
  $('context').innerHTML = text;
}

function renderExec(type){
  let groups = [], scopeCecos = [];
  if(type === 'rd'){
    const region = $('region').value;
    scopeCecos = dir.filter(d => d.region === region).map(d => d.ceco);
    groups = [...new Set(dir.filter(d => d.region === region).map(d => d.dm).filter(Boolean))]
      .map(dm => ({name:dm, cecos:dir.filter(d => d.region === region && d.dm === dm).map(d => d.ceco)}));
  } else {
    const dm = $('dm').value;
    scopeCecos = dir.filter(d => d.dm === dm).map(d => d.ceco);
    groups = dir.filter(d => d.dm === dm).map(d => ({name:d.tienda, cecos:[d.ceco]}));
  }
  groups = groups.map(g => ({...g, score:score(g.cecos)})).sort((a,b)=>(b.score??-1)-(a.score??-1));
  renderContext(type, scopeCecos, groups[0] || null, score(scopeCecos));

  let html = `<div class="execGrid ${type === 'dm' ? 'dmView' : 'rdView'}">`;
  pillars.forEach(p => {
    html += `<section class="pillar"><h2 class="pillarTitle">${p.title}</h2>`;
    p.metrics.forEach(k => html += renderExecMetric(groups, scopeCecos, k, type));
    html += `</section>`;
  });
  html += `</div>`;
  $('content').innerHTML = html;
}

function renderExecMetric(groups, scopeCecos, k, type){
  const w = weeks();
  const regionMetric = entity(scopeCecos, k);
  const rows = groups.map(g => ({...g, m:entity(g.cecos,k)}))
    .filter(g => g.m.prom != null)
    .sort((a,b)=>(b.m.prom??-999)-(a.m.prom??-999));
  const label = type === 'rd' ? 'Prom Regional' : 'Prom DM';
  const tableLabel = type === 'rd' ? 'DM' : 'Tienda';
  const trendCls = trendLabelClass(k, scopeCecos);
  const summary = renderScopeWeekSummary(k, regionMetric, w, label);
  let html = `<div class="metricBlock">
    <div class="metricTitleRow">
      <div class="metricChip">${metricDefs[k].name}</div>
      ${summary}
    </div>
    <table class="cleanTable">
      <colgroup><col style="width:${type==='rd'?'44%':'46%'}">${w.map(()=>'<col>').join('')}<col style="width:66px"></colgroup>
      <thead><tr><th>${tableLabel}</th>${w.map(x=>`<th>${x}</th>`).join('')}<th>Prom</th></tr></thead>
      <tbody>`;
  html += rows.map(g => `<tr><td>${escapeHtml(g.name)}</td>${g.m.weeks.map(v=>`<td class="value ${cls(k,v)}">${fmt(v,metricDefs[k].fmt)}</td>`).join('')}<td class="value prom ${cls(k,g.m.prom)}">${fmt(g.m.prom,metricDefs[k].fmt)}</td></tr>`).join('');
  html += `</tbody></table></div>`;
  return html;
}

function renderStore(){
  resolveStore();
  const c = $('store').value || (dir[0] && dir[0].ceco);
  const s = byCeco[c];
  renderContext('tienda', [c], s, null);
  const w = weeks();
  let html = `<section class="storeSheet"><div class="storeGrid">`;
  pillars.forEach((p,pi) => {
    html += `<div class="storePillar"><h2>${p.title}</h2>
      <div class="storeMetricHead"><span></span><span>Objetivo</span>${w.map(x=>`<span>${x}</span>`).join('')}<span>Prom</span></div>`;
    p.metrics.forEach((k,i) => html += storeMetric(c,k,i+1,w));
    html += `<div class="actions"><h3>ACCIONES</h3><textarea placeholder="✱ Captura acciones del pilar..." oninput="saveAction('${c}',${pi},this.value)">${escapeHtml(actions[c+'|'+pi] || '')}</textarea></div></div>`;
  });
  html += `</div></section>`;
  $('content').innerHTML = html;
}

function storeMetric(c,k,n,w){
  const def = metricDefs[k];
  const objKey = `${c}|${k}`;
  const obj = objectives[objKey];
  const vals = w.map(ww => val(c,ww,k));
  const prom = avg(vals);
  let cells = '';
  if(k === 'iplh'){
    cells = w.map(ww => {
      const a = val(c,ww,'iplh'), b = val(c,ww,'tplh');
      return `<div class="cell"><div class="split"><div class="value ${cls('iplh',a)}">${fmt(a,'num1')}</div><div class="value neutral">${fmt(b,'num1')}</div></div></div>`;
    }).join('');
  } else {
    cells = vals.map((v,i) => {
      if(k === 'peak') return `<div class="cell"><input value="${v??''}" onchange="manual['peak|${c}|${w[i]}']=this.value?parseFloat(this.value):null;localStorage.focoV6Manual=JSON.stringify(manual);render()"></div>`;
      return `<div class="cell value ${obj!=null ? diffCls(def,v,obj) : cls(k,v)}">${fmt(v,def.fmt)}</div>`;
    }).join('');
  }
  const promHtml = k === 'iplh'
    ? `<div class="split"><div class="value ${cls('iplh',avg(w.map(ww=>val(c,ww,'iplh'))))}">${fmt(avg(w.map(ww=>val(c,ww,'iplh'))),'num1')}</div><div class="value neutral">${fmt(avg(w.map(ww=>val(c,ww,'tplh'))),'num1')}</div></div>`
    : fmt(prom,def.fmt);
  return `<div class="storeMetric"><div class="indexBox">${n}</div><div class="storeName ${k==='bebida'?'alt':''}">${def.name}</div><div class="cell obj"><input placeholder="" value="${obj!=null?fmt(obj,def.fmt).replace('%',''):''}" onchange="setObjective('${c}','${k}',this.value,'${def.fmt}')"></div>${cells}<div class="cell value prom ${obj!=null?diffCls(def,prom,obj):cls(k,prom)}">${promHtml}</div></div>`;
}
function diffCls(def,v,o){ if(v == null || o == null) return 'neutral'; return def.dir === 'down' ? (v <= o ? 'green' : 'red') : (v >= o ? 'green' : 'red'); }
function setObjective(c,k,v,fmtType){
  const key = c+'|'+k;
  if(v === '') delete objectives[key];
  else {
    const n = parseFloat(String(v).replace('%','').replace(',','.'));
    if(!Number.isNaN(n)) objectives[key] = fmtType === 'pct1' && n > 1 ? n/100 : n;
  }
  localStorage.focoV6Objectives = JSON.stringify(objectives); render();
}
function saveAction(c,p,v){ actions[c+'|'+p] = v; localStorage.focoV6Actions = JSON.stringify(actions); }
function escapeHtml(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

init();
