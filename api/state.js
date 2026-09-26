// Vercel Serverless Function: хранит единственный JSON с состоянием трекера в Upstash Redis.
// Env: SYNC_TOKEN (ключ доступа) + KV_REST_API_URL/KV_REST_API_TOKEN (или UPSTASH_REDIS_REST_URL/TOKEN).
const crypto = require('crypto');

const KEY = 'trener:state';
const MAX_BYTES = 3 * 1024 * 1024;

function redisConfig(){
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? {url, token} : null;
}

async function redis(cfg, command){
  const r = await fetch(cfg.url, {
    method: 'POST',
    headers: {Authorization: 'Bearer ' + cfg.token, 'Content-Type': 'application/json'},
    body: JSON.stringify(command)
  });
  const data = await r.json();
  if(!r.ok || data.error) throw new Error(data.error || 'redis http ' + r.status);
  return data.result;
}

function authorized(req){
  const header = req.headers['authorization'] || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  const hash = s => crypto.createHash('sha256').update(s).digest();
  return crypto.timingSafeEqual(hash(provided), hash(process.env.SYNC_TOKEN));
}

function readBody(req){
  const b = req.body;
  if(typeof b === 'string') return JSON.parse(b);
  return b;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const cfg = redisConfig();
  if(!process.env.SYNC_TOKEN || !cfg) return res.status(503).json({error: 'not_configured'});
  if(!authorized(req)) return res.status(401).json({error: 'unauthorized'});

  try{
    if(req.method === 'GET'){
      const raw = await redis(cfg, ['GET', KEY]);
      return res.status(200).json({state: raw ? JSON.parse(raw) : null});
    }

    if(req.method === 'PUT'){
      const body = readBody(req) || {};
      const state = body.state;
      if(!state || typeof state !== 'object' || !Array.isArray(state.sessions) || typeof state.updatedAt !== 'number'){
        return res.status(400).json({error: 'bad_state'});
      }
      const serialized = JSON.stringify(state);
      if(serialized.length > MAX_BYTES) return res.status(413).json({error: 'too_large'});

      // Оптимистичная блокировка: пишем, только если сервер всё ещё на той версии, от которой отталкивался клиент.
      // Проверка и запись не атомарны — для одного пользователя окно гонки пренебрежимо.
      if(!body.force){
        const raw = await redis(cfg, ['GET', KEY]);
        const current = raw ? JSON.parse(raw) : null;
        const currentVersion = current ? current.updatedAt : null;
        const base = typeof body.baseUpdatedAt === 'number' ? body.baseUpdatedAt : null;
        if(currentVersion !== base) return res.status(409).json({error: 'conflict', state: current});
      }
      await redis(cfg, ['SET', KEY, serialized]);
      return res.status(200).json({ok: true, updatedAt: state.updatedAt});
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({error: 'method_not_allowed'});
  }catch(e){
    return res.status(502).json({error: 'storage_error'});
  }
};
