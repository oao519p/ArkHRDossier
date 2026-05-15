// cards.js — 幹員卡片渲染

// ── 常數 ──
const SKILL_NONE     = './image/skill_icon_none.png'
const SKILL_FALLBACK = './image/skchr_svrash_1.png'

const LOCAL_SKILLS = new Set([
  'skchr_svrash_1',
  'skchr_huang_1',
  'skchr_lessng_1',
  'skchr_savage_1',
  'skchr_midn_1',
  'skchr_doberm_1',
  'skchr_bryota_1',
  'skchr_jesica_1',
  'skchr_vigna_1',
  'skchr_caper_1',
  'skchr_luton_1',
  'skchr_stward_1',
  'skchr_catap_1',
  'skchr_snhunt_1',
])

const PROF_LABELS = {
  PIONEER: '先鋒', WARRIOR: '近衛', TANK: '重裝',
  SNIPER: '狙擊', CASTER: '術師', MEDIC: '醫療',
  SUPPORT: '輔助', SPECIAL: '特種',
}
const RARITY_LABELS = { 5:'★6', 4:'★5', 3:'★4', 2:'★3', 1:'★2', 0:'★1' }
const PROF_ORDER = ['PIONEER','WARRIOR','TANK','SNIPER','CASTER','MEDIC','SUPPORT','SPECIAL']

const SORT_LABELS = {
  default: ['獲取時間 ↓', '獲取時間 ↑'],
  elite:   ['等級 ↓','等級 ↑'],
  rarity:  ['稀有度 ↓', '稀有度 ↑'],
  prof:    ['職業 ↓', '職業 ↑'],
}

// ── 狀態 ──
let gData          = null
let skillMode      = 'default'
let equipMode      = 'default'
let viewMode       = 'card'
let sortMode       = 'default'
let sortDesc       = false
let searchQuery    = ''
let nameInline     = false
let exportPaused   = false
let exportCancelled = false
let statsRarity    = 'all'
const visFlags = {
  'rarity-bar':  true,
  'elite':       true,
  'level':       true,
  'skill-badge': true,
  'rarity-icon': true,
  'potential':   true,
}

// ── URL helpers ──
function skinIdToUrl(skinId) {
  if (!skinId) return ''
  let converted
  if (skinId.includes('@')) {
    converted = skinId.replace('@', '_').replace(/#/g, '%23')
  } else {
    converted = skinId.replace(/#/g, '_')
  }
  return `https://torappu.prts.wiki/assets/char_portrait/${converted}.png`
}

function avatarIdToUrl(skinId) {
  if (!skinId) return ''
  let converted
  if (skinId.includes('@')) {
    // 換裝皮膚：@ → _，# 後面的編號待確認，暫時保留 %23 規則
    converted = skinId.replace('@', '_').replace(/#/g, '%23')
  } else {
    // 預設皮膚：直接去掉 #數字（char_avatar 不含編號）
    converted = skinId.replace(/#\d+$/, '')
  }
  return `https://torappu.prts.wiki/assets/char_avatar/${converted}.png`
}

// 取出已解鎖模組：排除 uniequip_001_* 且 locked === false，依 id 排序
function getUnlockedEquips(char) {
  if (!char.equip || !Array.isArray(char.equip)) return []
  return char.equip
    .filter(e => !e.id.startsWith('uniequip_001_') && e.locked === false)
    .sort((a, b) => a.id < b.id ? -1 : 1)
}

const rarityIconUrl      = r => `./image/rarity_icon/rarity_${r}.png`
const rarityIconUrlLight = r => `./image/rarity_icon/rarity_${r}_black.png`
const profIconUrl        = p => `./image/profession_large_icon/icon_profession_${p.toLowerCase()}_large.png`
const profIconUrlLight   = p => `./image/profession_large_icon/icon_profession_${p.toLowerCase()}_large_white.png`
const eliteIconUrl  = e  => `./image/elite_icon/elite_${e}_large.png`
const potentialUrl  = r  => `./image/potential_icon/potential_${r}.png`
const skillIconUrl  = id => {
  if (!id) return SKILL_NONE
  if (LOCAL_SKILLS.has(id)) return `./image/${id}.png`
  return `https://torappu.prts.wiki/assets/skill_icon/skill_icon_${id}.png`
}
const specIconUrl   = lv => `./image/specialized_icon/specialized_tiny_${lv}.png`
const equipIconUrl  = t  => t ? `https://torappu.prts.wiki/assets/uniequip_direction/${t}.png` : ''

// ── mkImg ──
function mkImg(src, cls, skillId, lazy) {
  const img = document.createElement('img')
  img.src = src
  if (cls) img.className = cls
  if (lazy) img.loading = 'lazy'
  img.onerror = () => {
    img.onerror = null
    if (skillId && LOCAL_SKILLS.has(skillId)) {
      img.src = SKILL_FALLBACK
    } else {
      img.style.opacity = '0'
    }
  }
  return img
}

// ── helpers ──
function getChecked(groupId) {
  return [...document.querySelectorAll(`#${groupId} input[type=checkbox]:checked`)]
    .map(cb => cb.value)
}

// ── buildFilters ──
function buildFilters(data) {
  const chars       = data.chars       || []
  const charInfoMap = data.charInfoMap || {}

  const profs    = new Set()
  const rarities = new Set()
  chars.forEach(c => {
    const info = charInfoMap[c.charId] || {}
    if (info.profession) profs.add(info.profession)
    rarities.add(info.rarity ?? c.rarity ?? 0)
  })

  const profFilter = document.getElementById('prof-filter')
  profFilter.innerHTML = ''
  Object.keys(PROF_LABELS).forEach(p => {
    if (!profs.has(p)) return
    const lbl = document.createElement('label')
    const cb  = document.createElement('input')
    cb.type = 'checkbox'; cb.value = p; cb.checked = true
    cb.addEventListener('change', rerender)
    lbl.appendChild(cb)
    lbl.appendChild(document.createTextNode(PROF_LABELS[p]))
    profFilter.appendChild(lbl)
  })

  const rarityFilter = document.getElementById('rarity-filter')
  rarityFilter.innerHTML = ''
  ;[5,4,3,2,1,0].forEach(r => {
    if (!rarities.has(r)) return
    const lbl = document.createElement('label')
    const cb  = document.createElement('input')
    cb.type = 'checkbox'; cb.value = String(r); cb.checked = (r === 5)  // 預設只勾選六星
    cb.addEventListener('change', rerender)
    lbl.appendChild(cb)
    lbl.appendChild(document.createTextNode(RARITY_LABELS[r]))
    rarityFilter.appendChild(lbl)
  })

  document.getElementById('viewer-controls').style.display = 'flex'
}

// ── rerender ──
function rerender() {
  if (!gData) return
  const allowedProfs    = new Set(getChecked('prof-filter'))
  const allowedRarities = new Set(getChecked('rarity-filter').map(Number))
  if (viewMode === 'table') {
    renderTable(gData, allowedProfs, allowedRarities, searchQuery, sortMode, sortDesc)
  } else {
    renderGrid(gData, allowedProfs, allowedRarities, searchQuery, sortMode)
  }
}

// ── renderGrid ──
function renderGrid(data, allowedProfs, allowedRarities, searchQuery, sortMode) {
  const out = document.getElementById('card-output')
  out.innerHTML = ''

  const chars        = data.chars        || []
  const charInfoMap  = data.charInfoMap  || {}
  const equipInfoMap = data.equipmentInfoMap || data.equipInfoMap || {}
  if (!data.equipmentInfoMap && !data.equipInfoMap) console.warn('[cards] equipInfoMap 不存在，模組圖示將無法顯示')

  const q = (searchQuery || '').trim().toLowerCase()
  let filtered = chars.filter(c => {
    const info   = charInfoMap[c.charId] || {}
    const rarity = info.rarity ?? c.rarity ?? 0
    const prof   = info.profession || 'PIONEER'
    if (!allowedProfs.has(prof))      return false
    if (!allowedRarities.has(rarity)) return false
    if (q) {
      const name = (info.name || c.charId).toLowerCase()
      if (!name.includes(q)) return false
    }
    return true
  })

  const d = sortDesc ? -1 : 1
  const origIndex = new Map(chars.map((c, i) => [c.charId + c.skinId, i]))
  filtered.sort((a, b) => {
    const ia = charInfoMap[a.charId] || {}
    const ib = charInfoMap[b.charId] || {}
    if (sortMode === 'default') {
      return ((origIndex.get(a.charId + a.skinId) ?? 0) - (origIndex.get(b.charId + b.skinId) ?? 0)) * d
    }
    if (sortMode === 'rarity') {
      return ((ib.rarity ?? b.rarity ?? 0) - (ia.rarity ?? a.rarity ?? 0)) * d
    }
    if (sortMode === 'prof') {
      const pa = PROF_ORDER.indexOf(ia.profession || 'PIONEER')
      const pb = PROF_ORDER.indexOf(ib.profession || 'PIONEER')
      if (pa !== pb) return (pa - pb) * d
      if (b.evolvePhase !== a.evolvePhase) return b.evolvePhase - a.evolvePhase
      return b.level - a.level
    }
    if (b.evolvePhase !== a.evolvePhase) return (b.evolvePhase - a.evolvePhase) * d
    return (b.level - a.level) * d
  })

  const grid = document.createElement('div')
  grid.className = 'grid'

  let shown = 0
  filtered.forEach(c => {
    const info   = charInfoMap[c.charId] || {}
    const rarity = info.rarity ?? c.rarity ?? 0
    const prof   = info.profession || 'PIONEER'
    shown++

    const defaultSkillId  = c.defaultSkillId || ''
    const defaultEquipId  = c.defaultEquipId || ''
    const equipInfo       = equipInfoMap[defaultEquipId] || {}
    const typeIcon        = equipInfo.typeIcon || ''
    const unlockedEquips  = getUnlockedEquips(c)

    const mainSkillLvl = c.mainSkillLvl || 0
    let specLevel = 0
    if (mainSkillLvl === 7 && c.skills && defaultSkillId) {
      const sk = c.skills.find(s => s.id === defaultSkillId)
      if (sk) specLevel = sk.specializeLevel || 0
    }

    const wrap = document.createElement('div')
    wrap.className = 'op-wrap'

    const card = document.createElement('div')
    card.className = 'op-card'

    card.appendChild(mkImg(skinIdToUrl(c.skinId), 'portrait', null, true))

    if (visFlags['rarity-bar']) {
      const bar = document.createElement('div')
      bar.className = `rarity-bar rarity-${rarity + 1}`
      card.appendChild(bar)
    }

    const leftCol = document.createElement('div')
    leftCol.className = 'left-col'
    leftCol.appendChild(mkImg(profIconUrl(prof), 'prof-icon'))
    if (visFlags['elite'] || visFlags['level']) {
      const eliteLvl = document.createElement('div')
      eliteLvl.className = 'elite-lvl'
      if (visFlags['elite']) eliteLvl.appendChild(mkImg(eliteIconUrl(c.evolvePhase), 'elite-icon'))
      if (visFlags['level']) {
        const lvTxt = document.createElement('span')
        lvTxt.className = 'level-text'
        lvTxt.textContent = c.level
        eliteLvl.appendChild(lvTxt)
      }
      leftCol.appendChild(eliteLvl)
    }
    card.appendChild(leftCol)

    if (visFlags['rarity-icon']) {
      const topRight = document.createElement('div')
      topRight.className = 'top-right'
      topRight.appendChild(mkImg(rarityIconUrl(rarity), 'rarity-icon'))
      card.appendChild(topRight)
    }

    const mask = document.createElement('div')
    mask.className = 'bottom-mask'
    card.appendChild(mask)

    // ── 技能 & 模組 ──
    const skillRow = document.createElement('div')
    skillRow.className = 'skill-row'

    // 建立單一模組 wrap（inline 用，不含 overlay 定位）
    function mkEquipWrapById(equipId) {
      const ei = equipInfoMap[equipId] || {}
      const ti = ei.typeIcon || ''
      if (!ti) return null
      const ew = document.createElement('div')
      ew.className = `equip-wrap${ti === 'original' ? ' equip-original' : ''}`
      ew.style.backgroundImage = `url('${equipIconUrl(ti)}')`
      ew.style.backgroundSize = ti === 'original' ? '24px 31px' : '130%'
      const equipObj = (c.equip || []).find(e => e.id === equipId)
      if (equipObj && equipObj.level) {
        const lvBadge = document.createElement('div')
        lvBadge.className = 'equip-level-badge'
        lvBadge.textContent = equipObj.level
        ew.appendChild(lvBadge)
      }
      return ew
    }

    // 建立 overlay 容器（橫排，絕對定位在 skill-wrap 上方）
    function mkOverlayRow(equipIds) {
      if (!equipIds.length) return null
      const row = document.createElement('div')
      row.className = 'equip-overlay-row'
      equipIds.forEach(id => {
        const ew = mkEquipWrapById(id)
        if (ew) row.appendChild(ew)
      })
      return row.children.length ? row : null
    }

    // ── 技能 & 模組排版邏輯 ──
    //
    // 技能關閉：模組全部 inline 靠左往右排
    // 技能預設 + 模組預設：[技能][模組] inline，最多 2 格
    // 技能預設 + 模組全部：inline 最多 [技能][模組1][模組2]（共 3 格），
    //                      超出的模組 overlay 在技能上方往右長
    // 技能全部 + 模組預設：預設模組 overlay 在第一個技能上方
    // 技能全部 + 模組全部：全部模組 overlay 在第一個技能上方

    // 取得要 overlay 的模組清單
    function getOverlayEquips() {
      if (skillMode === 'none' || equipMode === 'none') return []
      if (skillMode === 'all') {
        // 全部技能：不管模組 default/all，都 overlay
        if (equipMode === 'default') {
          const isUnlocked = unlockedEquips.some(e => e.id === defaultEquipId)
          return isUnlocked ? [{ id: defaultEquipId }] : []
        }
        return unlockedEquips
      }
      // 預設技能 + 全部模組：超過 2 個 inline 格（1技能+2模組=3格）的模組 overlay
      if (skillMode === 'default' && equipMode === 'all') {
        return unlockedEquips.slice(2) // 前 2 個 inline，其餘 overlay
      }
      return []
    }

    // 取得要 inline 的模組清單
    function getInlineEquips() {
      if (equipMode === 'none') return []
      if (skillMode === 'none') {
        // 技能關閉：全部模組 inline
        return equipMode === 'default'
          ? (unlockedEquips.some(e => e.id === defaultEquipId) ? [{ id: defaultEquipId }] : [])
          : unlockedEquips
      }
      if (skillMode === 'all') return [] // 全部技能時模組走 overlay
      // 預設技能
      if (equipMode === 'default') {
        const isUnlocked = unlockedEquips.some(e => e.id === defaultEquipId)
        return isUnlocked ? [{ id: defaultEquipId }] : []
      }
      // 預設技能 + 全部模組：前 2 個 inline
      return unlockedEquips.slice(0, 2)
    }

    const overlayEquips = getOverlayEquips()
    const inlineEquips  = getInlineEquips()

    // ── 技能渲染 ──
    if (skillMode !== 'none') {
      if (skillMode === 'default') {
        const sw = document.createElement('div')
        sw.className = 'skill-wrap'
        sw.appendChild(mkImg(skillIconUrl(defaultSkillId), 'skill-icon', defaultSkillId || null))
        if (defaultSkillId && visFlags['skill-badge']) {
          if (specLevel >= 1) {
            sw.appendChild(mkImg(specIconUrl(specLevel), 'skill-badge'))
          } else {
            const badge = document.createElement('div')
            badge.className = 'skill-badge-txt'
            badge.textContent = mainSkillLvl || ''
            sw.appendChild(badge)
          }
        }
        // overlay 容器掛在此技能上
        const oRow = mkOverlayRow(overlayEquips.map(e => e.id))
        if (oRow) sw.appendChild(oRow)
        skillRow.appendChild(sw)
      } else {
        // all 技能
        const skills = (c.skills && c.skills.length) ? c.skills : []
        skills.forEach((sk, idx) => {
          const sw = document.createElement('div')
          sw.className = 'skill-wrap'
          sw.appendChild(mkImg(skillIconUrl(sk.id), 'skill-icon', sk.id))
          const skSpec = sk.specializeLevel || 0
          if (visFlags['skill-badge']) {
            if (skSpec >= 1) {
              sw.appendChild(mkImg(specIconUrl(skSpec), 'skill-badge'))
            } else {
              const badge = document.createElement('div')
              badge.className = 'skill-badge-txt'
              badge.textContent = mainSkillLvl || ''
              sw.appendChild(badge)
            }
          }
          // overlay 容器掛在第一個技能上
          if (idx === 0) {
            const oRow = mkOverlayRow(overlayEquips.map(e => e.id))
            if (oRow) sw.appendChild(oRow)
          }
          skillRow.appendChild(sw)
        })
        if (!skills.length) {
          const sw = document.createElement('div')
          sw.className = 'skill-wrap'
          sw.appendChild(mkImg(SKILL_NONE, 'skill-icon'))
          const oRow = mkOverlayRow(overlayEquips.map(e => e.id))
          if (oRow) sw.appendChild(oRow)
          skillRow.appendChild(sw)
        }
      }
    }

    // ── 模組 inline 渲染 ──
    inlineEquips.forEach(eq => {
      const ew = mkEquipWrapById(eq.id)
      if (ew) skillRow.appendChild(ew)
    })

    // skill-row 有內容才加入卡片
    if (skillRow.children.length > 0) card.appendChild(skillRow)

    if (nameInline) {
      const inName = document.createElement('div')
      inName.className = 'inline-name'
      inName.textContent = info.name || c.charId
      card.appendChild(inName)
    }

    if (visFlags['potential']) {
      const br = document.createElement('div')
      br.className = 'bottom-right'
      br.appendChild(mkImg(potentialUrl(c.potentialRank), 'potential-icon'))
      card.appendChild(br)
    }

    wrap.appendChild(card)

    const nameEl = document.createElement('div')
    nameEl.className = nameInline ? 'op-name hidden' : 'op-name'
    nameEl.textContent = info.name || c.charId
    wrap.appendChild(nameEl)

    grid.appendChild(wrap)
  })

  out.appendChild(grid)
  document.getElementById('count-label').textContent = `顯示 ${shown} / ${chars.length} 位幹員`
}

// ── 圖片轉 base64（供 export HTML 用）──
async function imgToBase64(url) {
  try {
    const res  = await fetch(url)
    const blob = await res.blob()
    return await new Promise(r => {
      const reader = new FileReader()
      reader.onload = e => r(e.target.result)
      reader.readAsDataURL(blob)
    })
  } catch { return url }
}

async function inlineLocalOnly(html) {
  const srcMatches = [...html.matchAll(/src="(\.\/image\/[^"]+)"/g)]
  const bgMatches  = [...html.matchAll(/url\('(\.\/image\/[^']+)'\)/g)]
  const allUrls = [...new Set([...srcMatches.map(m => m[1]), ...bgMatches.map(m => m[1])])]
  const cache = {}
  for (const url of allUrls) {
    if (!cache[url]) cache[url] = await imgToBase64(url)
  }
  for (const [, src] of srcMatches) {
    if (cache[src]) html = html.replaceAll(`src="${src}"`, `src="${cache[src]}"`)
  }
  for (const [, src] of bgMatches) {
    if (cache[src]) html = html.replaceAll(`url('${src}')`, `url('${cache[src]}')`)
  }
  return html
}

async function inlineAllImages(html, onProgress) {
  // 收集所有需要 inline 的 src（本地 + 外連）
  const srcMatches = [...html.matchAll(/src="((?:\.\/image\/|https:\/\/torappu\.prts\.wiki\/)[^"]+)"/g)]
  const bgMatches  = [...html.matchAll(/url\('((?:\.\/image\/|https:\/\/torappu\.prts\.wiki\/)[^']+)'\)/g)]

  // 去重
  const allUrls = [...new Set([
    ...srcMatches.map(m => m[1]),
    ...bgMatches.map(m => m[1]),
  ])]

  const total = allUrls.length
  const cache = {}
  for (let i = 0; i < allUrls.length; i++) {
    const url = allUrls[i]
    if (!cache[url]) cache[url] = await imgToBase64(url)
    if (onProgress) onProgress(i + 1, total, url)
  }

  // 替換 src
  for (const [, src] of srcMatches) {
    if (cache[src]) html = html.replaceAll(`src="${src}"`, `src="${cache[src]}"`)
  }
  // 替換 background-image
  for (const [, src] of bgMatches) {
    if (cache[src]) html = html.replaceAll(`url('${src}')`, `url('${cache[src]}')`)
  }

  // 移除 loading="lazy"
  html = html.replace(/ loading="lazy"/g, '')

  return html
}

// ── showPlayerInfo ──
function showPlayerInfo(data) {
  const meta   = data._meta  || {}
  const status = data.status || {}
  document.getElementById('pi-uid').textContent     = meta.uid        || status.uid   || '—'
  document.getElementById('pi-name').textContent    = meta.nickName   || status.name  || '—'
  document.getElementById('pi-channel').textContent = meta.channelName || '—'
  document.getElementById('pi-level').textContent   = status.level    || '—'
  document.getElementById('player-info-bar').style.display = 'flex'
  document.getElementById('stats-bar').style.display = 'block'
}

function getPlayerUid() {
  return gData?._meta?.uid || gData?.status?.uid || 'unknown'
}

// ── 排序按鈕文字同步 ──
function updateSortBtns() {
  document.querySelectorAll('[data-sort]').forEach(b => {
    const isActive = b.dataset.sort === sortMode
    b.classList.toggle('active', isActive)
    b.textContent = SORT_LABELS[b.dataset.sort][isActive && !sortDesc ? 1 : 0]
  })
}

// ── 事件綁定 ──
function bindEvents() {
  // 顯示開關
  document.querySelectorAll('[data-vis]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.vis
      visFlags[key] = !visFlags[key]
      btn.classList.toggle('active', visFlags[key])
      rerender()
    })
  })

  // 搜尋
  document.getElementById('search-input').addEventListener('input', e => {
    searchQuery = e.target.value
    rerender()
  })
  document.getElementById('search-clear').addEventListener('click', () => {
    searchQuery = ''
    document.getElementById('search-input').value = ''
    rerender()
  })

  // 排序
  document.querySelectorAll('[data-sort]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.sort === sortMode) {
        sortDesc = !sortDesc
      } else {
        sortMode = btn.dataset.sort
        sortDesc = false
      }
      updateSortBtns()
      rerender()
    })
  })

  // 職業全選/取消
  document.getElementById('prof-all').addEventListener('click', () => {
    document.querySelectorAll('#prof-filter input').forEach(cb => cb.checked = true)
    rerender()
  })
  document.getElementById('prof-none').addEventListener('click', () => {
    document.querySelectorAll('#prof-filter input').forEach(cb => cb.checked = false)
    rerender()
  })

  // 稀有度全選/取消
  document.getElementById('rarity-all').addEventListener('click', () => {
    document.querySelectorAll('#rarity-filter input').forEach(cb => cb.checked = true)
    rerender()
  })
  document.getElementById('rarity-none').addEventListener('click', () => {
    document.querySelectorAll('#rarity-filter input').forEach(cb => cb.checked = false)
    rerender()
  })

  // 技能切換
  document.querySelectorAll('[data-skill]').forEach(btn => {
    btn.addEventListener('click', () => {
      skillMode = btn.dataset.skill
      document.querySelectorAll('[data-skill]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      rerender()
    })
  })

  // 名字切換
  document.getElementById('name-toggle').addEventListener('click', () => {
    nameInline = !nameInline
    const btn = document.getElementById('name-toggle')
    btn.textContent = nameInline ? '顯示在卡片內嵌' : '顯示在卡片下方'
    btn.classList.toggle('active', nameInline)
    rerender()
  })

  // ── 輸出確認彈窗 ──
  let pendingExportFn = null

  function buildExportSummary() {
    const SORT_NAMES  = { default: '獲取時間', elite: '等級', rarity: '稀有度', prof: '職業' }
    const SKILL_NAMES = { default: '預設技能', all: '全部技能', none: '關閉不顯示' }
    const EQUIP_NAMES = { default: '預設模組', all: '全部模組', none: '關閉不顯示' }
    const VIEW_NAMES  = { card: '卡片模式', table: '表格模式' }
    const VIS_LABELS  = {
      'rarity-bar': '稀有度顏色條', 'elite': '精英化', 'level': '等級',
      'skill-badge': '技能等級', 'rarity-icon': '稀有度星號', 'potential': '潛能',
    }
    const isLight    = document.body.classList.contains('light')
    const countLabel = document.getElementById('count-label').textContent || ''

    const lines = [
      `主題：${isLight ? '☀️ 淺色' : '🌙 深色'}`,
      `檢視模式：${VIEW_NAMES[viewMode] || viewMode}`,
      `排序：${SORT_NAMES[sortMode] || sortMode}${sortDesc ? ' ↑' : ' ↓'}`,
    ]
    if (viewMode === 'card') {
      lines.push(`技能：${SKILL_NAMES[skillMode] || skillMode}`)
      lines.push(`模組：${EQUIP_NAMES[equipMode] || equipMode}`)
      const nameLabel = nameInline ? '顯示在卡片內嵌' : '顯示在卡片下方'
      lines.push(`名字：${nameLabel}`)
      const onFlags  = Object.keys(VIS_LABELS).filter(k => visFlags[k]).map(k => VIS_LABELS[k])
      const offFlags = Object.keys(VIS_LABELS).filter(k => !visFlags[k]).map(k => VIS_LABELS[k])
      if (onFlags.length)  lines.push(`顯示：${onFlags.join('、')}`)
      if (offFlags.length) lines.push(`隱藏：${offFlags.join('、')}`)
    }
    if (countLabel) lines.push(countLabel)
    return lines.map(l => `• ${l}`).join('<br>')
  }

  function showExportModal(onConfirm) {
    document.getElementById('modal-export-summary').innerHTML = buildExportSummary()
    const overlay = document.getElementById('modal-export-overlay')
    overlay.style.display = 'flex'
    pendingExportFn = onConfirm
  }

  document.getElementById('modal-export-confirm').addEventListener('click', () => {
    document.getElementById('modal-export-overlay').style.display = 'none'
    const imgMode = document.querySelector('input[name="export-img-mode"]:checked')?.value || 'online'
    if (pendingExportFn) { pendingExportFn(imgMode); pendingExportFn = null }
  })
  document.getElementById('modal-export-cancel').addEventListener('click', () => {
    document.getElementById('modal-export-overlay').style.display = 'none'
    pendingExportFn = null
  })
  document.getElementById('modal-export-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-export-overlay')) {
      document.getElementById('modal-export-overlay').style.display = 'none'
      pendingExportFn = null
    }
  })

  // ── 輸出 HTML ──
  document.getElementById('export-html').addEventListener('click', () => {
    if (!document.getElementById('card-output').innerHTML) return
    showExportModal(doExportHtml)
  })

  async function doExportHtml(imgMode = 'online') {
    let gridHtml = document.getElementById('card-output').innerHTML
    if (!gridHtml) return
    const loadingOverlay = document.getElementById('html-loading-overlay')
    loadingOverlay.style.display = 'flex'
    const uid     = document.getElementById('pi-uid').textContent
    const name    = document.getElementById('pi-name').textContent
    const channel = document.getElementById('pi-channel').textContent
    const level   = document.getElementById('pi-level').textContent

    const playerBar = `<div id="player-info-bar" style="display:flex">
  <div class="pi-item"><span class="pi-label">UID</span><span class="pi-value">${uid}</span></div>
  <div class="pi-item"><span class="pi-label">名稱</span><span class="pi-value">${name}</span></div>
  <div class="pi-item"><span class="pi-label">伺服器</span><span class="pi-value">${channel}</span></div>
  <div class="pi-item"><span class="pi-label">等級</span><span class="pi-value">${level}</span></div>
</div>`

    // 統計欄位（快照全部 + 六/五/四星各組）
    const statsHtml = (() => {
      const ids     = ['stat-e2','stat-sp3','stat-sp2','stat-sp1','stat-mod3','stat-mod2','stat-mod1']
      const labels  = ['精二','技能專三','技能專二','技能專一','模組 Lv3','模組 Lv2','模組 Lv1']
      const chars   = gData?.chars || []
      const infoMap = gData?.charInfoMap || {}

      function calcGroup(rarityFilter) {
        const list = rarityFilter === 'all' ? chars
          : chars.filter(c => {
              const info = infoMap[c.charId] || {}
              return (info.rarity ?? c.rarity ?? 0) === Number(rarityFilter)
            })
        let e2=0,sp3=0,sp2=0,sp1=0,mod3=0,mod2=0,mod1=0
        list.forEach(c => {
          if (c.evolvePhase === 2) e2++
          ;(c.skills||[]).forEach(sk => {
            const lv = sk.specializeLevel||0
            if (lv===3) sp3++; else if (lv===2) sp2++; else if (lv===1) sp1++
          })
          ;(c.equip||[]).filter(e=>!e.id.startsWith('uniequip_001_')&&e.locked===false).forEach(eq=>{
            if (eq.level===3) mod3++; else if (eq.level===2) mod2++; else if (eq.level===1) mod1++
          })
        })
        return [e2,sp3,sp2,sp1,mod3,mod2,mod1]
      }

      const isLight = document.body.classList.contains('light')
      const clr = {
        bg:      isLight ? '#ffffff'  : '#1e2130',
        border:  isLight ? '#cbd5e1'  : '#2d3348',
        sep:     isLight ? '#cbd5e1'  : '#2d3348',
        title:   isLight ? '#64748b'  : '#94a3b8',
        label:   isLight ? '#64748b'  : '#64748b',
        num:     isLight ? '#1d4ed8'  : '#60a5fa',
        grpBdr:  isLight ? '#cbd5e1'  : '#2d3348',
      }

      function mkGroup(title, vals) {
        const sep = `<div style="width:1px;height:32px;background:${clr.sep};margin:0 4px;flex-shrink:0"></div>`
        const items = vals.map((v,i) => {
          const needSep = (i===1||i===4) ? sep : ''
          return needSep + `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;min-width:44px"><span style="font-size:18px;font-weight:700;color:${clr.num};line-height:1">${v}</span><span style="font-size:10px;color:${clr.label};white-space:nowrap">${labels[i]}</span></div>`
        }).join('')
        return `<div style="display:flex;flex-direction:column;align-items:flex-start;padding:0 12px 0 0;border-right:1px solid ${clr.grpBdr};margin-right:12px;flex-shrink:0">
  <div style="font-size:10px;color:${clr.title};margin-bottom:6px;font-weight:600">${title}</div>
  <div style="display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap">${items}</div>
</div>`
      }

      const groups = [
        mkGroup('全部',    calcGroup('all')),
        mkGroup('六星 ★6', calcGroup('5')),
        mkGroup('五星 ★5', calcGroup('4')),
        mkGroup('四星 ★4', calcGroup('3')),
      ]
      return `<div style="display:block;margin-bottom:16px;background:${clr.bg};border:1px solid ${clr.border};border-radius:12px;padding:12px 16px">
  <div style="font-size:12px;font-weight:600;color:${clr.title};margin-bottom:10px">數據統計</div>
  <div style="display:flex;align-items:flex-start;flex-wrap:wrap;gap:8px">
    ${groups.join('')}
  </div>
</div>`
    })()

    const cssLinks = [...document.querySelectorAll('link[rel=stylesheet]')]
      .map(l => `<link rel="stylesheet" href="${l.href}">`)
      .join('\n')
    const bodyClass = document.body.className
    const bgColor   = bodyClass.includes('light') ? '#f1f5f9' : '#111'
    // 表格模式：把幹員拆成兩半，並排兩欄輸出
    if (viewMode === 'table') {
      const parser = new DOMParser()
      const doc = parser.parseFromString(gridHtml, 'text/html')
      const origTable = doc.querySelector('#op-table')
      if (origTable) {
        const thead = origTable.querySelector('thead')
        const rows  = [...origTable.querySelectorAll('tbody tr')]
        const half  = Math.ceil(rows.length / 2)
        const left  = rows.slice(0, half)
        const right = rows.slice(half)

        function buildTable(rowList) {
          const t = document.createElement('table')
          t.id = 'op-table'
          t.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed'
          if (thead) t.appendChild(thead.cloneNode(true))
          const tb = document.createElement('tbody')
          rowList.forEach(r => tb.appendChild(r.cloneNode(true)))
          t.appendChild(tb)
          return t.outerHTML
        }

        gridHtml = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">
  <div>${buildTable(left)}</div>
  <div>${buildTable(right)}</div>
</div>`
      }
    }

    const loadingDivs = loadingOverlay.querySelectorAll('div div')
    const loadingText = loadingDivs[1] || null
    const loadingSub  = loadingDivs[2] || null
    if (imgMode === 'offline') {
      // 完整模式：本地 + 外連全部 inline
      gridHtml = await inlineAllImages(gridHtml, (cur, total) => {
        if (loadingText) loadingText.textContent = `正在下載圖片 ${cur} / ${total}`
        if (loadingSub)  loadingSub.textContent  = ''
      })
    } else {
      // 快速模式：只 inline 本地圖片，外連保持 URL
      gridHtml = await inlineLocalOnly(gridHtml)
      gridHtml = gridHtml.replace(/ loading="lazy"/g, '')
    }
    if (loadingText) loadingText.textContent = '正在產生 HTML...'
    if (loadingSub)  loadingSub.textContent  = '請稍候'

    // 表格模式：補上欄寬與間距（!important 確保覆蓋外部 CSS）
    const tableFixStyle = viewMode === 'table' ? `
<style>
  #op-table { table-layout: fixed !important; }
  #op-table th { padding: 8px 4px !important; font-size: 11px !important; white-space: nowrap !important; }
  #op-table td { padding: 8px 4px !important; }
  #op-table th:nth-child(1), #op-table td:nth-child(1) { width: 44px !important; }
  #op-table th:nth-child(2), #op-table td:nth-child(2) { width: 78px !important; overflow:hidden !important; text-overflow:ellipsis !important; white-space:nowrap !important; }
  #op-table th:nth-child(3), #op-table td:nth-child(3) { width: 70px !important; }
  #op-table th:nth-child(4), #op-table td:nth-child(4) { width: 44px !important; }
  #op-table th:nth-child(5), #op-table td:nth-child(5) { width: 40px !important; }
  #op-table th:nth-child(6), #op-table td:nth-child(6) { width: 36px !important; }
  #op-table th:nth-child(7), #op-table td:nth-child(7) { width: 40px !important; }
  #op-table th:nth-child(8), #op-table td:nth-child(8) { width: 120px !important; }
  #op-table th:nth-child(9), #op-table td:nth-child(9) { width: 160px !important; }
  #op-table td:not(:nth-child(2)):not(:nth-child(8)):not(:nth-child(9)) { white-space: nowrap !important; }
  .tbl-avatar { width: 36px !important; height: 36px !important; }
  .tbl-skill-item { width: 36px !important; height: 36px !important; }
  .tbl-skill-icon { width: 36px !important; height: 36px !important; }
  .tbl-equip-item { width: 36px !important; height: 36px !important; }
  .tbl-skill-list, .tbl-equip-list { gap: 4px !important; flex-wrap: wrap !important; }
</style>` : ''

    const html = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<title>幹員卡片 - ${name} (${uid})</title>
${cssLinks}
${tableFixStyle}
</head>
<body class="${bodyClass}" style="background:${bgColor};padding:20px;">
${playerBar}
${statsHtml}
${gridHtml}
</body>
</html>`
    const blob = new Blob([html], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `operator_cards_${uid}.html`
    a.click()
    loadingOverlay.style.display = 'none'
  }

  // ── 輸出 JSON ──
  document.getElementById('export-json').addEventListener('click', () => {
    if (!gData) return
    const blob = new Blob([JSON.stringify(gData, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `operator_data_${getPlayerUid()}.json`
    a.click()
  })

  // ── 輸出 ZIP ──
  document.getElementById('export-cards').addEventListener('click', () => {
    if (!document.querySelectorAll('.op-card').length) return
    showExportModal(doExportZip)
  })

  async function doExportZip() {
    const cards = [...document.querySelectorAll('.op-card')]
    if (!cards.length) return
    const statusEl  = document.getElementById('export-status')
    const btnPause  = document.getElementById('export-pause')
    const btnCancel = document.getElementById('export-cancel')
    const btnExport = document.getElementById('export-cards')

    exportPaused    = false
    exportCancelled = false
    btnPause.style.display  = ''
    btnCancel.style.display = ''
    btnExport.disabled = true
    statusEl.textContent = '載入中…'

    async function loadScript(src) {
      return new Promise((res, rej) => {
        if (document.querySelector(`script[src="${src}"]`)) return res()
        const s = document.createElement('script')
        s.src = src; s.onload = res; s.onerror = rej
        document.head.appendChild(s)
      })
    }
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js')
    } catch {
      statusEl.textContent = '載入函式庫失敗，請確認網路連線'
      btnPause.style.display = btnCancel.style.display = 'none'
      btnExport.disabled = false
      return
    }

    const zip = new JSZip()
    const uid = getPlayerUid()

    for (let i = 0; i < cards.length; i++) {
      while (exportPaused && !exportCancelled) {
        await new Promise(r => setTimeout(r, 200))
      }
      if (exportCancelled) { statusEl.textContent = '已取消'; break }

      const card   = cards[i]
      const wrap   = card.closest('.op-wrap')
      const nameEl = wrap?.querySelector('.op-name')
      const name   = (nameEl?.textContent || `card_${i + 1}`).trim().replace(/[\\/:*?"<>|]/g, '_')
      statusEl.textContent = `處理中 ${i + 1} / ${cards.length}　${name}`
      // 立繪為 lazy，截圖前強制等待載入完成
      const portrait = card.querySelector('img.portrait')
      if (portrait && !portrait.complete) {
        portrait.loading = 'eager'
        await new Promise(resolve => {
          portrait.onload  = resolve
          portrait.onerror = resolve
        })
      }
      try {
        const canvas = await html2canvas(card, { useCORS: true, allowTaint: false, scale: 2, backgroundColor: null })
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
        zip.file(`${String(i + 1).padStart(3, '0')}_${name}.png`, blob)
      } catch (e) {
        console.warn('卡片截圖失敗:', name, e)
      }
    }

    btnPause.style.display = btnCancel.style.display = 'none'
    btnExport.disabled = false

    if (!exportCancelled) {
      statusEl.textContent = '打包中…'
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(zipBlob)
      a.download = `operator_cards_${uid}.zip`
      a.click()
      statusEl.textContent = `完成，共 ${cards.length} 張`
    }
  }

  document.getElementById('export-pause').addEventListener('click', () => {
    exportPaused = !exportPaused
    document.getElementById('export-pause').textContent = exportPaused ? '▶ 繼續' : '⏸ 暫停'
  })

  document.getElementById('export-cancel').addEventListener('click', () => {
    exportCancelled = true
    exportPaused    = false
  })

  // 檢視模式切換
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      viewMode = btn.dataset.view
      document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      // 卡片模式才顯示的控制列
      const cardOnly = ['skill-mode-row', 'equip-mode-row', 'vis-row', 'name-row']
      cardOnly.forEach(id => {
        const el = document.getElementById(id)
        if (el) el.style.display = viewMode === 'card' ? '' : 'none'
      })
      // 表格模式隱藏 ZIP 下載（無法截圖）
      const exportCards = document.getElementById('export-cards')
      if (exportCards) exportCards.style.display = viewMode === 'card' ? '' : 'none'
      rerender()
    })
  })

  // 模組切換（卡片模式）
  document.querySelectorAll('[data-equip]').forEach(btn => {
    btn.addEventListener('click', () => {
      equipMode = btn.dataset.equip
      document.querySelectorAll('[data-equip]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      rerender()
    })
  })

  // 統計稀有度篩選
  document.querySelectorAll('[data-stats-rarity]').forEach(btn => {
    btn.addEventListener('click', () => {
      statsRarity = btn.dataset.statsRarity
      document.querySelectorAll('[data-stats-rarity]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      buildStats(gData)
    })
  })
}

// ── renderTable ──
function renderTable(data, allowedProfs, allowedRarities, searchQuery, sortMode, sortDesc) {
  const out = document.getElementById('card-output')
  out.innerHTML = ''

  const chars        = data.chars        || []
  const charInfoMap  = data.charInfoMap  || {}
  const equipInfoMap = data.equipmentInfoMap || data.equipInfoMap || {}
  if (!data.equipmentInfoMap && !data.equipInfoMap) console.warn('[cards] equipInfoMap 不存在，模組圖示將無法顯示')

  const isLight   = document.body.classList.contains('light')
  const _rarityUrl = isLight ? rarityIconUrlLight : rarityIconUrl
  const _profUrl   = isLight ? profIconUrlLight   : profIconUrl

  const q = (searchQuery || '').trim().toLowerCase()
  const filtered = chars.filter(c => {
    const info   = charInfoMap[c.charId] || {}
    const rarity = info.rarity ?? c.rarity ?? 0
    const prof   = info.profession || 'PIONEER'
    if (!allowedProfs.has(prof))      return false
    if (!allowedRarities.has(rarity)) return false
    if (q) {
      const name = (info.name || c.charId).toLowerCase()
      if (!name.includes(q)) return false
    }
    return true
  })

  // ── 排序（與 renderGrid 相同邏輯）──
  const d = sortDesc ? -1 : 1
  const origIndex = new Map(chars.map((c, i) => [c.charId + c.skinId, i]))
  filtered.sort((a, b) => {
    const ia = charInfoMap[a.charId] || {}
    const ib = charInfoMap[b.charId] || {}
    if (sortMode === 'default') {
      return ((origIndex.get(a.charId + a.skinId) ?? 0) - (origIndex.get(b.charId + b.skinId) ?? 0)) * d
    }
    if (sortMode === 'rarity') {
      return ((ib.rarity ?? b.rarity ?? 0) - (ia.rarity ?? a.rarity ?? 0)) * d
    }
    if (sortMode === 'prof') {
      const pa = PROF_ORDER.indexOf(ia.profession || 'PIONEER')
      const pb = PROF_ORDER.indexOf(ib.profession || 'PIONEER')
      if (pa !== pb) return (pa - pb) * d
      if (b.evolvePhase !== a.evolvePhase) return b.evolvePhase - a.evolvePhase
      return b.level - a.level
    }
    // elite（等級）
    if (b.evolvePhase !== a.evolvePhase) return (b.evolvePhase - a.evolvePhase) * d
    return (b.level - a.level) * d
  })

  const table = document.createElement('table')
  table.id = 'op-table'

  // 表頭
  const thead = document.createElement('thead')
  thead.innerHTML = `<tr>
    <th>頭像</th>
    <th>名稱</th>
    <th>職業</th>
    <th>稀有度</th>
    <th>精英</th>
    <th>等級</th>
    <th>潛能</th>
    <th>技能</th>
    <th>模組</th>
  </tr>`
  table.appendChild(thead)

  const tbody = document.createElement('tbody')
  filtered.forEach(c => {
    const info   = charInfoMap[c.charId] || {}
    const rarity = info.rarity ?? c.rarity ?? 0
    const prof   = info.profession || 'PIONEER'
    const unlockedEquips = getUnlockedEquips(c)

    const tr = document.createElement('tr')

    // 頭像
    const tdAvatar = document.createElement('td')
    tdAvatar.className = 'tbl-avatar-cell'
    tdAvatar.appendChild(mkImg(avatarIdToUrl(c.skinId), 'tbl-avatar'))
    tr.appendChild(tdAvatar)

    // 名稱
    const tdName = document.createElement('td')
    tdName.textContent = info.name || c.charId
    tr.appendChild(tdName)

    // 職業
    const tdProf = document.createElement('td')
    const profWrap = document.createElement('div')
    profWrap.className = 'tbl-prof-wrap'
    profWrap.appendChild(mkImg(_profUrl(prof), 'tbl-prof-icon'))
    const profLabel = document.createElement('span')
    profLabel.textContent = PROF_LABELS[prof] || prof
    profWrap.appendChild(profLabel)
    tdProf.appendChild(profWrap)
    tr.appendChild(tdProf)

    // 稀有度
    const tdRarity = document.createElement('td')
    tdRarity.appendChild(mkImg(_rarityUrl(rarity), 'tbl-rarity-icon'))
    tr.appendChild(tdRarity)

    // 精英
    const tdElite = document.createElement('td')
    tdElite.appendChild(mkImg(eliteIconUrl(c.evolvePhase), 'tbl-elite-icon'))
    tr.appendChild(tdElite)

    // 等級
    const tdLevel = document.createElement('td')
    tdLevel.textContent = c.level
    tr.appendChild(tdLevel)

    // 潛能
    const tdPotential = document.createElement('td')
    tdPotential.appendChild(mkImg(potentialUrl(c.potentialRank), 'tbl-potential-icon'))
    tr.appendChild(tdPotential)

    // 技能（全部）
    const tdSkills = document.createElement('td')
    const skillList = document.createElement('div')
    skillList.className = 'tbl-skill-list'
    const skills = c.skills || []
    if (skills.length) {
      skills.forEach(sk => {
        const sw = document.createElement('div')
        sw.className = 'tbl-skill-item'
        sw.appendChild(mkImg(skillIconUrl(sk.id), 'tbl-skill-icon', sk.id))
        const specLv = sk.specializeLevel || 0
        if (specLv >= 1) {
          sw.appendChild(mkImg(specIconUrl(specLv), 'tbl-skill-badge'))
        } else {
          const badge = document.createElement('div')
          badge.className = 'tbl-skill-badge-txt'
          badge.textContent = c.mainSkillLvl || ''
          sw.appendChild(badge)
        }
        skillList.appendChild(sw)
      })
    } else {
      skillList.appendChild(mkImg(SKILL_NONE, 'tbl-skill-icon'))
    }
    tdSkills.appendChild(skillList)
    tr.appendChild(tdSkills)

    // 模組（全部已解鎖）
    const tdEquip = document.createElement('td')
    const equipList = document.createElement('div')
    equipList.className = 'tbl-equip-list'
    if (unlockedEquips.length) {
      unlockedEquips.forEach(eq => {
        const ei = equipInfoMap[eq.id] || {}
        const ti = ei.typeIcon || ''
        if (!ti) return
        const ew = document.createElement('div')
        ew.className = 'tbl-equip-item'
        ew.style.backgroundImage = `url('${equipIconUrl(ti)}')`
        const lvBadge = document.createElement('div')
        lvBadge.className = 'equip-level-badge'
        lvBadge.textContent = eq.level
        ew.appendChild(lvBadge)
        equipList.appendChild(ew)
      })
    } else {
      const none = document.createElement('span')
      none.className = 'tbl-none'
      none.textContent = '—'
      equipList.appendChild(none)
    }
    tdEquip.appendChild(equipList)
    tr.appendChild(tdEquip)

    tbody.appendChild(tr)
  })

  table.appendChild(tbody)
  out.appendChild(table)
  document.getElementById('count-label').textContent = `顯示 ${filtered.length} / ${chars.length} 位幹員`
}

// ── buildStats ──
function buildStats(data) {
  if (!data) return
  const chars       = data.chars       || []
  const charInfoMap = data.charInfoMap || {}

  const filtered = statsRarity === 'all'
    ? chars
    : chars.filter(c => {
        const info   = charInfoMap[c.charId] || {}
        const rarity = info.rarity ?? c.rarity ?? 0
        return rarity === Number(statsRarity)
      })

  let e2 = 0, sp3 = 0, sp2 = 0, sp1 = 0, mod3 = 0, mod2 = 0, mod1 = 0

  filtered.forEach(c => {
    if (c.evolvePhase === 2) e2++
    ;(c.skills || []).forEach(sk => {
      const lv = sk.specializeLevel || 0
      if (lv === 3) sp3++
      else if (lv === 2) sp2++
      else if (lv === 1) sp1++
    })
    ;(c.equip || []).filter(e => !e.id.startsWith('uniequip_001_') && e.locked === false).forEach(eq => {
      if (eq.level === 3) mod3++
      else if (eq.level === 2) mod2++
      else if (eq.level === 1) mod1++
    })
  })

  document.getElementById('stat-e2').textContent   = e2
  document.getElementById('stat-sp3').textContent  = sp3
  document.getElementById('stat-sp2').textContent  = sp2
  document.getElementById('stat-sp1').textContent  = sp1
  document.getElementById('stat-mod3').textContent = mod3
  document.getElementById('stat-mod2').textContent = mod2
  document.getElementById('stat-mod1').textContent = mod1
}

let eventsBound = false

// ── initViewer（供 main.js 呼叫）──
export function initViewer(data) {
  gData = data
  window.__rerender = rerender  // 供主題切換呼叫
  showPlayerInfo(data)
  buildFilters(data)
  buildStats(data)
  sortDesc = false
  updateSortBtns()
  rerender()
  if (!eventsBound) {
    bindEvents()
    eventsBound = true
  }
}


