const fs = require("fs-extra");
const path = require("path-extra");
const mysql = require('mysql2')
const {render} = require('./render')
const { IMAGE_DATA } = require('../../../baibaiConfigs')

const { searchNameAndFilter } = require('../optionset')

const { MongoClient } = require('mongodb')
const { mongourl } = require('../../../baibaiConfigs')

let mysqlPool, mgoClient

const createMysqlPool = async () => {
  const pool = mysql.createPool(Object.assign(
    {
      connectionLimit: 10,
      database: 'dungeon_reward_records'
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

const createSearchRegexp = async filterStr => {
  // console.log(`===> ${filterStr}`)
  const scrolls = [
    '渴望的',
    '盼望的',
    '期盼的',
    '沉没的',
    '消失的',
    '被覆盖的',
    '逃跑的',
    '观望的$',
    '转的',
    '囚禁',
    '不动之',
    '冻结的',
    '兔猿人',
    '极地骷髅战士',
    '极地冰狼',
    '踪迹',
    '轨迹',
    '痕迹',
    '符文猫',
    '斯内塔',
    '冰雪索灵',
    '白桦树',
    '波纹',
    '镜子'
  ]
  const filter = filterStr.trim().substring(1, filterStr.length - 1)
  // console.log(`===> ${filter}`)
  if(filter) {
    let f = await searchNameAndFilter(new Set(scrolls), filter)
    console.log(`===> ${f}`)
    if(f.length) {
      return f.map(x => `${x}$`).join('|')
    } else {
      return scrolls.map(x => `${x}$`).join('|')
    }
  } else {
    return scrolls.map(x => `${x}$`).join('|')
  }
}

const formatTime = ts => {
  let d = new Date(ts)
  return `${d.getFullYear()}-${addZero(d.getMonth() + 1)}-${addZero(d.getDate())} ${addZero(d.getHours())}:${addZero(d.getMinutes())}:${addZero(d.getSeconds())}`
}
const addZero = n => n < 10 ? ('0' + n) : n

const syncToMongoDB = async (records, tableName) => {
  if (!records || records.length === 0) {
    console.log('没有数据需要同步到MongoDB')
    return
  }

  try {
    const mongoDb = mgoClient.db('db_bot')
    const collection = mongoDb.collection(tableName)
    
    console.log(`开始同步 ${records.length} 条记录到 MongoDB 集合: ${tableName}`)
    
    // 批量更新，使用upsert确保数据同步
    const bulkOps = records.map(record => ({
      replaceOne: {
        filter: { id: record.id },
        replacement: {
          id: record.id,
          character_name: record.character_name,
          dungeon_name: record.dungeon_name,
          reward: record.reward,
          data_time: record.data_time,
          channel: record.channel,
          legal: record.legal,
          sync_time: new Date() // 添加同步时间戳
        },
        upsert: true
      }
    }))
    
    const result = await collection.bulkWrite(bulkOps)
    console.log(`MongoDB同步完成: 
      - 插入: ${result.insertedCount} 条
      - 更新: ${result.modifiedCount} 条
      - 匹配: ${result.matchedCount} 条`)
      
  } catch (error) {
    console.error('MongoDB同步失败:', error)
    // 同步失败不影响主要功能，只记录错误
  }
}

const fullSyncToMongoDB = async (tableName) => {
  try {
    console.log(`开始全量同步表: ${tableName}`)
    
    // 查询全部数据
    const query = `SELECT * FROM ${tableName} ORDER BY data_time DESC`
    const [allRecords] = await mysqlPool.query(query)
    
    if (!allRecords || allRecords.length === 0) {
      console.log('MySQL表中没有数据需要同步')
      return { success: true, message: 'MySQL表中没有数据', count: 0 }
    }

    const mongoDb = mgoClient.db('db_bot')
    const collection = mongoDb.collection(tableName)
    
    console.log(`准备同步 ${allRecords.length} 条记录到 MongoDB`)
    
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
            character_name: record.character_name,
            dungeon_name: record.dungeon_name,
            reward: record.reward,
            data_time: record.data_time,
            channel: record.channel,
            legal: record.legal,
            sync_time: new Date()
          },
          upsert: true
        }
      }))
      
      const result = await collection.bulkWrite(bulkOps)
      totalInserted += result.insertedCount
      totalModified += result.modifiedCount
      totalMatched += result.matchedCount
      
      console.log(`批次 ${Math.floor(i/batchSize) + 1}: 处理了 ${batch.length} 条记录`)
    }
    
    const message = `全量同步完成!\n总计: ${allRecords.length} 条记录\n插入: ${totalInserted} 条\n更新: ${totalModified} 条\n匹配: ${totalMatched} 条`
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
    const errorMsg = `全量同步失败: ${error.message}`
    console.error(errorMsg)
    return { success: false, message: errorMsg, count: 0 }
  }
}

const syncByIdToMongoDB = async (tableName, recordId) => {
  try {
    console.log(`开始同步表 ${tableName} 中ID为 ${recordId} 的记录`)
    
    // 查询指定ID的数据
    const query = `SELECT * FROM ${tableName} WHERE id = ?`
    const [records] = await mysqlPool.query(query, [recordId])
    
    if (!records || records.length === 0) {
      console.log(`MySQL表 ${tableName} 中没有找到ID为 ${recordId} 的记录`)
      return { success: true, message: `未找到ID为 ${recordId} 的记录`, count: 0 }
    }

    const record = records[0]
    const mongoDb = mgoClient.db('db_bot')
    const collection = mongoDb.collection(tableName)
    
    console.log(`准备同步记录: ID=${record.id}, 角色=${record.character_name}, 奖励=${record.reward}`)
    
    // 同步单条记录
    const result = await collection.replaceOne(
      { id: record.id },
      {
        id: record.id,
        character_name: record.character_name,
        dungeon_name: record.dungeon_name,
        reward: record.reward,
        data_time: record.data_time,
        channel: record.channel,
        legal: record.legal,
        sync_time: new Date()
      },
      { upsert: true }
    )
    
    let message
    if (result.upsertedCount > 0) {
      message = `ID ${recordId} 记录同步完成 (新增)\n角色: ${record.character_name}\n奖励: ${record.reward}\n地下城: ${record.dungeon_name}\n时间: ${record.data_time}`
    } else if (result.modifiedCount > 0) {
      message = `ID ${recordId} 记录同步完成 (更新)\n角色: ${record.character_name}\n奖励: ${record.reward}\n地下城: ${record.dungeon_name}\n时间: ${record.data_time}`
    } else {
      message = `ID ${recordId} 记录已存在且无变化\n角色: ${record.character_name}\n奖励: ${record.reward}\n地下城: ${record.dungeon_name}\n时间: ${record.data_time}`
    }
    
    console.log(`ID同步完成: ${message}`)
    
    return { 
      success: true, 
      message,
      count: 1,
      record: record
    }
    
  } catch (error) {
    const errorMsg = `ID ${recordId} 同步失败: ${error.message}`
    console.error(errorMsg)
    return { success: false, message: errorMsg, count: 0 }
  }
}

const syncMissingIdsToMongoDB = async (tableName) => {
  try {
    console.log(`开始检查表 ${tableName} 中的缺失ID`)
    
    // 获取MySQL中的ID范围
    const [minMaxResult] = await mysqlPool.query(`SELECT MIN(id) as min_id, MAX(id) as max_id FROM ${tableName}`)
    const { min_id, max_id } = minMaxResult[0]
    
    if (!min_id || !max_id) {
      return { success: true, message: 'MySQL表中没有数据', count: 0 }
    }
    
    console.log(`MySQL ID范围: ${min_id} - ${max_id}`)
    
    const mongoDb = mgoClient.db('db_bot')
    const collection = mongoDb.collection(tableName)
    
    // 获取MongoDB中已存在的ID列表
    const existingIds = await collection.distinct('id')
    const existingIdSet = new Set(existingIds.map(id => parseInt(id)))
    
    console.log(`MongoDB中已有 ${existingIds.length} 条记录`)
    
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
        message: `未发现缺失的ID，MongoDB数据完整\nID范围: ${min_id} - ${max_id}`, 
        count: 0 
      }
    }
    
    console.log(`发现 ${missingIds.length} 个缺失的ID: ${missingIds.slice(0, 10).join(', ')}${missingIds.length > 10 ? '...' : ''}`)
    
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
        message: `缺失的ID在MySQL中也不存在\n缺失ID: ${idsToSync.join(', ')}`, 
        count: 0 
      }
    }
    
    console.log(`从MySQL中找到 ${missingRecords.length} 条缺失记录，开始同步`)
    
    // 批量同步缺失的记录
    const bulkOps = missingRecords.map(record => ({
      replaceOne: {
        filter: { id: record.id },
        replacement: {
          id: record.id,
          character_name: record.character_name,
          dungeon_name: record.dungeon_name,
          reward: record.reward,
          data_time: record.data_time,
          channel: record.channel,
          legal: record.legal,
          sync_time: new Date()
        },
        upsert: true
      }
    }))
    
    const result = await collection.bulkWrite(bulkOps)
    
    let message = `缺失ID同步完成!\n`
    message += `总缺失: ${missingIds.length} 个ID\n`
    message += `本次同步: ${missingRecords.length} 条记录\n`
    message += `插入: ${result.insertedCount} 条\n`
    message += `更新: ${result.modifiedCount} 条\n`
    
    if (missingIds.length > syncLimit) {
      message += `\n⚠️ 还有 ${missingIds.length - syncLimit} 个缺失ID未同步\n请再次执行命令继续同步`
    }
    
    // 添加一些具体的同步记录示例
    const syncedIds = missingRecords.slice(0, 5).map(r => r.id).join(', ')
    message += `\n同步的ID示例: ${syncedIds}${missingRecords.length > 5 ? '...' : ''}`
    
    console.log(message)
    
    return { 
      success: true, 
      message,
      count: missingRecords.length,
      totalMissing: missingIds.length,
      syncedIds: missingRecords.map(r => r.id)
    }
    
  } catch (error) {
    const errorMsg = `缺失ID同步失败: ${error.message}`
    console.error(errorMsg)
    return { success: false, message: errorMsg, count: 0 }
  }
}

const searchFromMongoDB = async (tableName, whereClause, queryParams, limit) => {
  try {
    console.log(`开始从 MongoDB 搜索: ${tableName}`)
    console.log(`MongoDB搜索参数: whereClause="${whereClause}", queryParams=${JSON.stringify(queryParams)}, limit=${limit}`)
    
    const mongoDb = mgoClient.db('db_bot')
    const collection = mongoDb.collection(tableName)
    
    // 检查集合中是否有数据
    const totalDocuments = await collection.countDocuments()
    console.log(`MongoDB集合 ${tableName} 总文档数: ${totalDocuments}`)
    
    // 如果集合为空，直接返回
    if (totalDocuments === 0) {
      console.log(`MongoDB集合 ${tableName} 为空，跳过搜索`)
      return { results: [], total: 0 }
    }
    
    // 构建MongoDB查询条件
    let mongoQuery = {}
    
    // 解析SQL WHERE子句并转换为MongoDB查询
    if (whereClause) {
      const whereStr = whereClause.replace(/^WHERE\s*/i, '')
      console.log(`MongoDB WHERE子句解析: "${whereStr}"`)
      
      // 处理不同的查询模式
      if (whereStr.includes('character_name LIKE') && whereStr.includes('channel =') && whereStr.includes('dungeon_name =')) {
        // 芙兰队特殊查询模式
        const namePatterns = ['Fl', '莉丽', '娜兹', 'Sa', '永夜', '温雯', '圣祐', '幽鬼']
        const nameRegex = new RegExp(namePatterns.join('|'), 'i')
        mongoQuery = {
          character_name: nameRegex,
          channel: 10,
          dungeon_name: '格伦贝尔纳'
        }
        
        // 处理时间条件 (20:00-01:00)
        // 这里简化处理，实际可能需要更复杂的时间逻辑
        
        // 处理新卷条件
        if (whereStr.includes('REGEXP')) {
          const rewardRegex = new RegExp('渴望的|盼望的|期盼的|沉没的|消失的|被覆盖的|逃跑的|观望的|转的|囚禁|不动之|冻结的|兔猿人|极地骷髅战士|极地冰狼|踪迹|轨迹|痕迹|符文猫|斯内塔|冰雪索灵|白桦树|波纹|镜子', 'i')
          mongoQuery.reward = rewardRegex
        }
        
        if (whereStr.includes('\\\\+1咒语书')) {
          mongoQuery.reward = new RegExp('\\+1咒语书', 'i')
        }
        
      } else if (whereStr.includes('REGEXP')) {
        // 新卷正则查询
        const rewardRegex = new RegExp('渴望的|盼望的|期盼的|沉没的|消失的|被覆盖的|逃跑的|观望的|转的|囚禁|不动之|冻结的|兔猿人|极地骷髅战士|极地冰狼|踪迹|轨迹|痕迹|符文猫|斯内塔|冰雪索灵|白桦树|波纹|镜子', 'i')
        mongoQuery.reward = rewardRegex
        
      } else if (queryParams && queryParams.length > 0) {
        // 处理LIKE查询
        if (queryParams.length === 1) {
          // 单个参数，可能是reward、character_name或dungeon_name的模糊查询
          const searchTerm = queryParams[0].replace(/%/g, '')
          mongoQuery = {
            $or: [
              { reward: new RegExp(searchTerm, 'i') },
              { character_name: new RegExp(searchTerm, 'i') },
              { dungeon_name: new RegExp(searchTerm, 'i') }
            ]
          }
        } else if (queryParams.length === 3 && whereStr.includes('OR')) {
          // 三个参数的OR查询
          const searchTerm = queryParams[0].replace(/%/g, '')
          mongoQuery = {
            $or: [
              { reward: new RegExp(searchTerm, 'i') },
              { character_name: new RegExp(searchTerm, 'i') },
              { dungeon_name: new RegExp(searchTerm, 'i') }
            ]
          }
        } else {
          // 多个参数的AND查询 (通过-分隔的查询)
          mongoQuery = {}
          queryParams.forEach((param, index) => {
            if (param) {
              const searchTerm = param.replace(/%/g, '')
              if (index === 0) {
                mongoQuery.reward = new RegExp(searchTerm, 'i')
              } else if (index === 1) {
                mongoQuery.character_name = new RegExp(searchTerm, 'i')
              } else if (index === 2) {
                mongoQuery.dungeon_name = new RegExp(searchTerm, 'i')
              }
            }
          })
        }
      }
    } else {
      console.log(`MongoDB无WHERE条件，查询所有文档`)
    }
    
    console.log(`MongoDB查询条件: ${JSON.stringify(mongoQuery)}`)
    
    // 获取总数
    const totalCount = await collection.countDocuments(mongoQuery)
    
    // 执行查询
    const results = await collection
      .find(mongoQuery)
      .sort({ id: -1 })
      .hint({ id: -1 })
      .limit(limit || 20)
      .toArray()
    
    console.log(`MongoDB搜索结果: ${results.length} 条记录, 总计: ${totalCount} 条`)
    
    return { results, total: totalCount }
    
  } catch (error) {
    console.error(`MongoDB搜索失败: ${error.message}`)
    return { results: [], total: 0 }
  }
}

const mergeSearchResults = (mysqlResults, mongoResults, limit = 20) => {
  try {
    console.log(`开始合并搜索结果: MySQL ${mysqlResults.length} 条, MongoDB ${mongoResults.length} 条`)
    
    // 输出MySQL数据的ID列表
    const mysqlIds = mysqlResults.map(r => r.id).sort((a, b) => b - a)
    console.log(`MySQL数据ID列表 (按ID倒序): [${mysqlIds.join(', ')}]`)
    
    // 输出MongoDB数据的ID列表
    const mongoIds = mongoResults.map(r => r.id).sort((a, b) => b - a)
    console.log(`MongoDB数据ID列表 (按ID倒序): [${mongoIds.join(', ')}]`)
    
    // 使用Map去重，以ID为键
    const resultMap = new Map()
    
    // 先添加MySQL结果
    mysqlResults.forEach(record => {
      resultMap.set(record.id, {
        ...record,
        source: 'mysql'
      })
    })
    console.log(`添加MySQL数据后，Map中有 ${resultMap.size} 条记录`)
    
    // 再添加MongoDB结果，如果ID已存在则跳过，避免重复
    let mongoAdded = 0
    let mongoDuplicate = 0
    mongoResults.forEach(record => {
      if (!resultMap.has(record.id)) {
        resultMap.set(record.id, {
          ...record,
          source: 'mongodb'
        })
        mongoAdded++
      } else {
        // 如果MySQL中已有该记录，标记为双源
        const existingRecord = resultMap.get(record.id)
        existingRecord.source = 'both'
        mongoDuplicate++
      }
    })
    console.log(`添加MongoDB数据: 新增 ${mongoAdded} 条, 重复 ${mongoDuplicate} 条, Map总计 ${resultMap.size} 条记录`)
    
    // 输出合并去重后的所有ID
    const allMergedIds = Array.from(resultMap.keys()).sort((a, b) => b - a)
    console.log(`合并去重后所有ID (按ID倒序): [${allMergedIds.join(', ')}]`)
    
    // 转换为数组，按ID倒序排序，然后取前limit条
    const mergedResults = Array.from(resultMap.values())
      .sort((a, b) => b.id - a.id)  // 按ID倒序排序
      .slice(0, limit)              // 取前limit条
    
    // 输出最终结果的ID列表
    const finalIds = mergedResults.map(r => r.id)
    console.log(`最终返回的ID列表 (前${limit}条): [${finalIds.join(', ')}]`)
    
    console.log(`合并完成: 去重后 ${resultMap.size} 条记录, 最终返回 ${mergedResults.length} 条记录`)
    console.log(`数据源分布: MySQL独有: ${mergedResults.filter(r => r.source === 'mysql').length}, MongoDB独有: ${mergedResults.filter(r => r.source === 'mongodb').length}, 双源: ${mergedResults.filter(r => r.source === 'both').length}`)
    
    return mergedResults
    
  } catch (error) {
    console.error(`合并搜索结果失败: ${error.message}`)
    return mysqlResults // 如果合并失败，返回MySQL结果
  }
}

const mabiTelevision = async (content, qq, callback) => {
  // if(!content.trim().length) {
  //   help(callback)
  //   return
  // }
  await checkLink()
  
  // 管理员同步功能 - 需要在服务器选择逻辑之前检查
  if (qq === 799018865) {
    const trimmedContent = content.trim()
    
    // 全量同步猫服
    if (trimmedContent === '同步猫服') {
      console.log(`管理员 ${qq} 执行猫服全量同步操作`)
      
      const ylxResult = await fullSyncToMongoDB('mabi_dungeon_reward_records')
      
      let responseMessage = `🔄 管理员猫服同步报告:\n\n`
      responseMessage += `📊 猫服 (ylx):\n${ylxResult.message}`
      
      if (!ylxResult.success) {
        responseMessage += `\n\n⚠️ 同步失败，请检查日志`
      }
      
      callback(responseMessage)
      return
    }
    
    // 全量同步亚特
    if (trimmedContent === '同步亚特') {
      console.log(`管理员 ${qq} 执行亚特全量同步操作`)
      
      const yateResult = await fullSyncToMongoDB('mabi_dungeon_reward_records_yate')
      
      let responseMessage = `🔄 管理员亚特同步报告:\n\n`
      responseMessage += `📊 亚特 (yate):\n${yateResult.message}`
      
      if (!yateResult.success) {
        responseMessage += `\n\n⚠️ 同步失败，请检查日志`
      }
      
      callback(responseMessage)
      return
    }
    
    // 按ID同步猫服特定记录
    const catIdMatch = trimmedContent.match(/^同步猫服(\d+)$/)
    if (catIdMatch) {
      const recordId = catIdMatch[1]
      console.log(`管理员 ${qq} 执行猫服ID ${recordId} 同步操作`)
      
      const result = await syncByIdToMongoDB('mabi_dungeon_reward_records', recordId)
      
      let responseMessage = `🔍 管理员猫服ID同步报告:\n\n`
      responseMessage += `📊 猫服 (ylx) - ID ${recordId}:\n${result.message}`
      
      if (!result.success) {
        responseMessage += `\n\n⚠️ 同步失败，请检查日志`
      }
      
      callback(responseMessage)
      return
    }
    
    // 按ID同步亚特特定记录
    const yateIdMatch = trimmedContent.match(/^同步亚特(\d+)$/)
    if (yateIdMatch) {
      const recordId = yateIdMatch[1]
      console.log(`管理员 ${qq} 执行亚特ID ${recordId} 同步操作`)
      
      const result = await syncByIdToMongoDB('mabi_dungeon_reward_records_yate', recordId)
      
      let responseMessage = `🔍 管理员亚特ID同步报告:\n\n`
      responseMessage += `📊 亚特 (yate) - ID ${recordId}:\n${result.message}`
      
      if (!result.success) {
        responseMessage += `\n\n⚠️ 同步失败，请检查日志`
      }
      
      callback(responseMessage)
      return
    }
    
    // 同步猫服缺失记录
    if (trimmedContent === '同步猫服缺失') {
      console.log(`管理员 ${qq} 执行猫服缺失ID同步操作`)
      
      const result = await syncMissingIdsToMongoDB('mabi_dungeon_reward_records')
      
      let responseMessage = `🔍 管理员猫服缺失ID同步报告:\n\n`
      responseMessage += `📊 猫服 (ylx) - 缺失ID检查:\n${result.message}`
      
      if (!result.success) {
        responseMessage += `\n\n⚠️ 同步失败，请检查日志`
      }
      
      callback(responseMessage)
      return
    }
    
    // 同步亚特缺失记录
    if (trimmedContent === '同步亚特缺失') {
      console.log(`管理员 ${qq} 执行亚特缺失ID同步操作`)
      
      const result = await syncMissingIdsToMongoDB('mabi_dungeon_reward_records_yate')
      
      let responseMessage = `🔍 管理员亚特缺失ID同步报告:\n\n`
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
    'ylx': 'mabi_dungeon_reward_records',
    'yate': 'mabi_dungeon_reward_records_yate'
  }[sv]
  const filter = content.trim()
  let limit = 20
  let queryParams = [];
  let whereClause = '';

  if(filter.startsWith('芙兰队')) {
    // 芙兰队特殊查询
    const namePatterns = ['Fl%', '莉丽%', '娜兹%', 'Sa%', '永夜%', '温雯%', '圣祐%', '幽鬼%'];
    const nameConditions = namePatterns.map(() => 'character_name LIKE ?').join(' OR ');
    let teamWhereClause = `WHERE (${nameConditions}) AND channel = ? AND dungeon_name = ? AND (TIME(data_time) >= '20:00:00' OR TIME(data_time) <= '01:00:00')`;
    queryParams = [...namePatterns, 10, '格伦贝尔纳'];
    
    // 检查是否包含新卷条件
    if(filter.includes('新卷')) {
      const regStr = await createSearchRegexp('新卷');
      teamWhereClause += ` AND reward REGEXP '${regStr}'`;
    }
    if(filter.includes('+1卷')) {
      teamWhereClause += ` AND reward REGEXP '\\\\+1咒语书'`;
    }
    
    whereClause = teamWhereClause;
    limit = 50;
  } else if(filter.length) {
    if(filter.indexOf('-') > -1) {
      let sp = filter.split('-')
      let [rewordFilter, nameFilter, dungeonFilter] = sp
      if (rewordFilter || nameFilter || dungeonFilter) {
        let rewordSql = ' reward LIKE ?'
        if(/^新.*卷$/.test(sp[0])) {
          const regStr = await createSearchRegexp(sp[0])
          rewordSql = ` reward REGEXP '${regStr}'`
          // rewordSql = ` reward REGEXP '渴望的$|盼望的$|期盼的$|沉没的$|消失的$|被覆盖的$|逃跑的$|观望的$|旋转的$|囚禁$|不动之$|冻结的$|兔猿人$|极地骷髅战士$|极地冰狼$|踪迹$|轨迹$|痕迹$|符文猫$|斯内塔$|冰雪索灵$|白桦树$|波纹$|镜子$'`
        }
        whereClause = `WHERE${sp.map((x, i) => x && [rewordSql, ' character_name LIKE ?', ' dungeon_name LIKE ?'][i]).filter(x => x).join(' AND')}`
        queryParams = sp.map(x => x && `%${x}%`).filter(x => x && !(x.startsWith('%新') && x.endsWith('卷%')))
      }
    } else {
      if(/^新.*卷$/.test(filter)) {
        const regStr = await createSearchRegexp(filter)
        whereClause = `WHERE reward REGEXP '${regStr}'`
        // whereClause = `WHERE reward REGEXP '渴望的$|盼望的$|期盼的$|沉没的$|消失的$|被覆盖的$|逃跑的$|观望的$|旋转的$|囚禁$|不动之$|冻结的$|兔猿人$|极地骷髅战士$|极地冰狼$|踪迹$|轨迹$|痕迹$|符文猫$|斯内塔$|冰雪索灵$|白桦树$|波纹$|镜子$'`;
      } else {
        whereClause = `WHERE reward LIKE ? OR character_name LIKE ? OR dungeon_name LIKE ?`;
        queryParams = [`%${filter}%`, `%${filter}%`, `%${filter}%`];
      }
    }
  }


  console.log(`========QUERY CONSTRUCTION=========`)
  console.log(`Filter: "${filter}"`)
  console.log(`Table: ${table}`)
  console.log(`Where clause: ${whereClause}`)
  console.log(`Query params before total query: ${JSON.stringify(queryParams)}`)
  console.log(`Limit: ${limit}`)
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log(`===============================`)
  
  // 检查数据库连接状态和事务隔离级别
  try {
    const [isolationResult] = await mysqlPool.query('SELECT @@transaction_isolation as isolation_level')
    console.log(`DB Isolation Level: ${isolationResult[0].isolation_level}`)
    
    const [connectionResult] = await mysqlPool.query('SELECT CONNECTION_ID() as connection_id')
    console.log(`DB Connection ID: ${connectionResult[0].connection_id}`)
    
    // 检查是否有活跃的事务
    const [processResult] = await mysqlPool.query('SHOW PROCESSLIST')
    const activeTransactions = processResult.filter(p => p.State && p.State.includes('transaction'))
    console.log(`Active transactions: ${activeTransactions.length}`)
    
    // 检查autocommit状态
    const [autocommitResult] = await mysqlPool.query('SELECT @@autocommit as autocommit')
    console.log(`Autocommit: ${autocommitResult[0].autocommit}`)
    
  } catch (err) {
    console.log(`DB Status Check Error: ${err.message}`)
  }
  
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
  console.log(`========TOTAL ROW=========`)
  console.log(`Query: ${totalQuery}`)
  console.log(`Params: ${JSON.stringify(queryParams)}`)
  
  // 生成完整的可执行SQL语句
  let executableTotalSql = totalQuery
  queryParams.forEach((param, index) => {
    executableTotalSql = executableTotalSql.replace('?', `'${param}'`)
  })
  console.log(`Executable SQL: ${executableTotalSql}`)
  
  console.log(`Result: ${JSON.stringify(totalRow)}`)
  console.log(`Total count: ${totalRow[0][0].total}`)
  console.log(`==================`)
  
  // 检查总数查询后的连接状态
  try {
    const [connectionAfterTotal] = await mysqlPool.query('SELECT CONNECTION_ID() as connection_id')
    console.log(`Connection ID after total query: ${connectionAfterTotal[0].connection_id}`)
  } catch (err) {
    console.log(`Connection check error: ${err.message}`)
  }
  const query =
    `
    SELECT *
    ${base}
    LIMIT ?
    `
  // 为数据查询创建单独的参数数组，避免修改原数组
  const dataQueryParams = [...queryParams, limit]
  console.log(`========DATA QUERY=========`)
  console.log(`Query: ${query}`)
  console.log(`Original queryParams: ${JSON.stringify(queryParams)}`)
  console.log(`Data query params: ${JSON.stringify(dataQueryParams)}`)
  
  // 生成完整的可执行SQL语句
  let executableDataSql = query
  dataQueryParams.forEach((param, index) => {
    executableDataSql = executableDataSql.replace('?', `'${param}'`)
  })
  console.log(`Executable SQL: ${executableDataSql}`)
  
  const [row, fields] = await mysqlPool.query(query, dataQueryParams)
  console.log(`Data rows returned: ${row.length}`)
  
  // 检查数据查询后的连接状态
  try {
    const [connectionAfterData] = await mysqlPool.query('SELECT CONNECTION_ID() as connection_id')
    console.log(`Connection ID after data query: ${connectionAfterData[0].connection_id}`)
  } catch (err) {
    console.log(`Connection check error: ${err.message}`)
  }
  console.log(`==================`)

  // 同步MySQL搜索结果到MongoDB
  await syncToMongoDB(row, table)
  
  // 从MongoDB搜索相同条件的数据
  console.log(`========MONGODB SEARCH=========`)
  const mongoSearchResult = await searchFromMongoDB(table, whereClause, queryParams, limit)
  const mongoResults = mongoSearchResult.results || []
  const mongoTotal = mongoSearchResult.total || 0
  console.log(`MongoDB search completed: ${mongoResults.length} records, total: ${mongoTotal}`)
  console.log(`==================`)
  
  // 合并MySQL和MongoDB的搜索结果
  console.log(`========MERGING RESULTS=========`)
  const mergedResults = mergeSearchResults(row, mongoResults, limit)
  console.log(`Merged results: ${mergedResults.length} records`)
  console.log(`==================`)
  
  // 使用合并后的结果进行渲染
  const finalResults = mergedResults

  // const query =
  //   `
  //   SELECT *
  //   FROM ${table}
  //   ${whereClause}
  //   ORDER BY data_time DESC
  //   LIMIT ?
  //   `
  // queryParams.push(limit)
  // const [row, fields] = await mysqlPool.query(query, queryParams)
  // console.log(row)
  // const outputDir = path.join(__dirname, 'text.jpg')
  const outputDir = path.join(IMAGE_DATA, 'mabi_other', `MabiTV.png`)
  
  // 更新总数统计，包含合并后的数据
  const totalMergedCount = mergedResults.length
  const mysqlOnlyCount = mergedResults.filter(r => r.source === 'mysql').length
  const mongoOnlyCount = mergedResults.filter(r => r.source === 'mongodb').length
  const bothSourceCount = mergedResults.filter(r => r.source === 'both').length
  
  // 构建描述信息
  let description = `(MySQL: ${totalRow[0][0].total}, MongoDB: ${mongoTotal}, 合并后: ${totalMergedCount})`
  if (mongoOnlyCount > 0) {
    description += ` [MongoDB补充: +${mongoOnlyCount}]`
  }
  
  await render(finalResults, {
    title: `出货记录查询：${{'ylx': '猫服', 'yate': '亚特'}[sv]}`,
    description: description,
    output: outputDir,
    columns: [
      {
        label: '角色名称',
        key: 'character_name',
      },
      {
        label: '物品名称',
        key: 'reward',
      },
      {
        label: '地下城名称',
        key: 'dungeon_name',
      },
      {
        label: '时间',
        key: 'data_time',
        format: time => formatTime(new Date(time).getTime())
      },
      {
        label: '频道',
        key: 'channel',
      },
    ]
  })

  console.log(`保存MabiTV.png成功！`)
  let imgMsg = `[CQ:image,file=${path.join('send', 'mabi_other', `MabiTV.png`)}]`
  callback(imgMsg)
}

module.exports = {
  mabiTelevision
}