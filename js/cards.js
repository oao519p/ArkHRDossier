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
let sortMode       = 'default'
let sortDesc       = false
let searchQuery    = ''
let nameInline     = false
let exportPaused   = false
let exportCancelled = false
const visFlags = {
  'rarity-bar':  true,
  'elite':       true,
  'level':       true,
  'skill-badge': true,
  'equip':       true,
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

const rarityIconUrl = r  => `https://torappu.prts.wiki/assets/rarity_icon/rarity_${r}.png`
const profIconUrl   = p  => `https://torappu.prts.wiki/assets/profession_large_icon/icon_profession_${p.toLowerCase()}_large.png`
const eliteIconUrl  = e  => `https://torappu.prts.wiki/assets/elite_icon/elite_${e}_large.png`
const potentialUrl  = r  => `https://torappu.prts.wiki/assets/potential_icon/potential_${r}.png`
const skillIconUrl  = id => {
  if (!id) return SKILL_NONE
  if (LOCAL_SKILLS.has(id)) return `./image/${id}.png`
  return `https://torappu.prts.wiki/assets/skill_icon/skill_icon_${id}.png`
}
const specIconUrl   = lv => `https://torappu.prts.wiki/assets/specialized_icon/specialized_tiny_${lv}.png`
const equipIconUrl  = t  => t ? `https://torappu.prts.wiki/assets/uniequip_direction/${t}.png` : ''

// ── mkImg ──
function mkImg(src, cls, skillId) {
  const img = document.createElement('img')
  img.src = src
  if (cls) img.className = cls
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
    cb.type = 'checkbox'; cb.value = String(r); cb.checked = true
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
  renderGrid(gData, allowedProfs, allowedRarities, searchQuery, sortMode)
}

// ── renderGrid ──
function renderGrid(data, allowedProfs, allowedRarities, searchQuery, sortMode) {
  const out = document.getElementById('card-output')
  out.innerHTML = ''

  const chars        = data.chars        || []
  const charInfoMap  = data.charInfoMap  || {}
  const equipInfoMap = data.equipmentInfoMap || data.equipInfoMap || {}

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

    const defaultSkillId = c.defaultSkillId || ''
    const defaultEquipId = c.defaultEquipId || ''
    const equipInfo      = equipInfoMap[defaultEquipId] || {}
    const typeIcon       = equipInfo.typeIcon || ''

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

    card.appendChild(mkImg(skinIdToUrl(c.skinId), 'portrait'))

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

    // 技能 & 模組
    const skillRow = document.createElement('div')
    skillRow.className = 'skill-row'

    function mkEquipWrap(overlay) {
      if (!typeIcon) return null
      const ew = document.createElement('div')
      ew.className = overlay
        ? `equip-wrap equip-overlay${typeIcon === 'original' ? ' equip-original' : ''}`
        : 'equip-wrap'
      ew.style.backgroundImage = `url('${equipIconUrl(typeIcon)}')`
      if (!overlay) ew.style.backgroundSize = typeIcon === 'original' ? '24px 31px' : '130%'
      return ew
    }

    if (skillMode === 'none') {
      // 不渲染 skill-row
    } else if (skillMode !== 'all') {
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
      skillRow.appendChild(sw)
      if (visFlags['equip']) {
        const ew = mkEquipWrap(false)
        if (ew) skillRow.appendChild(ew)
      }
    } else {
      const skills = (c.skills && c.skills.length) ? c.skills : []
      skills.forEach((sk, idx) => {
        const sw = document.createElement('div')
        sw.className = 'skill-wrap'
        sw.style.position = 'relative'
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
        if (idx === 0 && visFlags['equip']) {
          const ew = mkEquipWrap(true)
          if (ew) sw.appendChild(ew)
        }
        skillRow.appendChild(sw)
      })
      if (!skills.length) {
        const sw = document.createElement('div')
        sw.className = 'skill-wrap'
        sw.appendChild(mkImg(SKILL_NONE, 'skill-icon'))
        const ew = mkEquipWrap(true)
        if (ew) sw.appendChild(ew)
        skillRow.appendChild(sw)
      }
    }

    if (skillMode !== 'none') card.appendChild(skillRow)

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

async function inlineLocalImages(html) {
  const matches = [...html.matchAll(/src="(\.\/image\/[^"]+)"/g)]
  for (const [full, src] of matches) {
    const b64 = await imgToBase64(src)
    html = html.replaceAll(`src="${src}"`, `src="${b64}"`)
  }
  // background-image url
  const bgMatches = [...html.matchAll(/url\('(\.\/image\/[^']+)'\)/g)]
  for (const [full, src] of bgMatches) {
    const b64 = await imgToBase64(src)
    html = html.replaceAll(`url('${src}')`, `url('${b64}')`)
  }
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

  // ── 輸出 HTML ──
  document.getElementById('export-html').addEventListener('click', async () => {
    let gridHtml = document.getElementById('card-output').innerHTML
    if (!gridHtml) return
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
    const cssLinks = [...document.querySelectorAll('link[rel=stylesheet]')]
      .map(l => `<link rel="stylesheet" href="${l.href}">`)
      .join('\n')
    const bodyClass = document.body.className
    const bgColor   = bodyClass.includes('light') ? '#f1f5f9' : '#111'
    gridHtml = await inlineLocalImages(gridHtml)
    const html = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<title>幹員卡片 - ${name} (${uid})</title>
${cssLinks}
</head>
<body class="${bodyClass}" style="background:${bgColor};padding:20px;">
${playerBar}
${gridHtml}
</body>
</html>`
    const blob = new Blob([html], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `operator_cards_${uid}.html`
    a.click()
  })

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
  document.getElementById('export-cards').addEventListener('click', async () => {
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
  })

  document.getElementById('export-pause').addEventListener('click', () => {
    exportPaused = !exportPaused
    document.getElementById('export-pause').textContent = exportPaused ? '▶ 繼續' : '⏸ 暫停'
  })

  document.getElementById('export-cancel').addEventListener('click', () => {
    exportCancelled = true
    exportPaused    = false
  })
}

let eventsBound = false

// ── initViewer（供 main.js 呼叫）──
export function initViewer(data) {
  gData = data
  showPlayerInfo(data)
  buildFilters(data)
  sortDesc = false
  updateSortBtns()
  rerender()
  if (!eventsBound) {
    bindEvents()
    eventsBound = true
  }
}


