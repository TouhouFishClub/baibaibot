/**
 * 同步 time 字段脚本
 * 
 * 功能：
 * 1. 将数据库中的 updatedAt 时间同步到 time 字段
 * 2. 如果 updatedAt 不存在，使用 createdAt
 * 3. 如果 time 字段已存在，则跳过（不覆盖）
 * 
 * 运行方式：node syncTimeField.js
 */

const MongoClient = require('mongodb').MongoClient
const { mongourl } = require('../../../../baibaiConfigs')

const DB_NAME = 'db_bot'
const COLLECTION_NAME = 'cl_ai_knowledge'

async function syncTimeField() {
  let client
  try {
    console.log('正在连接数据库...')
    client = await MongoClient.connect(mongourl)
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION_NAME)
    
    console.log('正在查询需要同步的知识条目...')
    
    // 查询所有 time 字段不存在或为 null 的条目
    const entries = await collection.find({
      $or: [
        { time: { $exists: false } },
        { time: null }
      ]
    }).toArray()
    
    console.log(`找到 ${entries.length} 条需要同步的知识条目`)
    
    if (entries.length === 0) {
      console.log('✅ 所有知识条目的 time 字段都已存在，无需同步')
      return
    }
    
    let successCount = 0
    let skipCount = 0
    
    for (const entry of entries) {
      // 优先使用 updatedAt，如果没有则使用 createdAt
      const timeToSet = entry.updatedAt || entry.createdAt
      
      if (!timeToSet) {
        console.log(`⚠️  跳过条目 "${entry.title}"（ID: ${entry._id}），没有 updatedAt 或 createdAt 字段`)
        skipCount++
        continue
      }
      
      try {
        await collection.updateOne(
          { _id: entry._id },
          { $set: { time: timeToSet } }
        )
        console.log(`✅ 已同步 "${entry.title}"（ID: ${entry._id}），time = ${timeToSet.toISOString()}`)
        successCount++
      } catch (error) {
        console.error(`❌ 同步失败 "${entry.title}"（ID: ${entry._id}）:`, error.message)
      }
    }
    
    console.log('')
    console.log('='.repeat(60))
    console.log('同步完成')
    console.log('='.repeat(60))
    console.log(`成功同步: ${successCount} 条`)
    console.log(`跳过: ${skipCount} 条`)
    console.log(`总计: ${entries.length} 条`)
    
  } catch (error) {
    console.error('❌ 同步失败:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      console.log('数据库连接已关闭')
    }
  }
}

// 运行同步
if (require.main === module) {
  syncTimeField().catch(error => {
    console.error('❌ 程序异常:', error)
    process.exit(1)
  })
}

module.exports = { syncTimeField }

