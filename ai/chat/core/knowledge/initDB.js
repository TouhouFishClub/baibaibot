/**
 * 知识库 MongoDB 初始化脚本
 * 
 * 运行方式：node initDB.js
 * 
 * 功能：
 * 1. 创建 cl_ai_knowledge 集合
 * 2. 创建索引
 * 3. 插入示例数据
 */

const MongoClient = require('mongodb').MongoClient
const { mongourl } = require('../../../../baibaiConfigs')

const DB_NAME = 'db_bot'
const COLLECTION_NAME = 'cl_ai_knowledge'

// 示例知识数据
const sampleKnowledge = [
  {
    title: '洛奇基础信息',
    content: '《洛奇》(Mabinogi) 是由韩国 Nexon 开发的一款大型多人在线角色扮演游戏 (MMORPG)。游戏以凯尔特神话为背景，玩家可以在爱尔琳大陆上自由冒险。游戏特色包括：生活技能系统（钓鱼、烹饪、裁缝等）、转生系统、才能系统、战斗系统（近战、魔法、弓箭、炼金术等）。',
    keywords: ['洛奇', 'mabinogi', '玛奇', '爱尔琳', '网游', 'MMORPG'],
    category: '洛奇游戏',
    createdBy: 799018865,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: '洛奇转生系统',
    content: '转生是洛奇的核心系统之一。玩家角色达到20岁后可以转生，转生后年龄重置为10岁，保留所有技能等级，并获得额外AP点数用于提升技能。转生周期为现实3周（累计在线）。每次转生可以选择性别，但种族不可更改。',
    keywords: ['转生', 'AP', '年龄', '技能'],
    category: '洛奇游戏',
    createdBy: 799018865,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: '百百自我介绍',
    content: '百百是一个QQ群聊机器人，主要活跃在洛奇游戏相关的群聊中。百百性格活泼，喜欢和大家聊天，对洛奇游戏有比较深入的了解，也熟悉各种网络热梗。百百的创造者希望她能成为群里的好帮手和有趣的群友。',
    keywords: ['百百', '机器人', '自我介绍'],
    category: '关于百百',
    createdBy: 799018865,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

async function initDatabase() {
  let client
  
  try {
    console.log('正在连接 MongoDB...')
    client = await MongoClient.connect(mongourl)
    const db = client.db(DB_NAME)
    
    console.log(`已连接到数据库: ${DB_NAME}`)
    
    // 检查集合是否存在
    const collections = await db.listCollections({ name: COLLECTION_NAME }).toArray()
    
    if (collections.length > 0) {
      console.log(`集合 ${COLLECTION_NAME} 已存在`)
      
      // 询问是否要重新初始化（在脚本中直接跳过，保留现有数据）
      const collection = db.collection(COLLECTION_NAME)
      const count = await collection.countDocuments()
      console.log(`当前知识库共有 ${count} 条记录`)
      
      if (count === 0) {
        console.log('知识库为空，插入示例数据...')
        await collection.insertMany(sampleKnowledge)
        console.log(`已插入 ${sampleKnowledge.length} 条示例数据`)
      }
    } else {
      console.log(`创建集合: ${COLLECTION_NAME}`)
      const collection = db.collection(COLLECTION_NAME)
      
      // 创建索引
      console.log('创建索引...')
      
      // 标题索引（唯一）
      await collection.createIndex({ title: 1 }, { unique: true })
      console.log('  - title 索引已创建（唯一）')
      
      // 关键词索引
      await collection.createIndex({ keywords: 1 })
      console.log('  - keywords 索引已创建')
      
      // 分类索引
      await collection.createIndex({ category: 1 })
      console.log('  - category 索引已创建')
      
      // 创建时间索引
      await collection.createIndex({ createdAt: -1 })
      console.log('  - createdAt 索引已创建')
      
      // 插入示例数据
      console.log('插入示例数据...')
      await collection.insertMany(sampleKnowledge)
      console.log(`已插入 ${sampleKnowledge.length} 条示例数据`)
    }
    
    // 显示当前知识库内容
    console.log('\n当前知识库内容:')
    console.log('='.repeat(50))
    
    const collection = db.collection(COLLECTION_NAME)
    const entries = await collection.find({}).toArray()
    
    for (const entry of entries) {
      console.log(`\n【${entry.title}】`)
      console.log(`  ID: ${entry._id}`)
      console.log(`  分类: ${entry.category}`)
      console.log(`  关键词: ${entry.keywords.join(', ')}`)
      console.log(`  内容: ${entry.content.substring(0, 50)}...`)
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('✅ 知识库初始化完成!')
    
  } catch (error) {
    console.error('❌ 初始化失败:', error.message)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
    }
  }
}

// 运行初始化
initDatabase()

