/* ================= PROGRAM DATA (default seed — user can edit via Settings) ================= */
function ex(id,name,cat,sets,repMin,repMax,inc,rest){
  return {id,name,cat,sets,repMin,repMax,inc,rest};
}
const DEFAULT_PROGRAM = {
  A: { title:'День A', sub:'Ноги + грудь/спина', cls:'a', exercises:[
    ex('A1','Приседания со штангой','w',4,6,8,2.5,'2–3 мин'),
    ex('A2','Жим штанги лёжа','w',3,6,8,2.5,'2 мин'),
    ex('A3','Тяга верхнего блока широким хватом','w',3,8,10,2.5,'90 сек'),
    ex('A4','Жим ногами в тренажёре','w',3,10,12,5,'90 сек'),
    ex('A5','Жим гантелей сидя (плечи)','w',3,8,10,2,'90 сек'),
    ex('A6','Сгибания ног лёжа','w',3,10,12,2.5,'60 сек'),
    ex('A7','Ягодичный мостик со штангой','w',3,10,12,2.5,'90 сек'),
    ex('A8','Подъём на носки','w',4,12,15,2.5,'45 сек'),
    ex('A9','Сгибания запястий','w',3,12,15,1,'30 сек'),
    ex('A10','Планка','t',3,40,60,10,'45 сек'),
    ex('A11','Махи гирями','w',3,6,8,2,'90 сек'),
  ]},
  B: { title:'День B', sub:'Спина + задняя цепь', cls:'b', exercises:[
    ex('B1','Становая тяга (румынская)','w',4,6,8,2.5,'2–3 мин'),
    ex('B2','Подтягивания / тяга блока к груди','w',3,6,10,2.5,'2 мин'),
    ex('B3','Жим гантелей на наклонной','w',3,8,10,2,'90 сек'),
    ex('B4','Выпады с гантелями','w',3,8,12,2,'90 сек'),
    ex('B5','Тяга гантели одной рукой в наклоне','w',3,8,10,2,'90 сек'),
    ex('B6','Разгибания ног в тренажёре','w',3,10,12,2.5,'60 сек'),
    ex('B7','Болгарские выпады (ягодицы)','w',3,10,12,2,'90 сек'),
    ex('B8','Подъём на носки','w',4,15,20,2.5,'45 сек'),
    ex('B9','Вис на перекладине','t',3,20,30,5,'45 сек'),
    ex('B10','Скручивания на блоке / подъём ног в висе','w',3,12,15,0,'45 сек'),
    ex('B11','Фермерская прогулка (одна рука)','d',3,25,35,2,'45 сек'),
  ]},
  C: { title:'День C', sub:'Грудь/плечи + руки', cls:'c', exercises:[
    ex('C1','Присед со штангой (фронтальный/гоблет)','w',3,8,10,2.5,'2 мин'),
    ex('C2','Жим штанги лёжа узким хватом','w',3,6,8,2.5,'2 мин'),
    ex('C3','Горизонтальная тяга в блоке сидя','w',3,8,10,2.5,'90 сек'),
    ex('C4','Жим Арнольда / махи в стороны','w',3,10,12,2,'90 сек'),
    ex('C5','Бицепс + трицепс суперсет','w',3,10,12,1,'60 сек'),
    ex('C6','Гиперэкстензия','w',3,12,15,2.5,'60 сек'),
    ex('C7','Kickback в блоке (ягодицы)','w',3,10,12,2.5,'90 сек'),
    ex('C8','Подъём на носки в тренажёре (взрывной темп)','w',4,12,15,2.5,'45 сек'),
    ex('C9','Разгибание запястий','w',3,12,15,1,'30 сек'),
    ex('C10','Пресс (скручивания)','w',3,12,18,0,'45 сек'),
  ]}
};
function cloneProgram(p){ return JSON.parse(JSON.stringify(p)); }

const UNIT = {w:'кг', d:'кг'};
const REPUNIT = {w:'повт', t:'сек', d:'м'};
const DAY_LABELS = {A:'День A',B:'День B',C:'День C',cardio:'Кардио',rest:'Отдых'};

/* ================= STATE ================= */
const STORE_KEY = 'fb_tracker_v1';
function defaultState(){
  return {
    scheduleMap: {1:'A',2:'rest',3:'B',4:'rest',5:'C',6:'cardio',0:'rest'}, // 0=Вс..6=Сб
    cycleStart: todayStr(),
    lastDeload: null,
    deloadWeeks: 7,
    sessions: [], // {id,date,dayKey,readiness:{sleep,energy,soreness},exercises:[{exId,sets:[{a,b}]}]}
    theme: 'auto',
    program: cloneProgram(DEFAULT_PROGRAM),
    body: {
      targets: {kcal:null, protein:null, fat:null, carb:null}, // дневные цели КБЖУ, задаются вручную
      log: [], // {date, weightKg, heightCm, bodyFatPct, ffmi} — замеры тела, апдейтятся в любой момент
      nutrition: {} // {'YYYY-MM-DD': {entries:[{id,name,kcal,protein,fat,carb}], waterMl}}
    },
    updatedAt: 0 // ms epoch последнего изменения данных, нужен для синхронизации (sync.js)
  };
}
let state = loadState();
function normalizeState(parsed){
  const st = Object.assign(defaultState(), parsed);
  if(parsed && parsed.updatedAt==null) st.updatedAt = Date.now();
  return st;
}
function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return defaultState();
    return normalizeState(JSON.parse(raw));
  }catch(e){ return defaultState(); }
}
function saveState(opts){
  if(!opts || !opts.silent) state.updatedAt = Math.max(Date.now(), (state.updatedAt||0)+1);
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(e){}
  if(!opts || !opts.silent) Sync.schedulePush();
}
function todayStr(d){
  d = d || new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

/* ---- черновики: несохранённый ввод, переживает перезагрузку, не синхронизируется ---- */
const DRAFT_KEY = 'fb_tracker_drafts';
let drafts = loadDrafts();
function loadDrafts(){
  try{ return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {}; }catch(e){ return {}; }
}
function saveDrafts(){
  try{ localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts)); }catch(e){}
}
function formVal(key, fallback){
  const f = drafts.forms;
  return f && f[key]!==undefined ? f[key] : fallback;
}
function setFormVal(key, val){
  if(!drafts.forms) drafts.forms = {};
  drafts.forms[key] = val;
  saveDrafts();
}
function clearFormVals(prefix){
  if(!drafts.forms) return;
  Object.keys(drafts.forms).forEach(k=>{ if(k.startsWith(prefix)) delete drafts.forms[k]; });
  saveDrafts();
}

/* ================= HELPERS ================= */
const WD_NAMES = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
const MON_NAMES = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

function fmtDateBig(d){ return d.getDate() + ' ' + MON_NAMES[d.getMonth()]; }
function weekday(d){ return d.getDay(); }
function round(n){ return Math.round(n*10)/10; }

function weeksBetween(a,b){ return (b-a)/(1000*60*60*24*7); }

function dayKeyFor(date){ return state.scheduleMap[weekday(date)]; }

function sessionsForExercise(exId, beforeDate){
  return state.sessions
    .filter(s=>s.exercises.some(e=>e.exId===exId) && s.date < beforeDate)
    .sort((a,b)=> a.date < b.date ? 1 : -1);
}

function readinessAvg(r){
  if(!r) return null;
  const vals=[r.sleep,r.energy,r.soreness].filter(v=>v!=null);
  if(!vals.length) return null;
  return vals.reduce((a,b)=>a+b,0)/vals.length;
}

function escHtml(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* core progression suggestion */
function getSuggestion(exObj, forDate, readiness){
  const past = sessionsForExercise(exObj.id, forDate);
  const base = {weight:null, target:exObj.repMin, note:'Первый раз — подбери рабочий вес по ощущению (техника в приоритете).', fail:false};
  if(!past.length) return base;
  const last = past[0].exercises.find(e=>e.exId===exObj.id);
  const sets = last.sets.filter(s=>s.b!=null && s.b!=='');
  if(!sets.length) return base;
  const lastVals = sets.map(s=>Number(s.b));
  const lastWeight = sets.length && exObj.cat!=='t' ? Math.max(...sets.map(s=>Number(s.a)||0)) : null;
  const allTop = lastVals.every(v=>v>=exObj.repMax);
  const belowMin = lastVals.some(v=>v<exObj.repMin);
  let out;
  if(exObj.cat==='t'){
    if(allTop) out = {weight:null, target:exObj.repMin, note:`В прошлый раз держал ${Math.max(...lastVals)} сек — цель выросла на ${exObj.inc} сек, начни диапазон заново.`, bumpedTarget:exObj.repMax+exObj.inc};
    else out = {weight:null, target:Math.min(exObj.repMax, Math.max(...lastVals)+5), note:`Прошлый рекорд — ${Math.max(...lastVals)} сек. Попробуй продержаться дольше.`};
  } else {
    if(allTop && exObj.inc>0){
      out = {weight: round(lastWeight+exObj.inc), target: exObj.repMin, note:`Выполнил максимум повторов на ${lastWeight}${UNIT[exObj.cat]||'кг'} — добавляем ${exObj.inc}${UNIT[exObj.cat]||'кг'}, повторы вниз к ${exObj.repMin}.`};
    } else if(belowMin){
      out = {weight: lastWeight, target: exObj.repMin, note:`В прошлый раз не хватило повторов на ${lastWeight}${UNIT[exObj.cat]||'кг'} — оставляем тот же вес, пробуем снова.`, fail:true};
    } else if(allTop && exObj.inc===0){
      out = {weight: lastWeight, target: exObj.repMax, note:`Держишь максимум повторов — можно усложнить вариант упражнения (темп/амплитуда) или добавить утяжеление.`};
    } else {
      const nextTarget = Math.min(exObj.repMax, Math.max(...lastVals)+1);
      out = {weight: lastWeight, target: nextTarget, note:`Тот же вес (${lastWeight}${UNIT[exObj.cat]||'кг'}), стараемся сделать на 1 повтор больше, чем в прошлый раз.`};
    }
  }
  // readiness adjustment
  const avg = readinessAvg(readiness);
  if(avg!=null && avg<=2 && out.weight){
    out.weight = round(out.weight*0.9);
    out.note += ' Самочувствие низкое — вес снижен на ~10%.';
  }
  // consecutive-fail flag (2+ fails in a row)
  let fails=0;
  for(const s of past.slice(0,3)){
    const se = s.exercises.find(e=>e.exId===exObj.id);
    if(!se) continue;
    const vs = se.sets.filter(x=>x.b!=null && x.b!=='').map(x=>Number(x.b));
    if(vs.length && vs.some(v=>v<exObj.repMin)) fails++; else break;
  }
  out.consecutiveFails = fails;
  return out;
}

function deloadInfo(){
  const anchor = state.lastDeload || state.cycleStart;
  const w = weeksBetween(new Date(anchor), new Date());
  const remaining = state.deloadWeeks - w;
  return { weeksIn: w, remaining, due: remaining<=0 };
}

/* ================= RENDER ================= */
const app = document.getElementById('app');
const TABS = ['today','week','history','body','settings'];
let activeTab = TABS.includes(drafts.tab) ? drafts.tab : 'today';
let progEditorDay = 'A';

function setTab(tab){
  activeTab = tab;
  drafts.tab = tab;
  saveDrafts();
  render();
}

function render(){
  flushAutosave();
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on', b.dataset.tab===activeTab));
  if(activeTab==='today') return renderToday();
  if(activeTab==='week') return renderWeek();
  if(activeTab==='history') return renderHistory();
  if(activeTab==='body') return renderBody();
  if(activeTab==='settings') return renderSettings();
}

function todayDayKey(){
  const now = new Date();
  const ov = state.dayOverride;
  return ov && ov.date===todayStr(now) ? ov.dayKey : dayKeyFor(now);
}

function todayReadiness(){
  const dstr = todayStr();
  const already = state.sessions.find(s=>s.date===dstr);
  if(already) return already.readiness;
  const d = drafts.readiness;
  return d && d.date===dstr ? d : {sleep:null, energy:null, soreness:null};
}

function renderToday(){
  const now = new Date();
  const dstr = todayStr(now);
  const scheduled = dayKeyFor(now);
  const dk = todayDayKey();
  const dl = deloadInfo();
  const dayObj = (dk!=='rest' && dk!=='cardio') ? state.program[dk] : null;
  let html = '';
  const dayOptions = ['A','B','C','cardio','rest'].map(v=>{
    const label = (v===scheduled ? DAY_LABELS[v]+' (по расписанию)' : DAY_LABELS[v]);
    return `<option value="${v}" ${dk===v?'selected':''}>${label}</option>`;
  }).join('');
  html += `<div class="topbar">
    <div class="datebig num">${fmtDateBig(now)}</div>
    <div class="daysub">${WD_NAMES[weekday(now)]}</div>
    <div class="badge ${dk==='rest'?'rest':dk==='cardio'?'cardio':dk.toLowerCase()}">${dk==='rest'?'Отдых':dk==='cardio'?'Кардио день':escHtml(dayObj.title)+' · '+escHtml(dayObj.sub)}</div>
    <div class="dayswitch"><label>Тренировка сегодня</label><select onchange="setDayOverride(this.value)">${dayOptions}</select></div>
  </div>`;

  if(dl.due){
    html += `<div class="banner"><span>Разгрузочная неделя: прошло ${Math.floor(dl.weeksIn)} нед. без снижения нагрузки. Снизь объём/вес на ~40% на этой неделе.</span>
      <button onclick="markDeload()">Отметить</button></div>`;
  }

  if(dk==='rest'){
    html += `<div class="card"><h3>День отдыха</h3><p class="hint">Силовой тренировки нет. Держи привычные 10–15к шагов — это тоже часть плана. Лёгкая растяжка или прогулка приветствуются.</p></div>`;
  } else if(dk==='cardio'){
    html += `<div class="card"><h3>Кардио</h3><p class="hint">20–25 мин HIIT (30 сек максимум / 90 сек легко × 8–10) или 30–40 мин низкоинтенсивного кардио в пульсе 120–140. Не заменяй этим силовые дни.</p></div>`;
  } else {
    const prog = dayObj;
    const already = state.sessions.find(s=>s.date===dstr);
    const r = todayReadiness();
    html += `<div class="card"><h3>Самочувствие сегодня</h3>
      ${readinessRow('sleep','Сон', r.sleep, 'setReadiness')}
      ${readinessRow('energy','Энергия', r.energy, 'setReadiness')}
      ${readinessRow('soreness','Свежесть мышц', r.soreness, 'setReadiness')}
      <p class="hint">Влияет на рекомендации по весу ниже. Необязательно, но помогает не тянуть тяжёлое в плохой день.</p>
    </div>`;

    html += `<div class="card" id="today-card" data-dk="${dk}"><div class="daycard-title"><h3>${escHtml(prog.title)}</h3></div>`;
    prog.exercises.forEach((exo,i)=>{
      const sug = getSuggestion(exo, dstr, r);
      const savedSets = already && already.dayKey===dk ? (already.exercises.find(e=>e.exId===exo.id)||{}).sets : null;
      html += `<div class="ex" id="ex-${exo.id}">
        <div class="ex-head"><span class="ex-name">${i+1}. ${escHtml(exo.name)}</span><span class="ex-tag">${exo.sets}×${exo.repMin}-${exo.repMax}</span></div>
        <div class="ex-meta">Отдых ${escHtml(exo.rest)}</div>
        <div class="suggest">${sug.weight!=null?`<b>${sug.weight} ${UNIT[exo.cat]||'кг'} × ${sug.target} ${REPUNIT[exo.cat]}</b> — `:`<b>Цель: ${sug.target} ${REPUNIT[exo.cat]}</b> — `}${sug.note}</div>
        ${sug.consecutiveFails>=2?'<div class="fail-flag">⚠ Уже '+sug.consecutiveFails+' раза подряд не хватает повторов — возможно, вес великоват, рассмотри снижение.</div>':''}
        <div class="sets">${buildSetRows(exo, sug, savedSets)}</div>
      </div>`;
    });
    html += `</div>`;
    html += `<div class="save-status" id="save-status">${already?'Сохранено автоматически ✓':'Ввод сохраняется автоматически'}</div>`;
    html += `<button class="save-btn" onclick="saveSession()">${already?'Обновить тренировку':'Сохранить тренировку'}</button>`;
  }
  app.innerHTML = html;
}

function readinessRow(key,label,val,handler){
  let dots='';
  for(let i=1;i<=5;i++){
    dots+=`<button class="dot ${val===i?'on':''}" onclick="${handler}('${key}',${i})">${i}</button>`;
  }
  return `<div class="readiness-row"><label>${label}</label><div class="dots">${dots}</div></div>`;
}
function setReadiness(key,val){
  const dstr = todayStr();
  const existing = state.sessions.find(s=>s.date===dstr);
  if(existing){ existing.readiness[key]=val; saveState(); }
  else {
    const cur = drafts.readiness && drafts.readiness.date===dstr ? drafts.readiness : {sleep:null, energy:null, soreness:null};
    drafts.readiness = Object.assign({}, cur, {date:dstr, [key]:val});
    saveDrafts();
  }
  render();
}

function setRowHtml(cat, exId, i, aVal, bVal, ph, mode){
  const at = `data-mode="${mode}" data-ex="${exId}" data-set="${i}"`;
  aVal = escHtml(aVal); bVal = escHtml(bVal);
  if(cat==='t'){
    return `<div class="setrow"><span class="idx">${i+1}</span>
      <input type="number" inputmode="numeric" placeholder="${ph}" value="${bVal}" ${at} data-f="b" style="max-width:120px">
      <span class="u">сек</span></div>`;
  }
  const bMode = cat==='d' ? 'decimal' : 'numeric';
  const bUnit = cat==='d' ? 'м' : 'повт';
  return `<div class="setrow"><span class="idx">${i+1}</span>
    <input type="number" inputmode="decimal" step="0.5" placeholder="вес" value="${aVal}" ${at} data-f="a">
    <span class="u">кг</span>
    <input type="number" inputmode="${bMode}" placeholder="${ph}" value="${bVal}" ${at} data-f="b">
    <span class="u">${bUnit}</span></div>`;
}

function buildSetRows(exo, sug, savedSets){
  const count = Math.max(exo.sets, savedSets ? savedSets.length : 0);
  let rows='';
  for(let i=0;i<count;i++){
    const saved = savedSets && savedSets[i] ? savedSets[i] : null;
    const aVal = saved ? saved.a : (exo.cat!=='t' && sug.weight!=null ? sug.weight : '');
    const bVal = saved ? saved.b : '';
    rows += setRowHtml(exo.cat, exo.id, i, aVal, bVal, sug.target, 'today');
  }
  return rows;
}

/* ---- автосохранение сегодняшней тренировки: пишем прямо в сессию, пока идёт ввод ---- */
let autosaveTimer = null;
function scheduleAutosave(){
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(autosaveToday, 500);
  setSaveStatus('Сохраняю…');
}
function flushAutosave(){
  if(autosaveTimer){ clearTimeout(autosaveTimer); autosaveToday(); }
}
function autosaveToday(){
  autosaveTimer = null;
  if(writeTodaySession(false)){
    saveState();
    setSaveStatus('Сохранено автоматически ✓');
  }
}
function setSaveStatus(text){
  const el = document.getElementById('save-status');
  if(el) el.textContent = text;
}

function collectTodayExercises(dk){
  return state.program[dk].exercises.map(exo=>{
    const sets=[];
    document.querySelectorAll(`.ex[id="ex-${exo.id}"] .setrow`).forEach(row=>{
      const aEl = row.querySelector('input[data-f="a"]');
      const bEl = row.querySelector('input[data-f="b"]');
      sets.push({a: aEl ? aEl.value : '', b: bEl ? bEl.value : ''});
    });
    return {exId:exo.id, sets};
  });
}

function writeTodaySession(force){
  const card = document.getElementById('today-card');
  if(!card) return false;
  const dk = card.dataset.dk;
  if(!state.program[dk]) return false;
  const dstr = todayStr();
  const exercises = collectTodayExercises(dk);
  const existingIdx = state.sessions.findIndex(s=>s.date===dstr);
  const existing = existingIdx>=0 ? state.sessions[existingIdx] : null;
  if(!force && !existing && !exercises.some(e=>e.sets.some(s=>s.b!==''))) return false;
  const dr = drafts.readiness && drafts.readiness.date===dstr ? drafts.readiness : {};
  const readiness = existing ? existing.readiness : {sleep:dr.sleep??null, energy:dr.energy??null, soreness:dr.soreness??null};
  const session = {id: dstr+'-'+dk, date:dstr, dayKey:dk, readiness, exercises};
  if(existing) state.sessions[existingIdx] = session; else state.sessions.push(session);
  if(drafts.readiness){ delete drafts.readiness; saveDrafts(); }
  return true;
}

function saveSession(){
  clearTimeout(autosaveTimer); autosaveTimer = null;
  if(writeTodaySession(true)){
    saveState();
    showToast('Тренировка сохранена');
  }
  render();
}

let toastTimer = null;
function showToast(msg){
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove('show'), 2200);
}

function markDeload(){
  state.lastDeload = todayStr();
  saveState();
  render();
}

function setDayOverride(val){
  flushAutosave();
  const dstr = todayStr();
  const idx = state.sessions.findIndex(s=>s.date===dstr);
  const existing = idx>=0 ? state.sessions[idx] : null;
  if(existing && existing.dayKey!==val){
    const hasData = existing.exercises.some(e=>e.sets.some(s=>s.b!==''));
    if(hasData && !confirm(`Сегодня уже записана тренировка «${DAY_LABELS[existing.dayKey]||existing.dayKey}». Сменить день и удалить её?`)){
      render();
      return;
    }
    state.sessions.splice(idx,1);
  }
  const scheduled = dayKeyFor(new Date());
  if(val === scheduled) delete state.dayOverride;
  else state.dayOverride = {date: dstr, dayKey: val};
  saveState();
  render();
}

function renderWeek(){
  let html = `<div class="topbar"><h1>Программа на неделю</h1><div class="daysub">Полный список упражнений по дням</div></div>`;
  const order = [1,2,3,4,5,6,0];
  order.forEach(wd=>{
    const dk = state.scheduleMap[wd];
    html += `<div class="card"><div class="daycard-title"><span class="badge ${dk==='rest'?'rest':dk==='cardio'?'cardio':dk.toLowerCase()}" style="margin-top:0">${WD_NAMES[wd]}</span></div>`;
    if(dk==='rest'){ html += `<p class="hint">Отдых · шаги 10–15к</p>`; }
    else if(dk==='cardio'){ html += `<p class="hint">HIIT 20–25 мин или LISS 30–40 мин</p>`; }
    else {
      state.program[dk].exercises.forEach((e,i)=>{
        html += `<div class="weekitem"><span>${i+1}. ${escHtml(e.name)}</span><span class="r">${e.sets}×${e.repMin}-${e.repMax}</span></div>`;
      });
    }
    html += `</div>`;
  });
  app.innerHTML = html;
}

/* records (PR) — computed from session history, no manual entry */
function computeRecords(){
  const recs = {};
  state.sessions.forEach(s=>{
    const prog = state.program[s.dayKey];
    s.exercises.forEach(e=>{
      const exo = prog ? prog.exercises.find(x=>x.id===e.exId) : null;
      const name = exo ? exo.name : e.exId;
      const cat = exo ? exo.cat : 'w';
      e.sets.forEach(set=>{
        if(set.b==null || set.b==='') return;
        const b = Number(set.b);
        if(!recs[e.exId]) recs[e.exId] = {name, cat};
        const r = recs[e.exId];
        r.name = name;
        if(cat==='t'){
          if(r.bestTime==null || b>r.bestTime) r.bestTime = b;
        } else {
          const a = Number(set.a)||0;
          if(r.bestWeight==null || a>r.bestWeight){ r.bestWeight=a; r.bestReps=b; }
          if(cat==='w' && a>0){
            const oneRM = round(a*(1+b/30)); // формула Эпли
            if(r.best1RM==null || oneRM>r.best1RM) r.best1RM = oneRM;
          }
        }
      });
    });
  });
  return recs;
}

function recordsCard(){
  const recs = computeRecords();
  const ids = Object.keys(recs);
  if(!ids.length) return '';
  let html = `<div class="card"><h3>Рекорды</h3><p class="hint">Лучший результат за всё время по каждому упражнению — считается автоматически из истории.</p>`;
  ids.forEach(id=>{
    const r = recs[id];
    let line;
    if(r.cat==='t') line = `${r.bestTime} сек`;
    else {
      line = `${r.bestWeight} ${UNIT[r.cat]||'кг'} × ${r.bestReps} ${REPUNIT[r.cat]}`;
      if(r.best1RM) line += ` · ~1ПМ ${r.best1RM} кг`;
    }
    html += `<div class="weekitem"><span>${escHtml(r.name)}</span><span class="r">${line}</span></div>`;
  });
  html += `</div>`;
  return html;
}

function renderHistory(){
  let html = `<div class="topbar"><h1>История</h1><div class="daysub">${state.sessions.length} тренировок записано</div></div>`;
  html += recordsCard();
  if(drafts.edit && !state.sessions.some(s=>s.id===drafts.edit.origId)){ delete drafts.edit; saveDrafts(); }
  if(!state.sessions.length){
    html += `<div class="empty">Пока пусто — заполни и сохрани сегодняшнюю тренировку на вкладке «Сегодня».</div>`;
  } else {
    const sorted = [...state.sessions].sort((a,b)=> a.date<b.date?1:-1);
    sorted.forEach(s=>{
      if(drafts.edit && drafts.edit.origId===s.id){ html += renderEditCard(drafts.edit.session); return; }
      const prog = state.program[s.dayKey];
      const d = new Date(s.date+'T00:00:00');
      html += `<div class="card">
        <div class="hist-day"><div><div class="hist-date">${fmtDateBig(d)} · ${escHtml(prog?prog.title:s.dayKey)}</div>
        <div class="hist-sub">${WD_NAMES[weekday(d)]}</div></div>
        <div class="hist-actions"><button class="hist-del" onclick="startEdit('${s.id}')">изменить</button><button class="hist-del" onclick="delSession('${s.id}')">удалить</button></div></div>`;
      s.exercises.forEach(e=>{
        const exo = prog ? prog.exercises.find(x=>x.id===e.exId) : null;
        if(!exo) return;
        const setsTxt = e.sets.filter(x=>x.b!=='').map(x=> exo.cat==='w'||exo.cat==='d' ? `${x.a||'–'}×${x.b}` : `${x.b}`).join(' · ');
        if(!setsTxt) return;
        html += `<div class="hist-ex">${escHtml(exo.name)} <span class="sets">${escHtml(setsTxt)}</span></div>`;
      });
      html += `</div>`;
    });
  }
  app.innerHTML = html;
}
function delSession(id){
  if(!confirm('Удалить эту тренировку из истории?')) return;
  state.sessions = state.sessions.filter(s=>s.id!==id);
  if(drafts.edit && drafts.edit.origId===id){ delete drafts.edit; saveDrafts(); }
  saveState(); render();
}

/* ---- редактирование сохранённой тренировки (рабочая копия живёт в drafts.edit) ---- */
function startEdit(id){
  const s = state.sessions.find(x=>x.id===id);
  if(!s) return;
  const copy = JSON.parse(JSON.stringify(s));
  copy.readiness = Object.assign({sleep:null, energy:null, soreness:null}, copy.readiness);
  drafts.edit = {origId:id, session:copy};
  saveDrafts();
  render();
}
function cancelEdit(){
  delete drafts.edit;
  saveDrafts();
  render();
}

function editExerciseList(sess){
  const prog = state.program[sess.dayKey];
  const list = prog ? prog.exercises.map(e=>({id:e.id, name:e.name, cat:e.cat, sets:e.sets, target:e.repMin})) : [];
  const known = new Set(list.map(e=>e.id));
  sess.exercises.forEach(e=>{
    if(!known.has(e.exId)) list.push({id:e.exId, name:'Упражнение вне программы ('+e.exId+')', cat:'w', sets:e.sets.length, target:''});
  });
  return list;
}
function editEntry(sess, exId){
  let e = sess.exercises.find(x=>x.exId===exId);
  if(!e){ e = {exId, sets:[]}; sess.exercises.push(e); }
  return e;
}
function editSetCount(sess, exo){
  const e = sess.exercises.find(x=>x.exId===exo.id);
  return e && e.sets.length ? e.sets.length : exo.sets;
}
function editFillSets(sess, exo){
  const e = editEntry(sess, exo.id);
  const n = editSetCount(sess, exo);
  while(e.sets.length<n) e.sets.push({a:'', b:''});
  return e;
}

function renderEditCard(sess){
  const list = editExerciseList(sess);
  const dayOpts = ['A','B','C'].map(v=>`<option value="${v}" ${sess.dayKey===v?'selected':''}>${escHtml(state.program[v].title)}</option>`).join('');
  let html = `<div class="card edit-card"><h3>Редактирование тренировки</h3>
    <div class="field"><label>Дата</label><input type="date" value="${escHtml(sess.date)}" onchange="editChangeDate(this.value)"></div>
    <div class="field"><label>День программы</label><select onchange="editChangeDay(this.value)">${dayOpts}</select></div>
    ${readinessRow('sleep','Сон', sess.readiness.sleep, 'editSetReadiness')}
    ${readinessRow('energy','Энергия', sess.readiness.energy, 'editSetReadiness')}
    ${readinessRow('soreness','Свежесть мышц', sess.readiness.soreness, 'editSetReadiness')}`;
  list.forEach((exo,i)=>{
    const e = sess.exercises.find(x=>x.exId===exo.id);
    const n = editSetCount(sess, exo);
    let rows = '';
    for(let k=0;k<n;k++){
      const st = e && e.sets[k] ? e.sets[k] : {a:'', b:''};
      rows += setRowHtml(exo.cat, exo.id, k, st.a, st.b, exo.target, 'edit');
    }
    html += `<div class="ex"><div class="ex-head"><span class="ex-name">${i+1}. ${escHtml(exo.name)}</span></div>
      <div class="sets">${rows}</div>
      <div class="btnline"><button class="btn" onclick="editAddSet('${exo.id}')">+ подход</button><button class="btn" onclick="editRemoveSet('${exo.id}')">− подход</button></div></div>`;
  });
  html += `<div class="btnline"><button class="btn" onclick="cancelEdit()">Отмена</button><button class="btn primary" onclick="saveEdit()">Сохранить изменения</button></div></div>`;
  return html;
}

function updateEditFromInput(t){
  if(!drafts.edit) return;
  const sess = drafts.edit.session;
  const e = editEntry(sess, t.dataset.ex);
  const i = Number(t.dataset.set);
  while(e.sets.length<=i) e.sets.push({a:'', b:''});
  e.sets[i][t.dataset.f] = t.value;
  saveDrafts();
}
function editSetReadiness(key, val){
  drafts.edit.session.readiness[key] = val;
  saveDrafts();
  render();
}
function editChangeDate(val){
  const sess = drafts.edit.session;
  if(val){
    const clash = state.sessions.find(s=>s.date===val && s.id!==drafts.edit.origId);
    if(clash) alert('На эту дату уже есть другая тренировка. Удали её или выбери другую дату.');
    else sess.date = val;
  }
  saveDrafts();
  render();
}
function editChangeDay(val){
  const sess = drafts.edit.session;
  if(val===sess.dayKey) return;
  const ids = new Set(state.program[val].exercises.map(e=>e.id));
  const hasData = e => e.sets.some(s=>s.a!=='' || s.b!=='');
  const lost = sess.exercises.filter(e=>!ids.has(e.exId) && hasData(e));
  if(lost.length && !confirm('У выбранного дня другой набор упражнений — данные по '+lost.length+' упр. будут удалены. Продолжить?')){
    render();
    return;
  }
  sess.exercises = sess.exercises.filter(e=>ids.has(e.exId));
  sess.dayKey = val;
  saveDrafts();
  render();
}
function editAddSet(exId){
  const sess = drafts.edit.session;
  const exo = editExerciseList(sess).find(x=>x.id===exId);
  const e = editFillSets(sess, exo);
  e.sets.push({a:'', b:''});
  saveDrafts();
  render();
}
function editRemoveSet(exId){
  const sess = drafts.edit.session;
  const exo = editExerciseList(sess).find(x=>x.id===exId);
  const e = editFillSets(sess, exo);
  if(e.sets.length>1) e.sets.pop();
  saveDrafts();
  render();
}

function saveEdit(){
  const ed = drafts.edit;
  if(!ed) return;
  const sess = ed.session;
  if(!sess.date){ alert('Укажи дату.'); return; }
  if(state.sessions.some(s=>s.date===sess.date && s.id!==ed.origId)){
    alert('На эту дату уже есть другая тренировка. Удали её или выбери другую дату.');
    return;
  }
  const exercises = [];
  editExerciseList(sess).forEach(exo=>{
    const e = sess.exercises.find(x=>x.exId===exo.id);
    if(!e) return;
    const sets = e.sets.map(s=>({a:s.a, b:s.b}));
    while(sets.length && sets[sets.length-1].a==='' && sets[sets.length-1].b==='') sets.pop();
    if(sets.length) exercises.push({exId:exo.id, sets});
  });
  const saved = {id: sess.date+'-'+sess.dayKey, date:sess.date, dayKey:sess.dayKey, readiness:sess.readiness, exercises};
  const idx = state.sessions.findIndex(s=>s.id===ed.origId);
  if(idx>=0) state.sessions[idx] = saved; else state.sessions.push(saved);
  delete drafts.edit;
  saveDrafts();
  saveState();
  showToast('Изменения сохранены');
  render();
}

/* ================= BODY: КБЖУ / вода / FFMI ================= */
function calcFFMI(weightKg, heightCm, bodyFatPct){
  const h = heightCm/100;
  const lean = weightKg * (1 - bodyFatPct/100);
  return round(lean/(h*h) + 6.1*(1.8-h));
}

function latestBodyEntry(){
  if(!state.body.log.length) return null;
  return [...state.body.log].sort((a,b)=> a.date<b.date?1:-1)[0];
}

function getNutritionDay(dstr){
  return state.body.nutrition[dstr] || {entries:[], waterMl:0};
}
function ensureNutritionDay(dstr){
  if(!state.body.nutrition[dstr]) state.body.nutrition[dstr] = {entries:[], waterMl:0};
  return state.body.nutrition[dstr];
}

function renderBody(){
  const dstr = todayStr();
  let html = `<div class="topbar"><h1>Тело</h1><div class="daysub">КБЖУ, вода, состав тела</div></div>`;
  html += bodyCompositionCard();
  html += nutritionCard(dstr);
  html += waterCard(dstr);
  app.innerHTML = html;
}

function bodyCompositionCard(){
  const latest = latestBodyEntry();
  let html = `<div class="card"><h3>Вес и состав тела</h3>`;
  if(latest){
    html += `<div class="metric-row"><span>FFMI</span><b class="num">${latest.ffmi}</b></div>
      <p class="hint">Последний замер: ${fmtDateBig(new Date(latest.date+'T00:00:00'))} — ${latest.weightKg} кг, ${latest.heightCm} см, ${latest.bodyFatPct}% жира.</p>`;
  } else {
    html += `<p class="hint">Пока нет ни одного замера — добавь первый, чтобы считать FFMI и цель по воде.</p>`;
  }
  html += `<div class="field"><label>Вес (кг)</label><input type="number" inputmode="decimal" step="0.1" id="bf-weight" data-draft="bf-weight" value="${escHtml(formVal('bf-weight', latest?latest.weightKg:''))}"></div>
    <div class="field"><label>Рост (см)</label><input type="number" inputmode="decimal" step="0.5" id="bf-height" data-draft="bf-height" value="${escHtml(formVal('bf-height', latest?latest.heightCm:''))}"></div>
    <div class="field"><label>% жира</label><input type="number" inputmode="decimal" step="0.1" id="bf-fat" data-draft="bf-fat" value="${escHtml(formVal('bf-fat', latest?latest.bodyFatPct:''))}"></div>
    <div class="btnline"><button class="btn" onclick="addBodyEntry()">Сохранить замер на сегодня</button></div>`;
  if(state.body.log.length){
    html += `<div class="pexlist">`;
    [...state.body.log].sort((a,b)=> a.date<b.date?1:-1).forEach(e=>{
      html += `<div class="weekitem"><span>${fmtDateBig(new Date(e.date+'T00:00:00'))} · ${e.weightKg} кг, ${e.bodyFatPct}%</span>
        <span class="r num">FFMI ${e.ffmi} <button class="hist-del" onclick="deleteBodyEntry('${e.date}')">✕</button></span></div>`;
    });
    html += `</div>`;
  }
  html += `</div>`;
  return html;
}

function addBodyEntry(){
  const w = Number(document.getElementById('bf-weight').value);
  const h = Number(document.getElementById('bf-height').value);
  const bf = Number(document.getElementById('bf-fat').value);
  if(!(w>0) || !(h>0) || !(bf>=0 && bf<100)){ alert('Заполни вес, рост и % жира корректными числами.'); return; }
  const dstr = todayStr();
  const ffmi = calcFFMI(w,h,bf);
  const idx = state.body.log.findIndex(e=>e.date===dstr);
  const entry = {date:dstr, weightKg:w, heightCm:h, bodyFatPct:bf, ffmi};
  if(idx>=0) state.body.log[idx] = entry; else state.body.log.push(entry);
  clearFormVals('bf-');
  saveState();
  render();
}

function deleteBodyEntry(date){
  if(!confirm('Удалить этот замер?')) return;
  state.body.log = state.body.log.filter(e=>e.date!==date);
  saveState();
  render();
}

function macroProgressRow(label, actual, target, unit){
  const a = round(actual);
  const pct = target ? Math.min(100, Math.round(actual/target*100)) : 0;
  const over = target!=null && actual>target;
  return `<div class="metric-row"><span>${label}</span><b class="num">${a}${target!=null?` / ${target}`:''} ${unit}</b></div>
    ${target!=null?`<div class="pbar"><div class="pbar-fill${over?' over':''}" style="width:${pct}%"></div></div>`:''}`;
}

function nutritionCard(dstr){
  const day = getNutritionDay(dstr);
  const t = state.body.targets;
  const totals = day.entries.reduce((acc,e)=>({
    kcal:acc.kcal+(Number(e.kcal)||0), protein:acc.protein+(Number(e.protein)||0),
    fat:acc.fat+(Number(e.fat)||0), carb:acc.carb+(Number(e.carb)||0)
  }), {kcal:0,protein:0,fat:0,carb:0});

  let html = `<div class="card"><h3>КБЖУ сегодня</h3>`;
  html += `<div class="field"><label>Цель: ккал / белки / жиры / углеводы (г)</label>
    <div class="targets-grid">
      <input type="number" inputmode="numeric" placeholder="ккал" value="${t.kcal??''}" onchange="setTarget('kcal',this.value)">
      <input type="number" inputmode="numeric" placeholder="Б" value="${t.protein??''}" onchange="setTarget('protein',this.value)">
      <input type="number" inputmode="numeric" placeholder="Ж" value="${t.fat??''}" onchange="setTarget('fat',this.value)">
      <input type="number" inputmode="numeric" placeholder="У" value="${t.carb??''}" onchange="setTarget('carb',this.value)">
    </div>
  </div>`;

  html += macroProgressRow('Калории', totals.kcal, t.kcal, 'ккал');
  html += macroProgressRow('Белки', totals.protein, t.protein, 'г');
  html += macroProgressRow('Жиры', totals.fat, t.fat, 'г');
  html += macroProgressRow('Углеводы', totals.carb, t.carb, 'г');

  if(day.entries.length){
    html += `<div class="pexlist">`;
    day.entries.forEach(e=>{
      html += `<div class="foodrow"><div><b>${escHtml(e.name)}</b><div class="hint" style="margin-top:2px">${e.kcal} ккал · Б${e.protein} Ж${e.fat} У${e.carb}</div></div>
        <button class="hist-del" onclick="deleteFoodEntry('${e.id}')">✕</button></div>`;
    });
    html += `</div>`;
  }

  html += `<div class="pex-fields food-add">
    <label>Название<input type="text" id="food-name" data-draft="food-name" value="${escHtml(formVal('food-name',''))}" placeholder="Например, овсянка"></label>
    <label>Ккал<input type="number" inputmode="numeric" id="food-kcal" data-draft="food-kcal" value="${escHtml(formVal('food-kcal',''))}"></label>
    <label>Белки, г<input type="number" inputmode="decimal" id="food-protein" data-draft="food-protein" value="${escHtml(formVal('food-protein',''))}"></label>
    <label>Жиры, г<input type="number" inputmode="decimal" id="food-fat" data-draft="food-fat" value="${escHtml(formVal('food-fat',''))}"></label>
    <label>Углеводы, г<input type="number" inputmode="decimal" id="food-carb" data-draft="food-carb" value="${escHtml(formVal('food-carb',''))}"></label>
  </div>
  <button class="btn add-ex-btn" onclick="addFoodEntry()">+ Добавить приём пищи</button>`;

  html += `</div>`;
  return html;
}

function setTarget(field, val){
  state.body.targets[field] = val==='' ? null : Number(val);
  saveState();
  render();
}

function addFoodEntry(){
  const name = document.getElementById('food-name').value.trim();
  const kcal = Number(document.getElementById('food-kcal').value)||0;
  const protein = Number(document.getElementById('food-protein').value)||0;
  const fat = Number(document.getElementById('food-fat').value)||0;
  const carb = Number(document.getElementById('food-carb').value)||0;
  if(!name){ alert('Укажи название приёма пищи.'); return; }
  const dstr = todayStr();
  ensureNutritionDay(dstr).entries.push({id:'f'+Date.now(), name, kcal, protein, fat, carb});
  clearFormVals('food-');
  saveState();
  render();
}

function deleteFoodEntry(id){
  const day = state.body.nutrition[todayStr()];
  if(!day) return;
  day.entries = day.entries.filter(e=>e.id!==id);
  saveState();
  render();
}

function waterCard(dstr){
  const day = getNutritionDay(dstr);
  const latest = latestBodyEntry();
  const target = latest ? Math.round(latest.weightKg*35) : null;
  const pct = target ? Math.min(100, Math.round(day.waterMl/target*100)) : 0;
  let html = `<div class="card"><h3>Вода</h3>`;
  if(!target){
    html += `<p class="hint">Добавь вес в разделе «Вес и состав тела» — тогда посчитаю цель (35 мл × вес).</p>`;
  }
  html += `<div class="metric-row"><span>Сегодня</span><b class="num">${day.waterMl}${target!=null?` / ${target}`:''} мл</b></div>`;
  if(target) html += `<div class="pbar"><div class="pbar-fill${day.waterMl>target?' over':''}" style="width:${pct}%"></div></div>`;
  html += `<div class="btnline"><button class="btn" onclick="addWater(500)">+500 мл</button><button class="btn" onclick="addWater(250)">+250 мл</button><button class="btn danger" onclick="resetWater()">Сбросить</button></div>`;
  html += `</div>`;
  return html;
}

function addWater(ml){
  ensureNutritionDay(todayStr()).waterMl += ml;
  saveState();
  render();
}
function resetWater(){
  ensureNutritionDay(todayStr()).waterMl = 0;
  saveState();
  render();
}

function renderSettings(){
  const dl = deloadInfo();
  let html = `<div class="topbar"><h1>Настройки</h1></div>`;
  html += `<div class="card"><h3>Разгрузочные недели</h3>
    <div class="field"><label>Интервал (недель, обычно 6–8)</label>
      <input type="number" min="4" max="10" value="${state.deloadWeeks}" onchange="setDeloadWeeks(this.value)"></div>
    <p class="hint">Сейчас прошло ${Math.floor(dl.weeksIn)} нед. с последней разгрузки. ${dl.due?'Пора делать разгрузку.':'Ещё ~'+Math.max(0,Math.ceil(dl.remaining))+' нед. до неё.'}</p>
    <div class="btnline"><button class="btn" onclick="markDeload()">Отметить разгрузку сегодня</button></div>
  </div>`;

  html += `<div class="card"><h3>Расписание недели</h3><div class="sched-grid">`;
  const order=[1,2,3,4,5,6,0];
  order.forEach(wd=>{
    html += `<span>${WD_NAMES[wd].slice(0,2)}</span><select onchange="setSchedule(${wd},this.value)">
      ${['A','B','C','cardio','rest'].map(v=>`<option value="${v}" ${state.scheduleMap[wd]===v?'selected':''}>${DAY_LABELS[v]}</option>`).join('')}
    </select>`;
  });
  html += `</div></div>`;

  html += programEditorCard();

  html += `<div class="card"><h3>Тема</h3>
    <div class="field"><select onchange="setTheme(this.value)">
      <option value="auto" ${state.theme==='auto'?'selected':''}>Системная</option>
      <option value="light" ${state.theme==='light'?'selected':''}>Светлая</option>
      <option value="dark" ${state.theme==='dark'?'selected':''}>Тёмная</option>
    </select></div>
  </div>`;

  html += syncCard();

  html += `<div class="card"><h3>Данные</h3>
    <p class="hint">Данные всегда хранятся локально в этом браузере (автосохранение при вводе). Если подключена синхронизация — дополнительно копируются на сервер. Бэкап в JSON — на всякий случай или для переноса вручную.</p>
    <div class="btnline">
      <button class="btn" onclick="exportData()">Экспортировать JSON</button>
      <button class="btn" onclick="triggerImport()">Импортировать JSON</button>
    </div>
    <input type="file" id="import-file" accept="application/json" style="display:none" onchange="importData(this)">
    <div class="btnline"><button class="btn danger" onclick="resetAll()">Сбросить всё</button></div>
  </div>`;

  app.innerHTML = html;
}

/* ---- sync UI (логика в sync.js) ---- */
function syncCard(){
  let html = `<div class="card"><h3>Синхронизация</h3>
    <p class="hint">Общая база для всех твоих устройств: изменения автоматически уходят на сервер и подтягиваются на других устройствах. Нужен ключ — то же значение, что записано в переменной SYNC_TOKEN на сервере.</p>
    <div class="metric-row"><span>Статус</span><b id="sync-status" class="sync-status">${escHtml(Sync.statusText())}</b></div>`;
  if(Sync.enabled()){
    html += `<div class="btnline"><button class="btn" onclick="Sync.syncNow(true)">Синхронизировать сейчас</button><button class="btn danger" onclick="disconnectSync()">Отключить</button></div>`;
  } else {
    html += `<div class="field"><label>Ключ синхронизации</label><input type="password" id="sync-token" autocomplete="off" placeholder="SYNC_TOKEN"></div>
      <div class="btnline"><button class="btn" onclick="connectSync()">Подключить</button></div>`;
  }
  if(Sync.hasBackup()){
    html += `<p class="hint">При последнем конфликте одна из версий данных была заменена — её копия сохранена.</p>
      <div class="btnline"><button class="btn" onclick="Sync.downloadBackup()">Скачать вытесненную копию</button></div>`;
  }
  return html + `</div>`;
}
async function connectSync(){
  const v = document.getElementById('sync-token').value.trim();
  if(!v){ alert('Введи ключ синхронизации.'); return; }
  await Sync.connect(v);
  render();
}
function disconnectSync(){
  if(!confirm('Отключить синхронизацию на этом устройстве? Данные на устройстве и на сервере останутся как есть.')) return;
  Sync.disconnect();
  render();
}

/* ---- program editor ---- */
function programEditorCard(){
  const days = ['A','B','C'];
  const day = state.program[progEditorDay];
  let html = `<div class="card"><h3>Редактор программы</h3>
    <p class="hint">Меняй упражнения, диапазоны повторов, шаг прогрессии и отдых под себя. Удаление упражнения не стирает историю по нему — оно просто выпадает из текущей программы.</p>
    <div class="progtabs">`;
  days.forEach(dk=>{
    html += `<button class="ptab ${progEditorDay===dk?'on':''}" onclick="setProgEditorDay('${dk}')">${dk}</button>`;
  });
  html += `</div>`;

  html += `<div class="field"><label>Название дня</label>
    <input type="text" value="${escHtml(day.title)}" onchange="setDayField('${progEditorDay}','title',this.value)"></div>
  <div class="field"><label>Подзаголовок</label>
    <input type="text" value="${escHtml(day.sub)}" onchange="setDayField('${progEditorDay}','sub',this.value)"></div>`;

  html += `<div class="pexlist">`;
  day.exercises.forEach((exo,i)=>{
    html += exerciseEditRow(progEditorDay, exo, i, day.exercises.length);
  });
  html += `</div>`;
  html += `<button class="btn add-ex-btn" onclick="addExercise('${progEditorDay}')">+ Добавить упражнение</button>`;
  html += `<div class="btnline"><button class="btn" onclick="resetProgram()">Восстановить программу по умолчанию</button></div>`;
  html += `</div>`;
  return html;
}

function exerciseEditRow(dk, exo, i, total){
  return `<div class="pexrow">
    <div class="pexrow-head">
      <span class="pex-idx">${i+1}</span>
      <input type="text" class="pex-name" value="${escHtml(exo.name)}" onchange="setExField('${dk}','${exo.id}','name',this.value)" placeholder="Название упражнения">
      <div class="pex-reorder">
        <button ${i===0?'disabled':''} onclick="moveExercise('${dk}','${exo.id}',-1)" aria-label="Выше">↑</button>
        <button ${i===total-1?'disabled':''} onclick="moveExercise('${dk}','${exo.id}',1)" aria-label="Ниже">↓</button>
      </div>
      <button class="pex-del" onclick="deleteExercise('${dk}','${exo.id}')" aria-label="Удалить">✕</button>
    </div>
    <div class="pex-fields">
      <label>Тип<select onchange="setExField('${dk}','${exo.id}','cat',this.value)">
        <option value="w" ${exo.cat==='w'?'selected':''}>Вес × повторы</option>
        <option value="t" ${exo.cat==='t'?'selected':''}>Время</option>
        <option value="d" ${exo.cat==='d'?'selected':''}>Дистанция</option>
      </select></label>
      <label>Подходы<input type="number" inputmode="numeric" min="1" max="8" value="${exo.sets}" onchange="setExField('${dk}','${exo.id}','sets',Number(this.value)||1)"></label>
      <label>Повт. мин<input type="number" inputmode="numeric" min="1" value="${exo.repMin}" onchange="setExField('${dk}','${exo.id}','repMin',Number(this.value)||1)"></label>
      <label>Повт. макс<input type="number" inputmode="numeric" min="1" value="${exo.repMax}" onchange="setExField('${dk}','${exo.id}','repMax',Number(this.value)||1)"></label>
      <label>Шаг прогрессии<input type="number" inputmode="decimal" step="0.5" min="0" value="${exo.inc}" onchange="setExField('${dk}','${exo.id}','inc',Number(this.value)||0)"></label>
      <label>Отдых<input type="text" value="${escHtml(exo.rest)}" onchange="setExField('${dk}','${exo.id}','rest',this.value)"></label>
    </div>
  </div>`;
}

function setProgEditorDay(dk){ progEditorDay = dk; render(); }

function setDayField(dk, field, val){
  state.program[dk][field] = val;
  saveState();
  render();
}

function setExField(dk, exId, field, val){
  const exo = state.program[dk].exercises.find(e=>e.id===exId);
  if(!exo) return;
  exo[field] = val;
  saveState();
  render();
}

function moveExercise(dk, exId, dir){
  const arr = state.program[dk].exercises;
  const idx = arr.findIndex(e=>e.id===exId);
  const newIdx = idx+dir;
  if(newIdx<0 || newIdx>=arr.length) return;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  saveState();
  render();
}

function deleteExercise(dk, exId){
  if(!confirm('Удалить упражнение из программы? История тренировок по нему сохранится, но прогрессия по нему перестанет считаться.')) return;
  state.program[dk].exercises = state.program[dk].exercises.filter(e=>e.id!==exId);
  saveState();
  render();
}

function genExerciseId(dk){
  const existing = new Set(state.program[dk].exercises.map(e=>e.id));
  let n = state.program[dk].exercises.length+1;
  while(existing.has(dk+n)) n++;
  return dk+n;
}

function addExercise(dk){
  const id = genExerciseId(dk);
  state.program[dk].exercises.push(ex(id, 'Новое упражнение', 'w', 3, 8, 12, 2.5, '90 сек'));
  saveState();
  render();
}

function resetProgram(){
  if(!confirm('Восстановить программу по умолчанию? Твои изменения упражнений (названия, диапазоны, шаг прогрессии) будут потеряны. История тренировок останется.')) return;
  state.program = cloneProgram(DEFAULT_PROGRAM);
  saveState();
  render();
}

/* ---- settings: misc ---- */
function setDeloadWeeks(v){ state.deloadWeeks = Number(v)||7; saveState(); }
function setSchedule(wd,val){ state.scheduleMap[wd]=val; saveState(); }
function applyTheme(){
  if(state.theme && state.theme!=='auto') document.documentElement.setAttribute('data-theme', state.theme);
  else document.documentElement.removeAttribute('data-theme');
}
function setTheme(v){
  state.theme = v;
  applyTheme();
  saveState();
}
function resetAll(){
  const extra = Sync.enabled() ? ' Синхронизация включена — данные на сервере тоже будут очищены.' : '';
  if(!confirm('Удалить всю историю тренировок и настройки? Это необратимо.'+extra)) return;
  state = defaultState();
  drafts = {};
  saveDrafts();
  saveState();
  applyTheme();
  render();
}

/* ---- data export / import ---- */
function exportData(data, filename){
  const blob = new Blob([JSON.stringify(data || state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `trener-backup-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function triggerImport(){
  document.getElementById('import-file').click();
}

function importData(input){
  const file = input.files && input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result);
      if(!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.sessions)){
        alert('Файл не похож на бэкап трекера — не найдено поле sessions.');
        return;
      }
      if(!confirm('Импорт заменит текущие данные (историю, программу, настройки) содержимым файла. Продолжить?')) return;
      state = normalizeState(parsed);
      delete drafts.edit;
      saveDrafts();
      saveState();
      applyTheme();
      render();
    }catch(e){
      alert('Не удалось прочитать файл: похоже, это не валидный JSON.');
    }
  };
  reader.readAsText(file);
  input.value = '';
}

/* ================= INIT ================= */
document.getElementById('nav').addEventListener('click', e=>{
  const b = e.target.closest('button[data-tab]');
  if(!b) return;
  setTab(b.dataset.tab);
});
app.addEventListener('input', e=>{
  const t = e.target;
  if(!(t instanceof HTMLInputElement)) return;
  if(t.dataset.mode==='today') scheduleAutosave();
  else if(t.dataset.mode==='edit') updateEditFromInput(t);
  else if(t.dataset.draft) setFormVal(t.dataset.draft, t.value);
});
window.addEventListener('pagehide', flushAutosave);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') flushAutosave(); });
Sync.onStatus = ()=>{
  const el = document.getElementById('sync-status');
  if(el) el.textContent = Sync.statusText();
};
applyTheme();
render();
Sync.init();
