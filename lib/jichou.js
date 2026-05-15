const fs = require('fs')
const path = require('path')

const JICHOU_PATH = path.join(__dirname, '..', 'jichou.json')
let blockedQq = new Set()

const reloadJichou = () => {
  try {
    const raw = fs.readFileSync(JICHOU_PATH, 'utf8').replace(/^\uFEFF/, '')
    const parsed = JSON.parse(raw)
    const list = Array.isArray(parsed) ? parsed : (parsed.qq || parsed.list || [])
    blockedQq = new Set(
      list.map(n => Number(n)).filter(n => Number.isFinite(n) && n > 0)
    )
    if (blockedQq.size) {
      console.log(`[jichou] 已加载 ${blockedQq.size} 个 QQ，调用机器人时不回复`)
    }
  } catch (e) {
    if (e && e.code !== 'ENOENT') {
      console.warn(`[jichou] jichou.json 解析失败: ${e?.message || e}`)
    }
    blockedQq = new Set()
  }
}

reloadJichou()
try {
  fs.watchFile(JICHOU_PATH, { interval: 2000 }, reloadJichou)
} catch (_) {}

const isJichou = userId => {
  const id = Number(userId)
  return Number.isFinite(id) && blockedQq.has(id)
}

module.exports = { isJichou, reloadJichou }
