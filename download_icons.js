// 下載固定小圖示到 image/ 子目錄
// 執行方式：node download_icons.js

const https = require('https')
const fs    = require('fs')
const path  = require('path')

const BASE = 'https://torappu.prts.wiki/assets'

const FILES = [
  // rarity_icon (深色)
  ...[0,1,2,3,4,5].map(r => ({ url: `${BASE}/rarity_icon/rarity_${r}.png`,       dest: `image/rarity_icon/rarity_${r}.png` })),
  // rarity_icon (淺色 _black)
  ...[0,1,2,3,4,5].map(r => ({ url: `${BASE}/rarity_icon/rarity_${r}_black.png`,  dest: `image/rarity_icon/rarity_${r}_black.png` })),
  // profession_large_icon (深色)
  ...['caster','tank','medic','pioneer','sniper','special','support','warrior'].map(p => ({
    url:  `${BASE}/profession_large_icon/icon_profession_${p}_large.png`,
    dest: `image/profession_large_icon/icon_profession_${p}_large.png`
  })),
  // profession_large_icon (淺色 _white)
  ...['caster','tank','medic','pioneer','sniper','special','support','warrior'].map(p => ({
    url:  `${BASE}/profession_large_icon/icon_profession_${p}_large_white.png`,
    dest: `image/profession_large_icon/icon_profession_${p}_large_white.png`
  })),
  // elite_icon
  ...[0,1,2].map(e => ({ url: `${BASE}/elite_icon/elite_${e}_large.png`,          dest: `image/elite_icon/elite_${e}_large.png` })),
  // potential_icon
  ...[0,1,2,3,4,5].map(r => ({ url: `${BASE}/potential_icon/potential_${r}.png`,  dest: `image/potential_icon/potential_${r}.png` })),
  // specialized_icon
  ...[1,2,3].map(lv => ({ url: `${BASE}/specialized_icon/specialized_tiny_${lv}.png`, dest: `image/specialized_icon/specialized_tiny_${lv}.png` })),
]

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dest)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (fs.existsSync(dest)) { console.log(`  skip  ${dest}`); return resolve() }
    const file = fs.createWriteStream(dest)
    https.get(url, res => {
      if (res.statusCode !== 200) {
        file.close()
        fs.unlinkSync(dest)
        console.warn(`  FAIL  ${dest} (${res.statusCode})`)
        return resolve()
      }
      res.pipe(file)
      file.on('finish', () => { file.close(); console.log(`  OK    ${dest}`); resolve() })
    }).on('error', err => {
      file.close()
      if (fs.existsSync(dest)) fs.unlinkSync(dest)
      console.warn(`  ERR   ${dest}: ${err.message}`)
      resolve()
    })
  })
}

;(async () => {
  console.log(`下載 ${FILES.length} 個圖示...`)
  for (const f of FILES) await download(f.url, f.dest)
  console.log('完成！')
})()
