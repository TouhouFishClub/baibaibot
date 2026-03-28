const fs = require('fs')
const path = require('path')
const xml2js = require('xml2js')

const parser = new xml2js.Parser()

/**
 * 解析 featureschecklist.xml 中 <china> 段：同一 ItemID 可能对应多条 itemInfo（不同 feature）。
 * @returns {Promise<Map<number, Set<string>>>}
 */
const loadChinaFeaturesByItemId = async (dataItDir) => {
  const map = new Map()
  const filePath = path.join(dataItDir, 'featureschecklist.xml')
  if (!fs.existsSync(filePath)) return map

  const file = fs.readFileSync(filePath, 'utf-16le')
  const result = await new Promise((resolve, reject) => {
    parser.parseString(file, (err, res) => {
      if (err) reject(err)
      else resolve(res)
    })
  })
  const root = result && result.FeaturesCheckList
  if (!root || !root.china) return map

  const chinaBlock = root.china
  const blocks = Array.isArray(chinaBlock) ? chinaBlock : [chinaBlock]

  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b]
    if (!block || !block.itemInfo) continue
    const infos = block.itemInfo
    const list = Array.isArray(infos) ? infos : [infos]
    for (let i = 0; i < list.length; i++) {
      const attrs = list[i].$ || list[i]
      if (!attrs) continue
      const id = parseInt(attrs.ItemID, 10)
      const feature = attrs.feature
      if (!id || !feature) continue
      if (!map.has(id)) map.set(id, new Set())
      map.get(id).add(feature)
    }
  }

  return map
}

/**
 * 同 ID 多条 Mabi_Item：先按国服 feature 清单匹配 feature 属性；否则优先无 feature 的基础行；仍多条则后者覆盖前者。
 * @param {Array<{ $: object }>} sameIdNodes xml2js 节点列表（同文件内顺序）
 * @param {Set<string>|undefined} chinaFeatureSet 该国清单中该 ItemID 对应的 feature 集合
 */
const pickMabiItemAmongDuplicates = (sameIdNodes, chinaFeatureSet) => {
  if (!sameIdNodes || sameIdNodes.length === 0) return null
  if (sameIdNodes.length === 1) return sameIdNodes[0]

  if (chinaFeatureSet && chinaFeatureSet.size > 0) {
    const matching = []
    for (let i = 0; i < sameIdNodes.length; i++) {
      const f = sameIdNodes[i].$ && sameIdNodes[i].$.feature
      if (f && chinaFeatureSet.has(f)) matching.push(sameIdNodes[i])
    }
    if (matching.length > 0) return matching[matching.length - 1]
  }

  const noFeature = []
  for (let i = 0; i < sameIdNodes.length; i++) {
    const f = sameIdNodes[i].$ && sameIdNodes[i].$.feature
    if (!f) noFeature.push(sameIdNodes[i])
  }
  if (noFeature.length > 0) return noFeature[noFeature.length - 1]

  return sameIdNodes[sameIdNodes.length - 1]
}

module.exports = {
  loadChinaFeaturesByItemId,
  pickMabiItemAmongDuplicates,
}
