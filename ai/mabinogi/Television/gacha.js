const fs = require("fs-extra");
const path = require("path-extra");
const mysql = require('mysql2')
const {render} = require('./render')
const { IMAGE_DATA } = require('../../../baibaiConfigs')

const { MongoClient } = require('mongodb')
const { mongourl } = require('../../../baibaiConfigs')

let mysqlPool, mgoClient

const createMysqlPool = async () => {
  const pool = mysql.createPool(Object.assign(
    {
      connectionLimit: 10,
      database: 'draw_reward_records'
    },
    fs.readJsonSync(path.join(__dirname, '.secret.json'))
  ))
  mysqlPool = pool.promise();
}

const checkLink = async () => {
  if(!mysqlPool) {
    await createMysqlPool()
  }
  if(!mgoClient) {
    try {
      mgoClient = await MongoClient.connect(mongourl)
    } catch (e) {
      console.log('MONGO ERROR FOR NEW MBTV MODULE!!')
      console.log(e)
    }
  }
}

const help = callback => {
  callback('这是帮助')
}

const syncToMongoDB = async (records, tableName) => {
  if (!records || records.length === 0) {
    console.log('没有抽蛋数据需要同步到MongoDB')
    return
  }

  try {
    const mongoDb = mgoClient.db('db_bot')
    const collection = mongoDb.collection(tableName)
    
    console.log(`开始同步 ${records.length} 条抽蛋记录到 MongoDB 集合: ${tableName}`)
    
    // 批量更新，使用upsert确保数据同步
    const bulkOps = records.map(record => ({
      replaceOne: {
        filter: { id: record.id },
        replacement: {
          id: record.id,
          data_time: record.data_time,
          character_name: record.character_name,
          item_name: record.item_name,
          draw_pool: record.draw_pool,
          sync_time: new Date() // 添加同步时间戳
        },
        upsert: true
      }
    }))
    
    const result = await collection.bulkWrite(bulkOps)
    console.log(`抽蛋MongoDB同步完成: 
      - 插入: ${result.insertedCount} 条
      - 更新: ${result.modifiedCount} 条
      - 匹配: ${result.matchedCount} 条`)
      
  } catch (error) {
    console.error('抽蛋MongoDB同步失败:', error)
    // 同步失败不影响主要功能，只记录错误
  }
}

const fullSyncToMongoDB = async (tableName) => {
  try {
    console.log(`开始全量同步抽蛋表: ${tableName}`)
    
    // 查询全部数据
    const query = `SELECT * FROM ${tableName} ORDER BY data_time DESC`
    const [allRecords] = await mysqlPool.query(query)
    
    if (!allRecords || allRecords.length === 0) {
      console.log('MySQL抽蛋表中没有数据需要同步')
      return { success: true, message: 'MySQL抽蛋表中没有数据', count: 0 }
    }

    const mongoDb = mgoClient.db('db_bot')
    const collection = mongoDb.collection(tableName)
    
    console.log(`准备同步 ${allRecords.length} 条抽蛋记录到 MongoDB`)
    
    // 分批处理大量数据，避免内存问题
    const batchSize = 1000
    let totalInserted = 0
    let totalModified = 0
    let totalMatched = 0
    
    for (let i = 0; i < allRecords.length; i += batchSize) {
      const batch = allRecords.slice(i, i + batchSize)
      
      const bulkOps = batch.map(record => ({
        replaceOne: {
          filter: { id: record.id },
          replacement: {
            id: record.id,
            data_time: record.data_time,
            character_name: record.character_name,
            item_name: record.item_name,
            draw_pool: record.draw_pool,
            sync_time: new Date()
          },
          upsert: true
        }
      }))
      
      const result = await collection.bulkWrite(bulkOps)
      totalInserted += result.insertedCount
      totalModified += result.modifiedCount
      totalMatched += result.matchedCount
      
      console.log(`抽蛋批次 ${Math.floor(i/batchSize) + 1}: 处理了 ${batch.length} 条记录`)
    }
    
    const message = `抽蛋全量同步完成!\n总计: ${allRecords.length} 条记录\n插入: ${totalInserted} 条\n更新: ${totalModified} 条\n匹配: ${totalMatched} 条`
    console.log(message)
    
    return { 
      success: true, 
      message, 
      count: allRecords.length,
      inserted: totalInserted,
      modified: totalModified,
      matched: totalMatched
    }
    
  } catch (error) {
    const errorMsg = `抽蛋全量同步失败: ${error.message}`
    console.error(errorMsg)
    return { success: false, message: errorMsg, count: 0 }
  }
}

const syncByIdToMongoDB = async (tableName, recordId) => {
  try {
    console.log(`开始同步抽蛋表 ${tableName} 中ID为 ${recordId} 的记录`)
    
    // 查询指定ID的数据
    const query = `SELECT * FROM ${tableName} WHERE id = ?`
    const [records] = await mysqlPool.query(query, [recordId])
    
    if (!records || records.length === 0) {
      console.log(`MySQL抽蛋表 ${tableName} 中没有找到ID为 ${recordId} 的记录`)
      return { success: true, message: `未找到ID为 ${recordId} 的抽蛋记录`, count: 0 }
    }

    const record = records[0]
    const mongoDb = mgoClient.db('db_bot')
    const collection = mongoDb.collection(tableName)
    
    console.log(`准备同步抽蛋记录: ID=${record.id}, 角色=${record.character_name}, 物品=${record.item_name}`)
    
    // 同步单条记录
    const result = await collection.replaceOne(
      { id: record.id },
      {
        id: record.id,
        data_time: record.data_time,
        character_name: record.character_name,
        item_name: record.item_name,
        draw_pool: record.draw_pool,
        sync_time: new Date()
      },
      { upsert: true }
    )
    
    let message
    if (result.upsertedCount > 0) {
      message = `抽蛋ID ${recordId} 记录同步完成 (新增)\n角色: ${record.character_name}\n物品: ${record.item_name}\n手帕: ${record.draw_pool}\n时间: ${record.data_time}`
    } else if (result.modifiedCount > 0) {
      message = `抽蛋ID ${recordId} 记录同步完成 (更新)\n角色: ${record.character_name}\n物品: ${record.item_name}\n手帕: ${record.draw_pool}\n时间: ${record.data_time}`
    } else {
      message = `抽蛋ID ${recordId} 记录已存在且无变化\n角色: ${record.character_name}\n物品: ${record.item_name}\n手帕: ${record.draw_pool}\n时间: ${record.data_time}`
    }
    
    console.log(`抽蛋ID同步完成: ${message}`)
    
    return { 
      success: true, 
      message,
      count: 1,
      record: record
    }
    
  } catch (error) {
    const errorMsg = `抽蛋ID ${recordId} 同步失败: ${error.message}`
    console.error(errorMsg)
    return { success: false, message: errorMsg, count: 0 }
  }
}

const syncMissingIdsToMongoDB = async (tableName) => {
  try {
    console.log(`开始检查抽蛋表 ${tableName} 中的缺失ID`)
    
    // 获取MySQL中的ID范围
    const [minMaxResult] = await mysqlPool.query(`SELECT MIN(id) as min_id, MAX(id) as max_id FROM ${tableName}`)
    const { min_id, max_id } = minMaxResult[0]
    
    if (!min_id || !max_id) {
      return { success: true, message: 'MySQL抽蛋表中没有数据', count: 0 }
    }
    
    console.log(`抽蛋MySQL ID范围: ${min_id} - ${max_id}`)
    
    const mongoDb = mgoClient.db('db_bot')
    const collection = mongoDb.collection(tableName)
    
    // 获取MongoDB中已存在的ID列表
    const existingIds = await collection.distinct('id')
    const existingIdSet = new Set(existingIds.map(id => parseInt(id)))
    
    console.log(`抽蛋MongoDB中已有 ${existingIds.length} 条记录`)
    
    // 找出缺失的ID
    const missingIds = []
    for (let id = min_id; id <= max_id; id++) {
      if (!existingIdSet.has(id)) {
        missingIds.push(id)
      }
    }
    
    if (missingIds.length === 0) {
      return { 
        success: true, 
        message: `未发现缺失的抽蛋ID，MongoDB数据完整\nID范围: ${min_id} - ${max_id}`, 
        count: 0 
      }
    }
    
    console.log(`发现 ${missingIds.length} 个缺失的抽蛋ID: ${missingIds.slice(0, 10).join(', ')}${missingIds.length > 10 ? '...' : ''}`)
    
    // 限制一次同步的数量，避免过载
    const syncLimit = 100
    const idsToSync = missingIds.slice(0, syncLimit)
    
    // 批量查询缺失的记录
    const placeholders = idsToSync.map(() => '?').join(',')
    const query = `SELECT * FROM ${tableName} WHERE id IN (${placeholders}) ORDER BY id`
    const [missingRecords] = await mysqlPool.query(query, idsToSync)
    
    if (!missingRecords || missingRecords.length === 0) {
      return { 
        success: true, 
        message: `缺失的抽蛋ID在MySQL中也不存在\n缺失ID: ${idsToSync.join(', ')}`, 
        count: 0 
      }
    }
    
    console.log(`从MySQL中找到 ${missingRecords.length} 条缺失的抽蛋记录，开始同步`)
    
    // 批量同步缺失的记录
    const bulkOps = missingRecords.map(record => ({
      replaceOne: {
        filter: { id: record.id },
        replacement: {
          id: record.id,
          data_time: record.data_time,
          character_name: record.character_name,
          item_name: record.item_name,
          draw_pool: record.draw_pool,
          sync_time: new Date()
        },
        upsert: true
      }
    }))
    
    const result = await collection.bulkWrite(bulkOps)
    
    let message = `抽蛋缺失ID同步完成!\n`
    message += `总缺失: ${missingIds.length} 个ID\n`
    message += `本次同步: ${missingRecords.length} 条记录\n`
    message += `插入: ${result.insertedCount} 条\n`
    message += `更新: ${result.modifiedCount} 条\n`
    
    if (missingIds.length > syncLimit) {
      message += `\n⚠️ 还有 ${missingIds.length - syncLimit} 个缺失抽蛋ID未同步\n请再次执行命令继续同步`
    }
    
    // 添加一些具体的同步记录示例
    const syncedIds = missingRecords.slice(0, 5).map(r => r.id).join(', ')
    message += `\n同步的抽蛋ID示例: ${syncedIds}${missingRecords.length > 5 ? '...' : ''}`
    
    console.log(message)
    
    return { 
      success: true, 
      message,
      count: missingRecords.length,
      totalMissing: missingIds.length,
      syncedIds: missingRecords.map(r => r.id)
    }
    
  } catch (error) {
    const errorMsg = `抽蛋缺失ID同步失败: ${error.message}`
    console.error(errorMsg)
    return { success: false, message: errorMsg, count: 0 }
  }
}

const searchFromMongoDB = async (tableName, whereClause, queryParams, limit) => {
  try {
    console.log(`开始从 MongoDB 搜索抽蛋: ${tableName}`)
    
    const mongoDb = mgoClient.db('db_bot')
    const collection = mongoDb.collection(tableName)
    
    // 构建MongoDB查询条件
    let mongoQuery = {}
    
    // 解析SQL WHERE子句并转换为MongoDB查询
    if (whereClause && queryParams && queryParams.length > 0) {
      const whereStr = whereClause.replace(/^WHERE\s*/i, '')
      
      if (queryParams.length === 1) {
        // 单个参数，可能是item_name或character_name的模糊查询
        const searchTerm = queryParams[0].replace(/%/g, '')
        mongoQuery = {
          $or: [
            { item_name: new RegExp(searchTerm, 'i') },
            { character_name: new RegExp(searchTerm, 'i') }
          ]
        }
      } else if (queryParams.length === 2 && whereStr.includes('OR')) {
        // 两个参数的OR查询
        const searchTerm = queryParams[0].replace(/%/g, '')
        mongoQuery = {
          $or: [
            { item_name: new RegExp(searchTerm, 'i') },
            { character_name: new RegExp(searchTerm, 'i') }
          ]
        }
      } else {
        // 多个参数的AND查询 (通过-分隔的查询)
        mongoQuery = {}
        queryParams.forEach((param, index) => {
          if (param) {
            const searchTerm = param.replace(/%/g, '')
            if (index === 0) {
              mongoQuery.item_name = new RegExp(searchTerm, 'i')
            } else if (index === 1) {
              mongoQuery.character_name = new RegExp(searchTerm, 'i')
            } else if (index === 2) {
              mongoQuery.draw_pool = new RegExp(searchTerm, 'i')
            }
          }
        })
      }
    }
    
    console.log(`抽蛋MongoDB查询条件: ${JSON.stringify(mongoQuery)}`)
    
    // 执行查询
    const results = await collection
      .find(mongoQuery)
      .sort({ data_time: -1 })
      .limit(limit || 20)
      .toArray()
    
    console.log(`抽蛋MongoDB搜索结果: ${results.length} 条记录`)
    
    return results
    
  } catch (error) {
    console.error(`抽蛋MongoDB搜索失败: ${error.message}`)
    return []
  }
}

const mergeSearchResults = (mysqlResults, mongoResults) => {
  try {
    console.log(`开始合并抽蛋搜索结果: MySQL ${mysqlResults.length} 条, MongoDB ${mongoResults.length} 条`)
    
    // 使用Map去重，以ID为键
    const resultMap = new Map()
    
    // 先添加MySQL结果
    mysqlResults.forEach(record => {
      resultMap.set(record.id, {
        ...record,
        source: 'mysql'
      })
    })
    
    // 再添加MongoDB结果，如果ID已存在则跳过，避免重复
    mongoResults.forEach(record => {
      if (!resultMap.has(record.id)) {
        resultMap.set(record.id, {
          ...record,
          source: 'mongodb'
        })
      } else {
        // 如果MySQL中已有该记录，标记为双源
        const existingRecord = resultMap.get(record.id)
        existingRecord.source = 'both'
      }
    })
    
    // 转换为数组并按时间排序
    const mergedResults = Array.from(resultMap.values())
      .sort((a, b) => new Date(b.data_time) - new Date(a.data_time))
    
    console.log(`抽蛋合并完成: 总计 ${mergedResults.length} 条记录`)
    console.log(`抽蛋数据源分布: MySQL独有: ${mergedResults.filter(r => r.source === 'mysql').length}, MongoDB独有: ${mergedResults.filter(r => r.source === 'mongodb').length}, 双源: ${mergedResults.filter(r => r.source === 'both').length}`)
    
    return mergedResults
    
  } catch (error) {
    console.error(`合并抽蛋搜索结果失败: ${error.message}`)
    return mysqlResults // 如果合并失败，返回MySQL结果
  }
}

const formatTime = ts => {
  let d = new Date(ts)
  return `${d.getFullYear()}-${addZero(d.getMonth() + 1)}-${addZero(d.getDate())} ${addZero(d.getHours())}:${addZero(d.getMinutes())}:${addZero(d.getSeconds())}`
}
const addZero = n => n < 10 ? ('0' + n) : n

const mabiGachaTv = async (content, qq, callback) => {
  // if(!content.trim().length) {
  //   help(callback)
  //   return
  // }
  await checkLink()
  
  // 管理员抽蛋同步功能 - 需要在服务器选择逻辑之前检查
  if (qq === 799018865) {
    const trimmedContent = content.trim()
    
    // 全量同步猫服抽蛋
    if (trimmedContent === '同步猫服') {
      console.log(`管理员 ${qq} 执行猫服抽蛋全量同步操作`)
      
      const ylxResult = await fullSyncToMongoDB('mabi_draw_reward_records')
      
      let responseMessage = `🔄 管理员猫服抽蛋同步报告:\n\n`
      responseMessage += `📊 猫服 (ylx):\n${ylxResult.message}`
      
      if (!ylxResult.success) {
        responseMessage += `\n\n⚠️ 同步失败，请检查日志`
      }
      
      callback(responseMessage)
      return
    }
    
    // 全量同步亚特抽蛋
    if (trimmedContent === '同步亚特') {
      console.log(`管理员 ${qq} 执行亚特抽蛋全量同步操作`)
      
      const yateResult = await fullSyncToMongoDB('mabi_draw_reward_records_yate')
      
      let responseMessage = `🔄 管理员亚特抽蛋同步报告:\n\n`
      responseMessage += `📊 亚特 (yate):\n${yateResult.message}`
      
      if (!yateResult.success) {
        responseMessage += `\n\n⚠️ 同步失败，请检查日志`
      }
      
      callback(responseMessage)
      return
    }
    
    // 按ID同步猫服抽蛋特定记录
    const catIdMatch = trimmedContent.match(/^同步猫服(\d+)$/)
    if (catIdMatch) {
      const recordId = catIdMatch[1]
      console.log(`管理员 ${qq} 执行猫服抽蛋ID ${recordId} 同步操作`)
      
      const result = await syncByIdToMongoDB('mabi_draw_reward_records', recordId)
      
      let responseMessage = `🔍 管理员猫服抽蛋ID同步报告:\n\n`
      responseMessage += `📊 猫服 (ylx) - ID ${recordId}:\n${result.message}`
      
      if (!result.success) {
        responseMessage += `\n\n⚠️ 同步失败，请检查日志`
      }
      
      callback(responseMessage)
      return
    }
    
    // 按ID同步亚特抽蛋特定记录
    const yateIdMatch = trimmedContent.match(/^同步亚特(\d+)$/)
    if (yateIdMatch) {
      const recordId = yateIdMatch[1]
      console.log(`管理员 ${qq} 执行亚特抽蛋ID ${recordId} 同步操作`)
      
      const result = await syncByIdToMongoDB('mabi_draw_reward_records_yate', recordId)
      
      let responseMessage = `🔍 管理员亚特抽蛋ID同步报告:\n\n`
      responseMessage += `📊 亚特 (yate) - ID ${recordId}:\n${result.message}`
      
      if (!result.success) {
        responseMessage += `\n\n⚠️ 同步失败，请检查日志`
      }
      
      callback(responseMessage)
      return
    }
    
    // 同步猫服抽蛋缺失记录
    if (trimmedContent === '同步猫服缺失') {
      console.log(`管理员 ${qq} 执行猫服抽蛋缺失ID同步操作`)
      
      const result = await syncMissingIdsToMongoDB('mabi_draw_reward_records')
      
      let responseMessage = `🔍 管理员猫服抽蛋缺失ID同步报告:\n\n`
      responseMessage += `📊 猫服 (ylx) - 缺失ID检查:\n${result.message}`
      
      if (!result.success) {
        responseMessage += `\n\n⚠️ 同步失败，请检查日志`
      }
      
      callback(responseMessage)
      return
    }
    
    // 同步亚特抽蛋缺失记录
    if (trimmedContent === '同步亚特缺失') {
      console.log(`管理员 ${qq} 执行亚特抽蛋缺失ID同步操作`)
      
      const result = await syncMissingIdsToMongoDB('mabi_draw_reward_records_yate')
      
      let responseMessage = `🔍 管理员亚特抽蛋缺失ID同步报告:\n\n`
      responseMessage += `📊 亚特 (yate) - 缺失ID检查:\n${result.message}`
      
      if (!result.success) {
        responseMessage += `\n\n⚠️ 同步失败，请检查日志`
      }
      
      callback(responseMessage)
      return
    }
  }
  
  const svc = mgoClient.db('db_bot').collection('cl_mabinogi_user_server')

  let sv = Object.entries({
    'ylx': 'ylx',
    '伊鲁夏': 'ylx',
    '猫服': 'ylx',
    'yt': 'yate',
    '亚特': 'yate',
  }).find(([key]) => content.startsWith(key))

  if(sv) {
    content = content.substring(sv[0].length).trim()
    sv = sv[1]
    await svc.save({_id: qq, sv})
  } else {
    const svInfo = await svc.findOne({_id: qq})
    if(svInfo) {
      sv = svInfo.sv
    } else {
      await svc.save({_id: qq, sv: 'ylx'})
      sv = 'ylx'
    }
  }
  if(content.length > 20 || content.toLowerCase() === 'help' || content === '帮助') {
    help(callback)
    return
  }

  let table = {
    'ylx': 'mabi_draw_reward_records',
    'yate': 'mabi_draw_reward_records_yate'
  }[sv]
  const filter = content.trim()
  const limit = 20
  let queryParams = [];
  let whereClause = '';

  if(filter.length) {
    if(filter.indexOf('-') > -1) {
      let sp = filter.split('-')
      let [itemFilter, nameFilter, poolFilter] = sp
      if (itemFilter || nameFilter || poolFilter) {
        whereClause = `WHERE${sp.map((x, i) => x && [' item_name LIKE ?', ' character_name LIKE ?', ' draw_pool LIKE ?'][i]).filter(x => x).join(' AND')}`
        queryParams = sp.map(x => x && `%${x}%`).filter(x => x)
      }
    } else {
      whereClause = `WHERE item_name LIKE ? OR character_name LIKE ?`;
      queryParams = [`%${filter}%`, `%${filter}%`];
    }
  }
  // select draw_pool, count(*) as total from mabi_draw_reward_records group by draw_pool;

  const base = `
    FROM ${table}
    ${whereClause}
    ORDER BY data_time DESC 
  `
  const totalQuery = `
    SELECT COUNT(*) as total
    ${base}
  `
  const totalRow = await mysqlPool.query(totalQuery, queryParams)
  console.log(`========TOTAL ROW=========\n\n\n
  ${JSON.stringify(totalRow)}
  \n\n\n\n==================`)
  const query =
    `
    SELECT *
    ${base}
    LIMIT ?
    `
  queryParams.push(limit)
  const [row, fields] = await mysqlPool.query(query, queryParams)

  // 同步MySQL抽蛋搜索结果到MongoDB
  await syncToMongoDB(row, table)
  
  // 从MongoDB搜索相同条件的抽蛋数据
  console.log(`========MONGODB抽蛋搜索=========`)
  const mongoResults = await searchFromMongoDB(table, whereClause, queryParams.slice(0, -1), limit) // 移除最后的limit参数
  console.log(`MongoDB抽蛋搜索完成: ${mongoResults.length} records`)
  console.log(`==================`)
  
  // 合并MySQL和MongoDB的抽蛋搜索结果
  console.log(`========合并抽蛋结果=========`)
  const mergedResults = mergeSearchResults(row, mongoResults)
  console.log(`合并抽蛋结果: ${mergedResults.length} records`)
  console.log(`==================`)
  
  // 使用合并后的结果进行渲染
  const finalResults = mergedResults

  const outputDir = path.join(IMAGE_DATA, 'mabi_other', `MabiGC.png`)
  
  // 更新总数统计，包含合并后的抽蛋数据
  const totalMergedCount = mergedResults.length
  const mysqlOnlyCount = mergedResults.filter(r => r.source === 'mysql').length
  const mongoOnlyCount = mergedResults.filter(r => r.source === 'mongodb').length
  const bothSourceCount = mergedResults.filter(r => r.source === 'both').length
  
  // 构建抽蛋描述信息
  let description = `(MySQL: ${totalRow[0][0].total}, 合并后: ${totalMergedCount})`
  if (mongoOnlyCount > 0) {
    description += ` [MongoDB补充: +${mongoOnlyCount}]`
  }
  
  await render(finalResults, {
    title: `抽蛋查询：${{'ylx': '猫服', 'yate': '亚特'}[sv]}`,
    description: description,
    output: outputDir,
    columns: [
      {
        label: '角色名称',
        key: 'character_name',
      },
      {
        label: '物品名称',
        key: 'item_name',
      },
      {
        label: '时间',
        key: 'data_time',
        format: time => formatTime(new Date(time).getTime())
      },
      {
        label: '手帕名称',
        key: 'draw_pool',
      },
    ]
  })

  console.log(`保存MabiGC.png成功！`)
  let imgMsg = `[CQ:image,file=${path.join('send', 'mabi_other', `MabiGC.png`)}]`
  callback(imgMsg)
}

module.exports = {
  mabiGachaTv
}