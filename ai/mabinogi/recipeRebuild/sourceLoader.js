const fs = require('fs')
const path = require('path')
const xml2js = require('xml2js')

const DATA_DIR = path.join(__dirname, '..', 'data', 'IT')
const parser = new xml2js.Parser()

const readXml = fileName => {
  const filePath = path.join(DATA_DIR, fileName)
  if (!fs.existsSync(filePath)) return null
  try {
    return parser.parseStringPromise(fs.readFileSync(filePath, 'utf-16le'))
  } catch (e) {
    console.error(`[sourceLoader] ${fileName} 解析失败:`, e.message)
    return null
  }
}

const loadTranslation = (fileName, tag) => {
  const map = {}
  try {
    const text = fs.readFileSync(path.join(DATA_DIR, fileName), 'utf-8')
    for (const line of text.split(/\r?\n/)) {
      const tab = line.indexOf('\t')
      if (tab <= 0) continue
      const key = line.slice(0, tab).trim()
      const value = line.slice(tab + 1).trim()
      if (key && value) map[`_LT[xml.${tag}.${key}]`] = value
    }
  } catch (e) { /* translation is optional */ }
  return map
}

const parseProducts = value => String(value || '').split(';').map(part => {
  const [id, weight] = part.split(',').map(v => parseInt(String(v).trim(), 10))
  return id > 0 ? { id, weight: Number.isFinite(weight) ? weight : 0 } : null
}).filter(Boolean)

const shortTarget = targetId => {
  const parts = String(targetId || '').split('/').filter(Boolean)
  if (!parts.length) return '采集点'
  return parts.slice(-3).join(' / ')
}

const toolName = value => {
  const parts = String(value || '').split('/').filter(Boolean)
  return parts.length ? parts[parts.length - 1] : ''
}

const loadIndexedTranslation = fileName => {
  const map = new Map()
  try {
    const text = fs.readFileSync(path.join(DATA_DIR, fileName), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const tab = line.indexOf('\t')
      if (tab < 0) continue
      const key = parseInt(line.slice(0, tab).trim(), 10)
      if (!Number.isNaN(key)) map.set(key, line.slice(tab + 1).trim())
    }
  } catch (e) { /* optional translation */ }
  return map
}

const localizedIndex = value => {
  const match = String(value || '').match(/\.([0-9]+)\]/)
  return match ? parseInt(match[1], 10) : -1
}

const isChinaLocale = value => {
  const tokens = String(value || '').split(/[|&]/).map(token => token.trim().toLowerCase()).filter(Boolean)
  if (!tokens.length) return true
  if (tokens.includes('china')) return true
  if (tokens.includes('japan') || tokens.includes('korea')) return false
  return true
}

const parseDungeonRewardIds = value => {
  const ids = []
  for (const match of String(value || '').matchAll(/(?:^|;)\s*(?:id|manual):(\d+)/g)) {
    const id = parseInt(match[1], 10)
    if (id > 0) ids.push(id)
  }
  return ids
}

const addSource = (index, id, source) => {
  if (!id) return
  if (!index.has(id)) index.set(id, [])
  const list = index.get(id)
  const key = JSON.stringify(source)
  if (!list.some(item => JSON.stringify(item) === key)) list.push(source)
}

const loadCollectingSources = async index => {
  const data = await readXml('CollectingForm.xml')
  const forms = data && data.CollectingForm && data.CollectingForm.CollectingFormList
    ? data.CollectingForm.CollectingFormList[0].CollectingForm || []
    : []
  for (const form of forms) {
    const attrs = form.$ || {}
    const target = shortTarget(attrs.TargetId)
    const tool = toolName(attrs.PrimeTool)
    const source = {
      kind: 'collect',
      label: `采集：${target}${tool ? `（${tool}）` : ''}`,
      formId: parseInt(attrs.ID, 10) || 0,
      targetId: attrs.TargetId || '',
      skillId: parseInt(attrs.SkillID, 10) || 0,
      weight: 0,
    }
    for (const product of parseProducts(attrs.Products)) {
      addSource(index, product.id, { ...source, weight: product.weight })
    }
  }
}

const loadNpcSources = async index => {
  const data = await readXml(path.join('NPCShop', 'NPCShop.xml'))
  const shopRoot = data && data.NPCShop
  if (!shopRoot) return
  const infos = (shopRoot.Shop && shopRoot.Shop[0] && shopRoot.Shop[0].Info) || []
  const tabs = (shopRoot.ShopTab && shopRoot.ShopTab[0] && shopRoot.ShopTab[0].Tab) || []
  const products = (shopRoot.ShopProduct && shopRoot.ShopProduct[0] && shopRoot.ShopProduct[0].Product) || []
  const tabMap = new Map()
  for (const tab of tabs) {
    const a = tab.$ || {}
    tabMap.set(`${a.ShopName}:${a.TabId}`, a)
  }
  const shopNpc = new Map()
  for (const info of infos) {
    const a = info.$ || {}
    if (a.ShopName && a.NpcName) shopNpc.set(a.ShopName, a.NpcName)
  }
  const npcTranslations = loadTranslation('npcinfo.china.txt', 'npcinfo')
  const npcData = await readXml('npcinfo.xml')
  const npcNames = new Map()
  const npcList = npcData && npcData.NpcInfoList && Array.isArray(npcData.NpcInfoList.NpcInfo)
    ? npcData.NpcInfoList.NpcInfo
    : (npcData && npcData.NpcInfo && npcData.NpcInfo.NpcInfoList
      ? npcData.NpcInfo.NpcInfoList[0].NpcInfo || []
      : [])
  for (const npc of npcList) {
    const a = npc.$ || {}
    const name = npcTranslations[a.LocalName] || a.GeneralName || a.ID
    if (a.GeneralName) npcNames.set(a.GeneralName, name)
  }
  for (const product of products) {
    const a = product.$ || {}
    const id = parseInt(a.ProductId, 10)
    if (!id || a.ProductType !== 'item') continue
    // R142 商品记录使用 ShopId 关联商店，旧版有些记录使用 ShopName。
    const productShop = a.ShopId || a.ShopName || ''
    const tab = tabMap.get(`${productShop}:${a.TabId}`) || tabMap.get(`${a.ShopName || ''}:${a.TabId}`)
    const shopName = tab && tab.ShopName ? tab.ShopName : productShop
    const npcCode = shopNpc.get(shopName) || ''
    const npcName = npcNames.get(npcCode) || npcCode
    const isExchange = a.PriceType && a.PriceType !== 'gold'
    const source = {
      kind: isExchange ? 'npc_exchange' : 'npc_shop',
      label: `${isExchange ? 'NPC兑换' : 'NPC购买'}：${npcName || shopName || `商店Tab ${a.TabId || '?'}`}`,
      shopName,
      npcName,
      tabId: parseInt(a.TabId, 10) || 0,
      bundle: parseInt(a.Bundle, 10) || 1,
      priceType: a.PriceType || '',
      price: parseInt(a.Price, 10) || 0,
      priceValue: parseInt(a.PriceValue, 10) || 0,
      condition: tab && tab.Condition ? tab.Condition : '',
      event: tab && tab.BasicEvent ? tab.BasicEvent : '',
    }
    addSource(index, id, source)
  }
}

const loadDungeonSources = async index => {
  const data = await readXml('DungeonGuide.xml')
  const dungeons = data && data.DungeonList && Array.isArray(data.DungeonList.Dungeon)
    ? data.DungeonList.Dungeon
    : []
  if (!dungeons.length) return
  const translations = loadIndexedTranslation('dungeonguide.china.txt')
  const seenDungeons = new Set()
  for (const dungeon of dungeons) {
    const a = dungeon.$ || {}
    if (!isChinaLocale(a.__locale)) continue
    const key = [a.ID, a.DungeonID, a.LocalName, a.LocalDifficulty, a.MainReward, a.DefinitiveReward].join('|')
    if (seenDungeons.has(key)) continue
    seenDungeons.add(key)
    const dungeonName = translations.get(localizedIndex(a.LocalName)) || a.DungeonID || `地下城${a.ID || ''}`
    const difficulty = translations.get(localizedIndex(a.LocalDifficulty)) || ''
    const prefix = `地下城：${dungeonName}${difficulty ? `（${difficulty}）` : ''}`
    for (const id of parseDungeonRewardIds(a.MainReward)) {
      addSource(index, id, {
        kind: 'dungeon_reward',
        label: `${prefix}·主要奖励`,
        dungeonId: a.DungeonID || '',
        guideId: parseInt(a.ID, 10) || 0,
        rewardType: 'main',
      })
    }
    for (const entry of String(a.DefinitiveReward || '').split(';')) {
      const idMatch = entry.match(/(?:^|\s)(?:id|manual):(\d+)/)
      if (!idMatch) continue
      const id = parseInt(idMatch[1], 10)
      const milestone = entry.match(/,(\d+)\s*$/)
      addSource(index, id, {
        kind: 'dungeon_reward',
        label: `${prefix}·进度奖励${milestone ? `（${milestone[1]}）` : ''}`,
        dungeonId: a.DungeonID || '',
        guideId: parseInt(a.ID, 10) || 0,
        rewardType: 'definitive',
        milestone: milestone ? parseInt(milestone[1], 10) : 0,
      })
    }
  }
}

const loadItemSources = async () => {
  const index = new Map()
  await loadCollectingSources(index)
  await loadNpcSources(index)
  await loadDungeonSources(index)
  return index
}

const serializeItemSources = sourceMap => [...sourceMap].map(([id, sources]) => [id, sources])

const buildItemSourcesFromCache = entries => {
  const map = new Map()
  for (const [id, sources] of entries || []) map.set(Number(id), sources || [])
  return map
}

module.exports = {
  loadItemSources,
  serializeItemSources,
  buildItemSourcesFromCache,
}
