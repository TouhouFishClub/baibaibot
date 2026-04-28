// =============================================================================
// 韩中翻译表生成脚本
//
//   原理：
//     - cl_mabinogi_smuggler_kr 是从 lute.fantazm.net 抓取的韩服走私记录
//     - cl_mabinogi_smuggler (type=forecast) 是国服游戏内推送的走私预告
//     - 同一次走私在两边的时间戳几乎相同（差值 <= 90 秒），可用来配对
//     - 配对后即可得到 (kr.goods → cn.item) 与 (kr.position → cn.area) 翻译
//
//   合并策略：
//     - 优先保留 translation.json 中已存在的非空人工翻译
//     - 自动匹配只补"空 / 不存在"的 key
//     - 同一 KR key 在多次匹配中冲突时，按"出现次数最多的 CN 值"获胜
//
//   用法：
//     node ai/mabinogi/smuggler/buildTranslation.js                # 仅更新 translation.json
//     node ai/mabinogi/smuggler/buildTranslation.js --backfill     # 还顺便给 DB 中存量记录补 CN 字段
//     node ai/mabinogi/smuggler/buildTranslation.js --window=120   # 自定义匹配时间窗口(秒)
// =============================================================================

// 一次性脚本不需要 scheduler 副作用启动 36 分钟轮询
process.env.LUTE_SMUG_AUTO_START = '0'

const fs = require('fs')
const path = require('path')
const { getClient } = require('../../../mongo')

const TRANSLATION_PATH = path.join(__dirname, 'assets', 'translation.json')
const KR_COLLECTION = 'cl_mabinogi_smuggler_kr'
const CN_COLLECTION = 'cl_mabinogi_smuggler'
const DB_NAME = 'db_bot'

const argv = process.argv.slice(2)
const FLAG_BACKFILL = argv.includes('--backfill')
const WINDOW_ARG = argv.find(a => a.startsWith('--window='))
const MATCH_WINDOW_MS = (WINDOW_ARG ? Number(WINDOW_ARG.split('=')[1]) : 90) * 1000

const loadExistingTranslation = () => {
  try {
    const raw = fs.readFileSync(TRANSLATION_PATH, 'utf8')
    const cleaned = raw.replace(/,(\s*[}\]])/g, '$1') // 容忍尾部逗号
    const parsed = JSON.parse(cleaned)
    return {
      goods: (parsed && parsed.goods) || {},
      position: (parsed && parsed.position) || {}
    }
  } catch (e) {
    if (e && e.code !== 'ENOENT') {
      console.warn(`[buildTranslation] 现有 translation.json 解析失败，忽略: ${e?.message || e}`)
    }
    return { goods: {}, position: {} }
  }
}

// 给定一个 krTs，二分找出 cnRecords 里 ts 最接近的索引
const nearestCnIndex = (cnRecords, krTs) => {
  if (cnRecords.length === 0) return -1
  let lo = 0, hi = cnRecords.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (cnRecords[mid].ts < krTs) lo = mid + 1
    else hi = mid
  }
  // lo 现在是第一个 ts >= krTs 的位置；同时检查 lo-1
  let best = lo
  if (lo - 1 >= 0 && Math.abs(cnRecords[lo - 1].ts - krTs) < Math.abs(cnRecords[best].ts - krTs)) {
    best = lo - 1
  }
  return best
}

// 在多个候选里按出现次数选优胜者
const pickWinner = candidates => {
  if (!candidates || candidates.length === 0) return null
  const counter = {}
  for (const v of candidates) {
    counter[v] = (counter[v] || 0) + 1
  }
  let best = null
  let bestCount = 0
  for (const [v, c] of Object.entries(counter)) {
    if (c > bestCount) {
      bestCount = c
      best = v
    }
  }
  return best
}

const main = async () => {
  const client = await getClient()
  if (!client) throw new Error('mongo getClient() 失败')

  const krCol = client.db(DB_NAME).collection(KR_COLLECTION)
  const cnCol = client.db(DB_NAME).collection(CN_COLLECTION)

  const krRecords = await krCol.find({}).sort({ krTs: 1 }).toArray()
  const cnRecords = await cnCol
    .find({ type: 'forecast', area: { $ne: null }, item: { $ne: null } })
    .sort({ ts: 1 })
    .toArray()

  console.log(`[buildTranslation] kr=${krRecords.length} cn=${cnRecords.length} window=${MATCH_WINDOW_MS / 1000}s`)

  // 收集 (krGoods → [cnItem, ...]) 与 (krPosition → [cnArea, ...]) 候选
  const goodsCandidates = {}
  const positionCandidates = {}
  let matched = 0
  let unmatched = 0

  for (const kr of krRecords) {
    if (!kr.krTs || !kr.goods || !kr.position) {
      unmatched++
      continue
    }
    const idx = nearestCnIndex(cnRecords, kr.krTs)
    if (idx < 0) {
      unmatched++
      continue
    }
    const cn = cnRecords[idx]
    if (Math.abs(cn.ts - kr.krTs) > MATCH_WINDOW_MS) {
      unmatched++
      continue
    }
    matched++
    if (cn.item) {
      goodsCandidates[kr.goods] = goodsCandidates[kr.goods] || []
      goodsCandidates[kr.goods].push(cn.item)
    }
    if (cn.area) {
      positionCandidates[kr.position] = positionCandidates[kr.position] || []
      positionCandidates[kr.position].push(cn.area)
    }
  }

  console.log(`[buildTranslation] 配对: matched=${matched} unmatched=${unmatched}`)

  // 合并：人工已写的非空值优先；空值或不存在的从自动结果补上
  const existing = loadExistingTranslation()
  const goodsOut = { ...existing.goods }
  const positionOut = { ...existing.position }

  let goodsAdded = 0, goodsKept = 0, goodsConflict = 0
  for (const [kr, cands] of Object.entries(goodsCandidates)) {
    const winner = pickWinner(cands)
    if (!winner) continue
    const prev = (goodsOut[kr] || '').trim()
    if (!prev) {
      goodsOut[kr] = winner
      goodsAdded++
    } else if (prev !== winner) {
      goodsConflict++
      console.warn(`  [conflict goods] "${kr}" existing="${prev}" auto="${winner}" (保留 existing)`)
    } else {
      goodsKept++
    }
  }

  let posAdded = 0, posKept = 0, posConflict = 0
  for (const [kr, cands] of Object.entries(positionCandidates)) {
    const winner = pickWinner(cands)
    if (!winner) continue
    const prev = (positionOut[kr] || '').trim()
    if (!prev) {
      positionOut[kr] = winner
      posAdded++
    } else if (prev !== winner) {
      posConflict++
      console.warn(`  [conflict position] "${kr}" existing="${prev}" auto="${winner}" (保留 existing)`)
    } else {
      posKept++
    }
  }

  // 清理空 key（早期手动维护遗留）
  delete goodsOut['']
  delete positionOut['']

  // 排序输出，让 diff 更稳定
  const sortObj = obj => Object.keys(obj).sort().reduce((acc, k) => { acc[k] = obj[k]; return acc }, {})
  const final = {
    goods: sortObj(goodsOut),
    position: sortObj(positionOut)
  }

  fs.writeFileSync(TRANSLATION_PATH, JSON.stringify(final, null, 2) + '\n', 'utf8')
  console.log(`[buildTranslation] 写入 ${TRANSLATION_PATH}`)
  console.log(`  goods:    新增=${goodsAdded} 一致=${goodsKept} 冲突=${goodsConflict} 总=${Object.keys(final.goods).length}`)
  console.log(`  position: 新增=${posAdded} 一致=${posKept} 冲突=${posConflict} 总=${Object.keys(final.position).length}`)

  if (FLAG_BACKFILL) {
    console.log('[buildTranslation] --backfill: 回填 DB 中存量 kr 记录的 CN 字段')
    // 主动重新加载，因为 scheduler 是在 require 时加载的
    const scheduler = require('./smugKrScheduler')
    scheduler.reloadTranslation()
    const r = await scheduler.backfillCnFields()
    console.log(`  total=${r.total} updated=${r.updated}`)
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(e => {
      console.error('[buildTranslation] 失败:', e)
      process.exit(1)
    })
}

module.exports = { main }
