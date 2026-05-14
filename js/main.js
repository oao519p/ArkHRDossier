// main.js — 流程控制
import { parseCredInput, fetchBinding, fetchPlayerInfo, setPlatform } from './api.js'
import { initViewer } from './cards.js'

// ── 狀態 ──
let cred             = ''
let token            = ''
let selectedUid      = ''
let selectedChannel  = ''

// ── 工具 ──
function showError(elId, msg) {
  const el = document.getElementById(elId)
  if (el) { el.textContent = msg; el.style.display = msg ? '' : 'none' }
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId)
  if (!btn) return
  btn.disabled = loading
  btn.dataset.origText = btn.dataset.origText || btn.textContent
  btn.textContent = loading ? '處理中…' : btn.dataset.origText
}

function collapseStep(stepEl) {
  stepEl.classList.add('collapsed')
}

function launchViewer(data) {
  const viewer = document.getElementById('viewer-section')
  viewer.style.display = ''
  viewer.scrollIntoView({ behavior: 'smooth' })
  initViewer(data)
}

// ── DOM ready ──
window.setPlatform = setPlatform

document.addEventListener('DOMContentLoaded', () => {
  const steps = {
    cred:    document.getElementById('step-cred'),
    account: document.getElementById('step-account'),
    fetch:   document.getElementById('step-fetch'),
  }

  // Step 1：憑證輸入
  document.getElementById('btn-cred').addEventListener('click', () => {
    const raw = document.getElementById('input-cred').value.trim()
    showError('err-cred', '')
    if (!raw) { showError('err-cred', '請輸入憑證'); return }
    try {
      const parsed = parseCredInput(raw)
      cred  = parsed.cred
      token = parsed.token
      collapseStep(steps.cred)
      steps.account.classList.remove('collapsed')
      loadAccounts()
    } catch (e) {
      showError('err-cred', `憑證格式錯誤：${e.message}`)
    }
  })

  // Step 2：選擇帳號
  async function loadAccounts() {
    const listEl = document.getElementById('account-list')
    listEl.innerHTML = '<span style="color:#64748b;font-size:13px">載入中…</span>'
    showError('err-account', '')
    try {
      const accounts = await fetchBinding(cred, token)
      listEl.innerHTML = ''
      if (!accounts.length) {
        listEl.innerHTML = '<span style="color:#f87171;font-size:13px">找不到綁定帳號</span>'
        return
      }
      accounts.forEach(acc => {
        const btn = document.createElement('button')
        btn.className = 'account-item'
        btn.innerHTML = `<span class="account-name">${acc.nickName || acc.uid}</span><span class="badge">${acc.channelName || acc.uid}</span>`
        btn.addEventListener('click', () => {
          document.querySelectorAll('.account-item').forEach(b => b.classList.remove('selected'))
          btn.classList.add('selected')
          selectedUid     = acc.uid
          selectedChannel = acc.channelName || ''
          collapseStep(steps.account)
          steps.fetch.classList.remove('collapsed')
        })
        listEl.appendChild(btn)
      })
    } catch (e) {
      showError('err-account', `載入帳號失敗：${e.message}`)
    }
  }

  // Step 3：取得資料
  document.getElementById('btn-fetch').addEventListener('click', async () => {
    showError('err-fetch', '')
    setLoading('btn-fetch', true)
    try {
      const data = await fetchPlayerInfo(selectedUid, cred, token)
      setLoading('btn-fetch', false)
      collapseStep(steps.fetch)
      if (!data._meta) data._meta = {}
      if (!data._meta.channelName) data._meta.channelName = selectedChannel
      launchViewer(data)
    } catch (e) {
      setLoading('btn-fetch', false)
      showError('err-fetch', `取得資料失敗：${e.message}`)
    }
  })

  // JSON 上傳（跳過所有步驟）
  document.getElementById('btn-upload-json').addEventListener('change', e => {
    const file = e.target.files[0]
    if (!file) return

    // 檔案大小限制：50 MB
    const MAX_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      showUploadError(`檔案過大（${(file.size / 1024 / 1024).toFixed(1)} MB），上限為 50 MB`)
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = ev => {
      let data
      // 1. JSON 格式檢查
      try {
        data = JSON.parse(ev.target.result)
      } catch (err) {
        showUploadError(`JSON 格式錯誤：${err.message}`)
        return
      }
      // 2. 必須是 object
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        showUploadError('格式不符：JSON 根層必須是物件（{}）')
        return
      }
      // 3. chars 必須存在且為陣列
      if (!Array.isArray(data.chars)) {
        showUploadError('格式不符：找不到 chars 陣列，請確認是否為正確的幹員資料 JSON')
        return
      }
      // 4. chars 不能是空陣列
      if (data.chars.length === 0) {
        showUploadError('格式不符：chars 陣列為空，沒有任何幹員資料')
        return
      }

      clearUploadError()
      Object.values(steps).forEach(collapseStep)
      launchViewer(data)
    }
    reader.onerror = () => {
      showUploadError('檔案讀取失敗，請重試')
    }
    reader.readAsText(file)
    // 清空 value，讓同一個檔案可以重複上傳
    e.target.value = ''
  })

  function showUploadError(msg) {
    let el = document.getElementById('upload-error')
    if (!el) {
      el = document.createElement('div')
      el.id = 'upload-error'
      document.body.appendChild(el)
    }
    el.textContent = '⚠️ ' + msg
    el.style.display = 'block'
  }

  function clearUploadError() {
    const el = document.getElementById('upload-error')
    if (el) el.style.display = 'none'
  }
})
