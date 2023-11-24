const fs = require('fs-extra')
const path = require('path-extra')
const mysql = require('mysql2')

let promisePool

const CONTAINER_WIDTH = 1000
const ITEM_BORDER = 2
const ITEM_LABEL_FONT_SIZE = 24
const ITEM_LABEL_MARGIN = 5
const ITEM_CHANNEL_WIDTH = 36
const ITEM_INSET_BORDER = 1
const GLOBAL_ITEM_MARGIN = 5

const createPool = async () => {
  const pool = mysql.createPool(Object.assign(
    {
      connectionLimit: 10,
      database: 'dungeon_reward_records'
    },
    fs.readJsonSync('./.secret.json')
  ))
  promisePool = pool.promise();
}

const searchDb = async sqlQuery => {
  if(!promisePool) {
    createPool()
  }
  return await promisePool.query(sqlQuery)
}

const search = async (filter, limit = 20) => {
  let [rows, fields] = await searchDb(
    `
    SELECT *
    FROM mabi_dungeon_reward_records
    ${(filter && filter.length > 1) ? `
    WHERE reward LIKE '%${filter}%'
      OR dungeon_name LIKE '%${filter}%'
      OR character_name LIKE '%${filter}%'
    ` : ''}
    ORDER BY data_time DESC 
    LIMIT ${limit}
    `
  )
  return rows.reverse()
}

const computedReward = reward => {
  if(reward.indexOf('魔法释放') > -1) {
    return {
      rewardLabel: reward.split(' ')[0],
      rewardType: 'optionset'
    }
  }
  if(reward.indexOf('咒语书') > -1) {
    return {
      rewardLabel: `${reward.substring(4, reward.indexOf('+1') - 2)}+1`,
      rewardType: 'setitem'
    }
  }
  return {
    rewardLabel: reward,
    rewardType: 'other'
  }
}

const computedDungeon = dungeon_name => {
  switch(dungeon_name){
    case '格伦贝尔纳':
    case '科隆巴斯':
      return {
        dungeonGroup: dungeon_name
      }
    case '佩斯皮亚德':
    case '复活的残像':
    case '七重噩梦':
      return {
        dungeonGroup: '塔赫杜因'
      }
    default:
      if(dungeon_name.indexOf('专家') > -1) {
        return {
          dungeonGroup: '专家'
        }
      }
      return {
        dungeonGroup: '其他'
      }
  }
}

const calcItemWidth = rewardLabel =>
  ITEM_BORDER * 2 +
  ITEM_LABEL_FONT_SIZE * rewardLabel.length +
  ITEM_LABEL_MARGIN * 2 +
  ITEM_CHANNEL_WIDTH +
  ITEM_INSET_BORDER


const analysisRows = rows => {
  if(!(rows && rows.length)) {
    return []
  }
  let startLeft = new Date(rows[0].data_time).getTime()
  let endLeft = new Date(rows[rows.length - 1].data_time).getTime()
  let base = (endLeft - startLeft) / (CONTAINER_WIDTH - calcItemWidth(computedReward(rows[rows.length - 1].reward).rewardLabel))
  let groupTmp = {}
  return rows.map(item => {
    let cr = computedReward(item.reward), cd = computedDungeon(item.dungeon_name)
    let position = {
      left: ~~((new Date(item.data_time).getTime() - startLeft) / base),
      width: calcItemWidth(cr.rewardLabel)
    }
    if(groupTmp[cd.dungeonGroup]) {
      let flag = true
      for(let i = 0; i < groupTmp[cd.dungeonGroup].length; i ++) {
        if(groupTmp[cd.dungeonGroup][i] < position.left) {
          groupTmp[cd.dungeonGroup][i] = position.left + position.width + GLOBAL_ITEM_MARGIN
          position.line = i
          flag = false
          break
        }
      }
      if(flag) {
        position.line = groupTmp[cd.dungeonGroup].length
        groupTmp[cd.dungeonGroup].push(position.left + position.width + GLOBAL_ITEM_MARGIN)
      }
    } else {
      position.line = 0
      groupTmp[cd.dungeonGroup] = [position.left + position.width + GLOBAL_ITEM_MARGIN]
    }
    return Object.assign(
      item,
      cr,
      cd,
      position,
      {psInfo: groupTmp[cd.dungeonGroup]}
    )
  })
}

const mabiTelevision = async (content, callback) => {
  let rows = analysisRows(await search(''))
  console.log(rows)
  console.log(rows.length)

}

mabiTelevision()