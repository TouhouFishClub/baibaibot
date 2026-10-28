// 去掉 cl_mabinogi_gacha_info 的 _id / alias 首尾空格。
// _id 不能原地修改：无同名文档时改用去掉空格的 _id 新建，再删除旧文档；
// 已有同名文档时合并 info 后删除带空格的文档。
// 默认仅扫描；传入 yes 或 --yes 后才写入，脚本可重复执行。
const { getClient } = require('../mongo/index')

function canonicalAlias (itemName) {
  return String(itemName || '').trim().replace(/[()（）]/g, '')
}

function infoKey (item) {
  return [item.pool, item.rare, item.color, item.rareTag].join('\u0000')
}

function uniqueInfo (info) {
  const seen = new Set()
  const repaired = []
  for (const item of Array.isArray(info) ? info : []) {
    if (!item) continue
    const key = infoKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    repaired.push(item)
  }
  return repaired
}

function repairedAlias (base, sources, trimmedId) {
  const raw = base && base.alias != null
    ? String(base.alias)
    : (sources[0] && sources[0].alias != null ? String(sources[0].alias) : '')
  return raw.trim() || canonicalAlias(trimmedId)
}

function planGachaInfoSpaceGroup (trimmedId, malformedDocs, existingCleanDoc) {
  trimmedId = String(trimmedId || '').trim()
  if (!trimmedId) return { action: 'skip' }
  const docs = Array.isArray(malformedDocs) ? malformedDocs : []
  const baseInGroup = docs.find(doc => doc && String(doc._id) === trimmedId) || null
  const base = baseInGroup || existingCleanDoc || null
  const sources = docs.filter(doc => doc && String(doc._id) !== trimmedId)
  const alias = repairedAlias(base, sources, trimmedId)
  const info = uniqueInfo([].concat(base && base.info || [], ...sources.map(doc => doc.info || [])))
  if (!sources.length) {
    if (!base || String(base.alias || '') === alias) return { action: 'skip' }
    return { action: 'update-alias', _id: trimmedId, alias }
  }
  if (!base) {
    return {
      action: 'rename',
      sourceIds: sources.map(doc => doc._id),
      destinationId: trimmedId,
      alias,
      info,
      doc: Object.assign({}, sources[0], { _id: trimmedId, alias, info })
    }
  }
  return {
    action: 'merge',
    sourceIds: sources.map(doc => doc._id),
    destinationId: trimmedId,
    alias,
    info
  }
}

function parseWriteFlag () {
  return process.argv.slice(2).some(arg => /^(yes|--yes)$/i.test(arg))
}

async function main () {
  const write = parseWriteFlag()
  const client = await getClient()
  if (!client) throw new Error('Unable to connect to MongoDB')

  const gachaCol = client.db('db_bot').collection('cl_mabinogi_gacha_info')
  const groups = new Map()

  try {
    const cursor = gachaCol.find({
      $or: [
        { _id: { $regex: /^\s|\s$/ } },
        { alias: { $regex: /^\s|\s$/ } }
      ]
    })
    while (await cursor.hasNext()) {
      const doc = await cursor.next()
      const trimmedId = String(doc._id || '').trim()
      if (!groups.has(trimmedId)) groups.set(trimmedId, [])
      groups.get(trimmedId).push(doc)
    }

    const plans = []
    for (const [trimmedId, docs] of groups) {
      const hasCleanId = docs.some(doc => String(doc._id) === trimmedId)
      const existingCleanDoc = hasCleanId ? null : await gachaCol.findOne({ _id: trimmedId })
      const plan = planGachaInfoSpaceGroup(trimmedId, docs, existingCleanDoc)
      if (plan.action !== 'skip') plans.push(plan)
    }

    console.log(`Mode: ${write ? 'write' : 'scan only'}`)
    console.log(`Documents with edge whitespace: ${[...groups.values()].reduce((sum, docs) => sum + docs.length, 0)}`)
    console.log(`Repair groups: ${plans.length}`)
    for (const plan of plans) {
      if (plan.action === 'update-alias') {
        console.log(`  update alias ${JSON.stringify(plan._id)}`)
      } else {
        console.log(
          `  ${plan.action} ${plan.sourceIds.map(id => JSON.stringify(id)).join(', ')} -> ${JSON.stringify(plan.destinationId)}`
        )
      }
    }

    if (!write) {
      console.log('No data was changed. Run with "yes" to apply these repairs.')
      return
    }

    let renamed = 0
    let merged = 0
    let aliases = 0
    for (const plan of plans) {
      if (plan.action === 'update-alias') {
        await gachaCol.updateOne({ _id: plan._id }, { $set: { alias: plan.alias } })
        aliases++
        continue
      }
      if (plan.action === 'rename') {
        await gachaCol.save(plan.doc)
        renamed++
      } else {
        await gachaCol.updateOne(
          { _id: plan.destinationId },
          { $set: { alias: plan.alias, info: plan.info } }
        )
        merged++
      }
      for (const sourceId of plan.sourceIds) {
        await gachaCol.remove({ _id: sourceId })
      }
    }

    console.log(`Renamed documents: ${renamed}`)
    console.log(`Merged documents: ${merged}`)
    console.log(`Updated aliases: ${aliases}`)
  } finally {
    await client.close()
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}

module.exports = {
  canonicalAlias,
  planGachaInfoSpaceGroup,
  uniqueInfo
}
