const fs = require('fs-extra')
const path = require('path-extra')
const mysql = require('mysql2')
const _ = require('lodash')
const nodeHtmlToImage = require('node-html-to-image')
const font2base64 = require('node-font2base64')
const { IMAGE_DATA } = require(path.join(__dirname, '..', '..', '..', 'baibaiConfigs.js'))
//FONTS
const HANYIWENHEI = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', '..', 'font', 'hk4e_zh-cn.ttf'))

let promisePool

const CONTAINER_WIDTH = 1000
const GROUP_PADDING = 5
const ITEM_BORDER = 2
const ITEM_LABEL_FONT_SIZE = 24
const ITEM_USER_FONT_SIZE = 14
const ITEM_TIME_FONT_SIZE = 12
const ITEM_LABEL_MARGIN = 5
const ITEM_CHANNEL_WIDTH = 36
const ITEM_INSET_BORDER = 1
const ITEM_MIN_WIDTH = 135
const GLOBAL_ITEM_MARGIN = 5
const GLOBAL_LINE_HEIGHT = 1.4

const calcItemHeight =
  Math.ceil(ITEM_LABEL_FONT_SIZE * GLOBAL_LINE_HEIGHT +
  ITEM_USER_FONT_SIZE * GLOBAL_LINE_HEIGHT +
  ITEM_TIME_FONT_SIZE * GLOBAL_LINE_HEIGHT +
  ITEM_INSET_BORDER * 2 +
  ITEM_BORDER * 2)

const createPool = async () => {
  const pool = mysql.createPool(Object.assign(
    {
      connectionLimit: 10,
      database: 'dungeon_reward_records'
    },
    fs.readJsonSync(path.join(__dirname, '.secret.json'))
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
      return {
        dungeonColor: '#00768a',
        dungeonGroup: dungeon_name
      }
    case '科隆巴斯':
      return {
        dungeonColor: '#9b0000',
        dungeonGroup: dungeon_name
      }
    case '佩斯皮亚德':
    case '复活的残像':
    case '七重噩梦':
      return {
        dungeonColor: '#540483',
        dungeonGroup: '塔赫杜因'
      }
    default:
      if(dungeon_name.indexOf('梦幻拉比') > -1) {
        return {
          dungeonColor: '#a60587',
          dungeonGroup: '梦幻拉比'
        }
      }
      if(dungeon_name.indexOf('专家') > -1) {
        return {
          dungeonColor: '#042e83',
          dungeonGroup: '专家'
        }
      }
      return {
        dungeonColor: '#c96a06',
        dungeonGroup: '其他'
      }
  }
}

const calcItemWidth = rewardLabel =>
  Math.max(Math.ceil(ITEM_BORDER * 2 +
  ITEM_LABEL_FONT_SIZE * rewardLabel.length +
  ITEM_LABEL_MARGIN * 2 +
  ITEM_CHANNEL_WIDTH +
  ITEM_INSET_BORDER), ITEM_MIN_WIDTH)

const formatTime = ts => `${new Date(ts).getMonth() + 1}-${new Date(ts).getDate()} ${new Date(ts).getHours()}:${addZero(new Date(ts).getMinutes())}`

const addZero = n => n < 10 ? ('0' + n) : n

const analysisRows = rows => {
  if(!(rows && rows.length)) {
    return []
  }
  let startLeft = new Date(rows[0].data_time).getTime()
  let endLeft = new Date(rows[rows.length - 1].data_time).getTime()
  let base = (endLeft - startLeft) / (CONTAINER_WIDTH - calcItemWidth(computedReward(rows[rows.length - 1].reward).rewardLabel))
  let groupTmp = {}
  let out = rows.map(item => {
    let cr = computedReward(item.reward)
    let cd = computedDungeon(item.dungeon_name)
    let time = formatTime(new Date(item.data_time).getTime())
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
      { time },
      { psInfo: groupTmp[cd.dungeonGroup] }
    )
  })
  out = _.groupBy(out, 'dungeonGroup')
  let customOrder = {
    '格伦贝尔纳': 1,
    '科隆巴斯': 2,
    '塔赫杜因': 3,
    '专家': 4,
    '梦幻拉比': 5,
    '其他': 6
  }
  out = Object.keys(out).sort((a, b) => customOrder[a] - customOrder[b]).map(groupName => {
    let groupLines = Math.max(...out[groupName].map(x => x.line)) + 1
    return {
      groupName,
      groupInfo: out[groupName],
      groupLines,
      groupHeight: groupLines * calcItemHeight + (groupLines - 1) * GLOBAL_ITEM_MARGIN
    }
  })
  return out
}

const mabiTelevision = async (content = '', callback) => {
  let rows
  if(content == 'all') {
    rows = analysisRows(await search('', 10000))
  } else {
    rows = analysisRows(await search(content))
  }
  // console.log(JSON.stringify(rows, null, 2))
  // console.log(calcItemHeight)
  renderImage(rows, callback)
}


const renderImage = (data, callback, otherMsg = '') => {
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Title</title>
  <style>
		@font-face {
			font-family: 'HANYIWENHEI';
			src: url(${HANYIWENHEI}) format('truetype');
		}
    * {
      border: 0;
      padding: 0;
      margin: 0;
      line-height: 1.4;
    }
    body {
      width: 1040px;
      min-height: 20px;
      padding: 20px;
      box-sizing: border-box;
			font-family: HANYIWENHEI;
    }
    .group-container {
      padding: ${GROUP_PADDING}px 0;
      position: relative;
    }
    .group-container:nth-child(odd) {
      background: #fff;
    }
    .group-container:nth-child(even) {
      background: #eee;
    }
    .group-container .group-bg-lable{
      font-size: 70px;
      display: block;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      z-index: 1
    }
    .group-container:nth-child(odd) .group-bg-lable{
      color: #eee;
    }
    .group-container:nth-child(even) .group-bg-lable{
      color: #fff;
    }
    .group-container .item{
      border: ${ITEM_BORDER}px solid;
      position: absolute;
      display: flex;
      justify-content: space-between;
      align-items: stretch;
      border-radius: 5px;
      background: #fff;
      z-index: 10;
    }
    .group-container .item .item-infos{
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: stretch;
      flex-grow: 1;
    }
    .group-container .item .item-infos .item-user{
      font-size: ${ITEM_USER_FONT_SIZE}px;
      border-bottom: ${ITEM_INSET_BORDER}px solid;
      text-align: left;
      padding-left: ${ITEM_LABEL_MARGIN}px
    }
    .group-container .item .item-infos .item-label{
      font-size: ${ITEM_LABEL_FONT_SIZE}px;
      flex-grow: 1;
      text-align: center;
    }
    .group-container .item .item-infos .item-time{
      font-size: ${ITEM_TIME_FONT_SIZE}px;
      border-top: ${ITEM_INSET_BORDER}px solid;
      text-align: left;
      color: #999;
      padding-left: ${ITEM_LABEL_MARGIN}px
    }
    .group-container .item .item-channel{
      width: ${ITEM_CHANNEL_WIDTH}px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: #fff;
    }
  </style>
</head>
<body>
  ${data.map(group => `
    <div class="group-container" style="height: ${group.groupHeight}px">
      <div class="group-bg-lable">${group.groupName}</div>
      ${group.groupInfo.map(item => `
        <div class="item" style="width: ${item.width - ITEM_BORDER * 2}px; border-color: ${item.dungeonColor}; left: ${item.left}px; top: ${item.line * (calcItemHeight + GLOBAL_ITEM_MARGIN) + GROUP_PADDING}px">
          <div class="item-infos">
            <div class="item-user" style="border-color: ${item.dungeonColor};">${item.character_name}</div>
            <div class="item-label">${item.rewardLabel}</div>
            <div class="item-time" style="border-color: ${item.dungeonColor};">${item.time}</div>
          </div>
          <div class="item-channel" style="background: ${item.dungeonColor};">
            <div class="channel-title">Ch.</div>
            <div class="channel-label">${item.channel}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('')}
</body>
</html>`
  let output = path.join(IMAGE_DATA, 'mabi_other', `MabiTV.png`)
  // let output = './MabiTV.png'
  nodeHtmlToImage({
    output,
    html
  })
    .then(() => {
      console.log(`保存MabiTV.png成功！`)
      let imgMsg = `${otherMsg}[CQ:image,file=${path.join('send', 'mabi_other', `MabiTV.png`)}]`
      callback(imgMsg)
    })

}

module.exports = {
  mabiTelevision
}

// mabiTelevision()