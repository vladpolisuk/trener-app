/* Синхронизация состояния с сервером (/api/state). Локальные данные остаются источником правды:
   приложение работает и без сети, а изменения уходят на сервер в фоне. */
const Sync = (() => {
  const TOKEN_KEY = 'fb_sync_token';
  const META_KEY = 'fb_sync_meta';
  const BACKUP_KEY = 'fb_tracker_v1_conflict_backup';
  const API = '/api/state';

  let meta = readJSON(META_KEY) || {lastSynced: null}; // updatedAt, с которым локальные данные и сервер совпадали в последний раз
  let status = {kind: 'off', text: '', at: null};
  let busy = false, again = false, stopped = false, pushTimer = null, retryTimer = null;

  function readJSON(key){ try{ return JSON.parse(localStorage.getItem(key)); }catch(e){ return null; } }
  function token(){ try{ return localStorage.getItem(TOKEN_KEY) || ''; }catch(e){ return ''; } }
  function enabled(){ return !!token(); }
  function saveMeta(){ try{ localStorage.setItem(META_KEY, JSON.stringify(meta)); }catch(e){} }

  function setStatus(kind, text){
    status = {kind, text: text || '', at: Date.now()};
    if(sync.onStatus) sync.onStatus();
  }
  function hhmm(ts){
    return new Date(ts).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
  }
  function statusText(){
    if(status.kind === 'ok') return 'Синхронизировано в ' + hhmm(status.at);
    if(status.kind === 'sync') return 'Синхронизация…';
    if(status.kind === 'error') return status.text;
    return enabled() ? 'Подключено' : 'Не подключено';
  }

  async function call(method, body){
    const opts = {method, headers: {'Authorization': 'Bearer ' + token()}};
    if(body){
      opts.headers['Content-Type'] = 'application/json';
      opts.body = body;
      if(body.length < 60000) opts.keepalive = true;
    }
    const r = await fetch(API, opts);
    let data = null;
    try{ data = await r.json(); }catch(e){}
    return {status: r.status, data};
  }

  function fail(code){
    if(code === 401 || code === 503 || code === 404){
      stopped = true;
      const msg = code === 401 ? 'Неверный ключ синхронизации'
        : code === 503 ? 'Сервер не настроен (нужны SYNC_TOKEN и база Redis)'
        : 'API недоступен (нужен деплой на Vercel)';
      setStatus('error', msg);
    } else {
      netFail('Ошибка сервера (' + code + ') — попробую позже');
    }
  }
  function netFail(text){
    setStatus('error', text || 'Нет связи — данные сохранены на устройстве, отправлю позже');
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => syncNow(), 20000);
  }

  function saveBackup(s, which){
    try{ localStorage.setItem(BACKUP_KEY, JSON.stringify({savedAt: Date.now(), which, state: s})); }catch(e){}
  }
  function hasBackup(){ try{ return !!localStorage.getItem(BACKUP_KEY); }catch(e){ return false; } }
  function downloadBackup(){
    const b = readJSON(BACKUP_KEY);
    if(!b) return;
    const d = new Date(b.savedAt).toISOString().slice(0, 10);
    exportData(b.state, `trener-conflict-backup-${d}.json`);
  }

  function adopt(remote){
    state = normalizeState(remote);
    saveState({silent: true});
    meta.lastSynced = remote.updatedAt;
    saveMeta();
    applyTheme();
    render();
    setStatus('ok');
  }

  async function push(force){
    const sentAt = state.updatedAt;
    const payload = JSON.stringify({state, baseUpdatedAt: meta.lastSynced, force: !!force});
    const p = await call('PUT', payload);
    if(p.status === 200){
      meta.lastSynced = sentAt;
      saveMeta();
      setStatus('ok');
    } else if(p.status === 409){
      await conflict(p.data && p.data.state);
    } else {
      fail(p.status);
    }
  }

  async function conflict(remote){
    if(!remote){ await push(true); return; }
    const info = s => (s.sessions || []).length + ' тренировок, изменено ' + new Date(s.updatedAt).toLocaleString('ru-RU');
    const takeRemote = confirm(
      'Данные на сервере и на этом устройстве изменились независимо.\n\n' +
      'Сервер: ' + info(remote) + '\nЭто устройство: ' + info(state) + '\n\n' +
      'ОК — взять данные с сервера (версия этого устройства сохранится в копию).\n' +
      'Отмена — перезаписать сервер данными этого устройства (серверная версия сохранится в копию).');
    if(takeRemote){
      saveBackup(state, 'local');
      adopt(remote);
    } else {
      saveBackup(remote, 'remote');
      await push(true);
    }
  }

  async function reconcile(remote){
    const last = meta.lastSynced;
    const local = state.updatedAt || 0;
    if(!remote){
      if(local > 0) await push(true); else setStatus('ok');
      return;
    }
    if(remote.updatedAt === local){
      meta.lastSynced = local;
      saveMeta();
      setStatus('ok');
      return;
    }
    const localChanged = local > (last || 0);
    const remoteChanged = remote.updatedAt !== last;
    if(!localChanged){
      if(remoteChanged) adopt(remote); else setStatus('ok');
    } else if(!remoteChanged){
      await push(false);
    } else {
      await conflict(remote);
    }
  }

  async function syncNow(manual){
    if(!enabled()) return;
    if(manual === true) stopped = false;
    if(stopped) return;
    if(busy){ again = true; return; }
    busy = true;
    clearTimeout(pushTimer);
    clearTimeout(retryTimer);
    setStatus('sync');
    try{
      const g = await call('GET');
      if(g.status !== 200) fail(g.status);
      else await reconcile(g.data && g.data.state);
    }catch(e){
      netFail();
    }finally{
      busy = false;
      if(again){ again = false; schedulePush(); }
    }
  }

  async function pushNow(){
    if(!enabled() || stopped) return;
    if(busy){ again = true; return; }
    if((state.updatedAt || 0) <= (meta.lastSynced || 0)) return;
    busy = true;
    setStatus('sync');
    try{
      await push(false);
    }catch(e){
      netFail();
    }finally{
      busy = false;
      if(again){ again = false; schedulePush(); }
    }
  }

  function schedulePush(){
    if(!enabled() || stopped) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, 1500);
  }

  async function connect(t){
    try{ localStorage.setItem(TOKEN_KEY, t); }catch(e){ return; }
    meta = {lastSynced: null};
    saveMeta();
    stopped = false;
    await syncNow(true);
    if(stopped){
      const msg = status.text;
      try{ localStorage.removeItem(TOKEN_KEY); }catch(e){}
      stopped = false;
      setStatus('error', msg);
    }
  }

  function disconnect(){
    try{ localStorage.removeItem(TOKEN_KEY); }catch(e){}
    meta = {lastSynced: null};
    saveMeta();
    clearTimeout(pushTimer);
    clearTimeout(retryTimer);
    stopped = false;
    setStatus('off');
  }

  function init(){
    document.addEventListener('visibilitychange', () => {
      if(document.visibilityState === 'visible') syncNow();
      else if(pushTimer){ clearTimeout(pushTimer); pushNow(); }
    });
    window.addEventListener('online', () => syncNow());
    syncNow();
  }

  const sync = {enabled, connect, disconnect, syncNow, schedulePush, statusText, hasBackup, downloadBackup, init, onStatus: null};
  return sync;
})();
