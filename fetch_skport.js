/**
 * fetch_skport.js
 * 海外版森空島 (skport.com) 玩家資料抓取腳本
 *
 * 使用方式：
 *   1. 安裝依賴：npm install axios crypto-js
 *   2. 填入下方 INPUT（從 skport.com 的 localStorage 取得）
 *   3. 執行：node fetch_skport.js
 *   4. 輸出：player_info_{uid}.json
 *
 * 如何取得憑證：
 *   登入 https://www.skport.com 後，按 F12 開啟開發者工具
 *   在 Console 輸入以下指令，複製輸出結果：
 *   copy(localStorage.getItem('SK_OAUTH_CRED_KEY')+','+localStorage.getItem('SK_TOKEN_CACHE_KEY'))
 */

import axios from 'axios'
import CryptoJS from 'crypto-js'
import fs from 'fs'

// ============================================================
// ★ 填入你的憑證（從 skport.com Console 取得，格式：cred,token）
// ============================================================
const INPUT = 'YOUR_CRED_HERE,YOUR_TOKEN_HERE'
// ============================================================

const DOMAIN = 'https://zonai.skport.com'
const BINDING_API = '/api/v1/game/player/binding'
const PLAYER_INFO_API = '/api/v1/game/player/info'

function parseInput(input) {
    const clean = input.replace(/\s+/g, '').replace(/["']/g, '')
    const [cred, token] = clean.split(',')
    return { cred, token }
}

function getSign(path, params, token) {
    const timestamp = Math.floor((Date.now() - 300) / 1000).toString()
    const headerObj = { platform: '3', timestamp, dId: '', vName: '1.0.0' }
    const signStr = path + (params || '') + timestamp + JSON.stringify(headerObj)
    const sign = CryptoJS.MD5(CryptoJS.HmacSHA256(signStr, token).toString()).toString()
    return { timestamp, sign }
}

function buildHeaders(path, params, cred, token) {
    const { timestamp, sign } = getSign(path, params, token)
    return {
        'cred': cred,
        'platform': '3',
        'timestamp': timestamp,
        'dId': '',
        'vname': '1.0.0',
        'sign': sign,
        'sk-language': 'zh_Hant'
    }
}

async function getBindingList(cred, token) {
    console.log('📡 取得帳號綁定列表...')
    const headers = buildHeaders(BINDING_API, '', cred, token)
    const res = await axios.get(`${DOMAIN}${BINDING_API}`, { headers })
    if (res.data.code !== 0) {
        throw new Error(`Binding API 錯誤：code=${res.data.code} message=${res.data.message}`)
    }
    const list = res.data.data.list
    for (const item of list) {
        if (item.appCode === 'arknights') return item.bindingList
    }
    throw new Error('找不到綁定的明日方舟帳號')
}

async function getPlayerInfo(uid, cred, token) {
    console.log(`📡 取得玩家資料 (uid: ${uid})...`)
    const params = `uid=${uid}`
    const headers = buildHeaders(PLAYER_INFO_API, params, cred, token)
    const res = await axios.get(`${DOMAIN}${PLAYER_INFO_API}?${params}`, { headers })
    if (res.data.code !== 0) {
        throw new Error(`PlayerInfo API 錯誤：code=${res.data.code} message=${res.data.message}`)
    }
    return res.data.data
}

async function main() {
    console.log('=== 海外版森空島資料抓取工具 ===\n')

    if (INPUT === 'YOUR_CRED_HERE,YOUR_TOKEN_HERE') {
        console.error('❌ 請先填入 CRED 和 TOKEN！')
        console.error('   編輯此檔案，將 INPUT 變數替換為你的憑證')
        process.exit(1)
    }

    const { cred, token } = parseInput(INPUT)
    console.log(`✅ 憑證解析成功`)
    console.log(`   cred:  ${cred.substring(0, 8)}...`)
    console.log(`   token: ${token.substring(0, 8)}...\n`)

    // Step 1: 取得綁定帳號列表
    const bindingList = await getBindingList(cred, token)
    console.log(`\n✅ 找到 ${bindingList.length} 個綁定帳號：`)
    bindingList.forEach((b, i) => {
        console.log(`   [${i}] ${b.nickName} | ${b.channelName} | uid: ${b.uid}`)
    })

    // 預設使用第一個帳號，如需指定請修改 index
    const target = bindingList[0]
    console.log(`\n▶ 使用帳號：${target.nickName} (uid: ${target.uid})\n`)

    // Step 2: 取得玩家完整資料
    const playerInfo = await getPlayerInfo(target.uid, cred, token)

    // Step 3: 輸出 JSON
    const output = {
        _meta: {
            fetchedAt: new Date().toISOString(),
            uid: target.uid,
            nickName: target.nickName,
            channelName: target.channelName
        },
        ...playerInfo
    }

    const filename = `player_info_${target.uid}.json`
    fs.writeFileSync(filename, JSON.stringify(output, null, 2), 'utf-8')

    console.log(`✅ 已儲存至 ${filename}`)
    console.log(`\n📊 資料摘要：`)
    console.log(`   帳號等級：${playerInfo.status?.level ?? '未知'}`)
    console.log(`   幹員數量：${playerInfo.chars?.length ?? 0}`)
    console.log(`   時裝數量：${playerInfo.skins?.length ?? 0}`)
}

main().catch(err => {
    console.error('\n❌ 執行失敗：', err.message)
    process.exit(1)
})
