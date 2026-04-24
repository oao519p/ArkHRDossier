// api.js — API 簽名與呼叫

const DOMAINS = {
  skport: 'https://zonai.skport.com',
  skland: 'https://zonai.skland.com',
}
let currentPlatform = 'skport'

export function setPlatform(p) {
  if (DOMAINS[p]) currentPlatform = p
}

function getDomain() { return DOMAINS[currentPlatform] }

const BINDING_API     = '/api/v1/game/player/binding'
const PLAYER_INFO_API = '/api/v1/game/player/info'

export function parseCredInput(input) {
  const clean = input.trim()
  const idx   = clean.indexOf(',')
  if (idx === -1) throw new Error('找不到逗號分隔符')
  let cred  = clean.substring(0, idx).trim().replace(/^["']|["']$/g, '')
  let token = clean.substring(idx + 1).trim().replace(/^["']|["']$/g, '')
  // localStorage 有時會把值存成 JSON 字串，需要再解一層
  try { cred  = JSON.parse(cred)  } catch {}
  try { token = JSON.parse(token) } catch {}
  if (!cred || !token) throw new Error('cred 或 token 為空')
  return { cred, token }
}

function getSign(path, params, token) {
  const timestamp = Math.floor((Date.now() - 300) / 1000).toString()
  const headerObj = { platform: '3', timestamp, dId: '', vName: '1.0.0' }
  const signStr   = path + (params || '') + timestamp + JSON.stringify(headerObj)
  const sign      = CryptoJS.MD5(CryptoJS.HmacSHA256(signStr, token).toString()).toString()
  return { timestamp, sign }
}

function buildHeaders(path, params, cred, token) {
  const { timestamp, sign } = getSign(path, params, token)
  return {
    'cred':        cred,
    'platform':    '3',
    'timestamp':   timestamp,
    'dId':         '',
    'vname':       '1.0.0',
    'sign':        sign,
    'sk-language': 'zh_Hant',
  }
}

export async function apiFetch(path, params, cred, token) {
  const headers = buildHeaders(path, params, cred, token)
  const url     = `${getDomain()}${path}${params ? '?' + params : ''}`
  const res     = await fetch(url, { headers })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (json.code !== 0) throw new Error(`API code=${json.code}: ${json.message}`)
  return json.data
}

export async function fetchBinding(cred, token) {
  const data   = await apiFetch(BINDING_API, '', cred, token)
  const list   = data.list || []
  for (const item of list) {
    if (item.appCode === 'arknights') return item.bindingList || []
  }
  return []
}

export async function fetchPlayerInfo(uid, cred, token) {
  return apiFetch(PLAYER_INFO_API, `uid=${uid}`, cred, token)
}
