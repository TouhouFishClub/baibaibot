const path = require('path')
const _ = require('lodash')
const nodeHtmlToImage = require('node-html-to-image')
const { IMAGE_DATA } = require(path.join(__dirname, '..', '..', 'baibaiConfigs.js'))

const { drawTxtImage } = require('../../cq/drawImageBytxt')

const AREAS = {
  'DEK': {
    name: '迪尔科内尔',
    goods: [
      {
        level: 1,
        name: '儿童药水',
        blockLimit: 80,
        weight: 1
      },
      {
        level: 2,
        name: '减肥药水',
        blockLimit: 100,
        weight: 1
      },
      {
        level: 3,
        name: '止呼噜药',
        blockLimit: 100,
        weight: 2
      },
      {
        level: 4,
        name: '人参药水',
        blockLimit: 50,
        weight: 3
      },
      {
        level: 5,
        name: '爱情药水',
        blockLimit: 100,
        weight: 3
      }
    ],
    timesQuery: [
      { id: 'DBL', time: 180 },
      { id: 'BGE', time: 370 },
      { id: 'AMM', time: 300 },
      { id: 'TTI', time: 213 },
      { id: 'TLA', time: 461 },
      { id: 'KPU', time: 200 },
      { id: 'BEF', time: 535 },
    ]
  },
  'DBL': {
    name: '敦巴伦',
    goods: [
      {
        level: 1,
        name: '蜘蛛丝手套',
        blockLimit: 10,
        weight: 5
      },
      {
        level: 2,
        name: '羊毛靴',
        blockLimit: 10,
        weight: 8
      },
      {
        level: 3,
        name: '食人魔屠夫假面',
        blockLimit: 50,
        weight: 4
      },
      {
        level: 4,
        name: '男妖正装',
        blockLimit: 5,
        weight: 25
      },
      {
        level: 5,
        name: '女妖泳衣',
        blockLimit: 10,
        weight: 6
      }
    ],
    timesQuery: [
      { id: 'DEK', time: 180 },
      { id: 'BGE', time: 195 },
      { id: 'AMM', time: 139 },
      { id: 'TTI', time: 235 },
      { id: 'TLA', time: 430 },
      { id: 'KPU', time: 40 },
      { id: 'BEF', time: 390 },
    ]
  },
  'BGE': {
    name: '班格',
    goods: [
      {
        level: 1,
        name: '班格的煤炭',
        blockLimit: 10,
        weight: 8
      },
      {
        level: 2,
        name: '大理石',
        blockLimit: 10,
        weight: 20
      },
      {
        level: 3,
        name: '黄水晶',
        blockLimit: 10,
        weight: 25
      },
      {
        level: 4,
        name: '苏格兰高地矿石',
        blockLimit: 8,
        weight: 30
      },
      {
        level: 5,
        name: '铅',
        blockLimit: 10,
        weight: 30
      }
    ],
    timesQuery: [
      { id: 'DEK', time: 367 },
      { id: 'DBL', time: 200 },
      { id: 'AMM', time: 283 },
      { id: 'TTI', time: 440 },
      { id: 'TLA', time: 600 },
      { id: 'KPU', time: 180 },
      { id: 'BEF', time: 510 },
    ]
  },
  'AMM': {
    name: '艾明马恰',
    goods: [
      {
        level: 1,
        name: '威化',
        blockLimit: 40,
        weight: 3
      },
      {
        level: 2,
        name: '啤酒',
        blockLimit: 50,
        weight: 4
      },
      {
        level: 3,
        name: '熏制的野味',
        blockLimit: 50,
        weight: 3
      },
      {
        level: 4,
        name: '蘑菇意大利面',
        blockLimit: 50,
        weight: 5
      },
      {
        level: 5,
        name: '碳烤熊肉',
        blockLimit: 10,
        weight: 40
      }
    ],
    timesQuery: [
      { id: 'DEK', time: 300 },
      { id: 'DBL', time: 140 },
      { id: 'BGE', time: 283 },
      { id: 'TTI', time: 333 },
      { id: 'TLA', time: 330 },
      { id: 'KPU', time: 169 },
      { id: 'BEF', time: 500 },
    ]
  },
  'TTI': {
    name: '塔汀',
    goods: [
      {
        level: 1,
        name: '热气结晶',
        blockLimit: 100,
        weight: 2
      },
      {
        level: 2,
        name: '音乐盒保存石',
        blockLimit: 50,
        weight: 3
      },
      {
        level: 3,
        name: '帕拉鲁结晶',
        blockLimit: 100,
        weight: 2
      },
      {
        level: 4,
        name: '环形栅栏结晶',
        blockLimit: 100,
        weight: 4
      },
      {
        level: 5,
        name: '炼金结晶',
        blockLimit: 10,
        weight: 5
      }
    ],
    timesQuery: [
      { id: 'DEK', time: 215 },
      { id: 'DBL', time: 235 },
      { id: 'BGE', time: 440 },
      { id: 'AMM', time: 333 },
      { id: 'TLA', time: 240 },
      { id: 'KPU', time: 280 },
      { id: 'BEF', time: 610 },
    ]
  },
  'TLA': {
    name: '塔拉',
    goods: [
      {
        level: 1,
        name: '迷你化妆台',
        blockLimit: 10,
        weight: 20
      },
      {
        level: 2,
        name: '茶几',
        blockLimit: 5,
        weight: 25
      },
      {
        level: 3,
        name: '摇椅',
        blockLimit: 5,
        weight: 25
      },
      {
        level: 4,
        name: '儿童高低床',
        blockLimit: 3,
        weight: 75
      },
      {
        level: 5,
        name: '大型红酒架',
        blockLimit: 1,
        weight: 300
      }
    ],
    timesQuery: [
      { id: 'DEK', time: 461 },
      { id: 'DBL', time: 430 },
      { id: 'BGE', time: 600 },
      { id: 'AMM', time: 330 },
      { id: 'TTI', time: 240 },
      { id: 'KPU', time: 450 },
      { id: 'BEF', time: 790 },
    ]
  },
  'KPU': {
    name: '卡普',
    goods: [
      {
        level: 1,
        name: '卡普海苔',
        blockLimit: 50,
        weight: 2
      },
      {
        level: 2,
        name: '卡普海贝',
        blockLimit: 50,
        weight: 3
      },
      {
        level: 3,
        name: '鲨鱼翅',
        blockLimit: 50,
        weight: 4
      },
      {
        level: 4,
        name: '海蜇',
        blockLimit: 30,
        weight: 6
      },
      {
        level: 5,
        name: '水怪鳞片',
        blockLimit: 50,
        weight: 2
      }
    ],
    timesQuery: [
      { id: 'DEK', time: 200 },
      { id: 'DBL', time: 40 },
      { id: 'BGE', time: 180 },
      { id: 'AMM', time: 170 },
      { id: 'TTI', time: 280 },
      { id: 'TLA', time: 450 },
      { id: 'BEF', time: 326 },
    ]
  },
  'BEF': {
    name: '贝尔法斯特',
    goods: [
      {
        level: 1,
        name: '铁鞭',
        blockLimit: 15,
        weight: 8
      },
      {
        level: 2,
        name: '黑光剑',
        blockLimit: 10,
        weight: 12
      },
      {
        level: 3,
        name: '金库',
        blockLimit: 1,
        weight: 220
      },
      {
        level: 4,
        name: '骷髅食人魔铠甲',
        blockLimit: 1,
        weight: 180
      },
      {
        level: 5,
        name: '莫蓝特头盔仿品',
        blockLimit: 10,
        weight: 40
      }
    ],
    timesQuery: [
      { id: 'DEK', time: 535 },
      { id: 'DBL', time: 390 },
      { id: 'BGE', time: 506 },
      { id: 'AMM', time: 500 },
      { id: 'TTI', time: 610 },
      { id: 'TLA', time: 790 },
      { id: 'KPU', time: 326 }
    ]
  }
}

const CARRIER = [
  {
    name: '[羊驼]拖车',
    block: 11,
    weight: 1200,
    timeRate: 0.75
  },
  {
    name: '[伙伴]运输用大象',
    block: 9,
    weight: 1900,
    timeRate: 1
  }
]

const calcTradeCount = (item, blockLimit, weight) => ~~Math.min(item.block * blockLimit, item.weight / weight)

const analysis = (routes, carrierInfo, profits, itemWeight) => {
  let out = routes.map((r, i) => {
    return {
      name: AREAS[r.id].name,
      profit: profits[i],
      item: carrierInfo.map(info => {
        let { name, count, timeRate } = info
        let exp = profits[i] ? ~~(~~Math.pow((itemWeight * profits[i]), 0.5) * count * 30 * 1.15) : 0
        return {
          name,
          exp,
          time: ~~(r.time * timeRate),
          expAvg: ~~(exp / r.time / timeRate)
        }
      })
    }
  })
  let expHash = {}, expAvgHash = {}
  _.flatten(out.map(x => x.item.map(i => i.exp))).sort((a, b) => a - b).forEach((x, i, a) => expHash[x] = a.length - i)
  _.flatten(out.map(x => x.item.map(i => i.expAvg))).sort((a, b) => a - b).forEach((x, i, a) => expAvgHash[x] = a.length - i)
  out.forEach(x => {
    x.item.forEach(i => {
      i.expRank = expHash[i.exp]
      i.expAvgRank = expAvgHash[i.expAvg]
    })
  })
  return out
}

const trade = (content, qq, groupId, callback) => {
  if(!(groupId == 577587780 || qq == 799018865)) {
    return
  }
  let aq = {}, sp = content.replace(/[， ]/g, ',').split(',').filter(x => x.trim()), out = ''
  Object.keys(AREAS).forEach(ak => {
    AREAS[ak].goods.forEach(item => {
      aq[item.name] = {
        ak,
        level: item.level
      }
    })
  })
  // console.log(aq)
  // console.log(sp)
  let target = Object.keys(aq).filter(x => x.match(sp[0]))[0]
  if(target) {
    let {ak, level} = aq[target]
    // console.log(ak)
    // console.log(level)
    let { goods, timesQuery } = AREAS[ak]
    let { name, blockLimit, weight } = goods[level - 1]
    let carrierInfo = CARRIER.map(x => {
      return {
        name: x.name,
        count: calcTradeCount(x, blockLimit, weight),
        timeRate: x.timeRate
      }
    })
    let allCityDesc = analysis(timesQuery, carrierInfo, sp.slice(1), weight)

    renderImage(AREAS[ak], goods[level - 1], carrierInfo, allCityDesc, callback)
    return

    out += `${AREAS[ak].name} - ${name}\n`
    out += `单个箱位容量: ${blockLimit}\n`
    out += `单个重量: ${weight}\n`
    out += `=====================\n`
    out += `${carrierInfo.map(x => `${x.name}: ${x.count}`).join('\n')}\n`
    out += `=====================\n`

    out += `${allCityDesc.map(x => `${x.name}(${x.profit > 0 ? `+${x.profit}` : '无利润'})\n${x.item.map(i => `  贸易工具:${i.name}（${i.time}s）\n  总经验:${i.exp}(${i.expRank})\n  每秒经验:${i.expAvg}(${i.expAvgRank})`).join('\n')}`).join('\n')}\n`

  } else {
    out = `${sp[0]} 未找到`
  }
  callback(out)

  drawTxtImage(``, out, callback, {color: 'black', font: 'STXIHEI.TTF'})
}

const renderImage = (cityInfo, goodInfo, carrierInfo, allCityDesc, callback) => {
  let { goods, timesQuery } = cityInfo
  let { name, blockLimit, weight } = goodInfo
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Title</title>
  <style>
    * {
      border: 0;
      padding: 0;
      margin: 0;
      font-size: 14px;
      line-height: 1.4;
    }
    body {
      width: 400px;
      min-height: 20px;
      padding: 20px;
      box-sizing: border-box;
      background: #806637;
    }
    .good-name{
      color: #090704;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      border-radius: 5px;
      padding: 10px 20px;
    }
    .info-flex {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      margin-top: 10px;
    }
    .info-flex .good-info,
    .info-flex .carrier-info{
      flex-grow: 1;
      border-radius: 5px;
      padding: 10px 20px;
      background: #eee3cd;
    }
    .info-flex .carrier-info{
      margin-left: 10px;
    }
    .city-info-container {
      margin-top: 10px;
      padding-bottom: 20px;
      border-radius: 5px;
      background: #eee3cd;
    }
    .city-info-container .label {
      font-size: 16px;
      font-weight: bold;
      padding-top: 10px;
      padding-bottom: 10px;
      border-bottom: 1px dashed #000;
      text-align: center;
    }
    .city-info-container .city-info {
      margin-left: 20px;
      margin-right: 20px;
      margin-top: 10px;
    }
    .city-info-container .city-info .name{
      font-size: 16px;
    }
    .city-info-container .carrier-flex {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      margin-top: 5px;
      border-radius: 5px;
      padding-top: 5px;
      padding-bottom: 5px;
      background: #fff;
    }
    .city-info-container .carrier-flex .carrier-infos{
      padding-left: 8px;
      padding-right: 8px;
      flex-grow: 1;
    }
    .city-info-container .carrier-flex .carrier-infos + .carrier-infos{
      border-left: 1px dashed #bbb;
    }
    .first {
      background: rgba(255, 215, 0, .5);
    }
    .second {
      background: rgba(169, 169, 169, .5);
    }
    .third {
      background: rgba(210, 105, 30, .5);
    }
  </style>
</head>
<body>
  <div class="trade-card">
    <div class="good-name">${cityInfo.name} - ${name}</div>
    <div class="info-flex">
      <div class="good-info">
        <p>单个箱位容量: ${blockLimit}</p>
        <p>单个重量: ${weight}</p>
      </div>
      <div class="carrier-info">
        ${carrierInfo.map(x => `<p>${x.name}: ${x.count}</p>`).join('')}
      </div>
    </div>
    <div class="city-info-container">
      <div class="label">各村落市价</div>
      ${allCityDesc.map(city => `
        <div class="city-info">
          <div class="name">${city.name} ( ${city.profit > 0 ? `<span style="color: #d40000; font-weight: bold">+ ${city.profit}</span>` : '<span style="color: #0f97f8; font-weight: bold">无利润</span>'} )</div>
          ${city.profit > 0 ? `
            <div class="carrier-flex">
              ${city.item.map(ci => `
                <div class="carrier-infos">
                  <div class="carrier-name">${ci.name} (${ci.time}s)</div>
                  <div class="carrier-item-desc">
                    <div class="${['', 'first', 'second', 'third'][ci.expRank]}">总经验:${ci.exp} (${ci.expRank})</div>
                    <div class="${['', 'first', 'second', 'third'][ci.expAvgRank]}">每秒经验:${ci.expAvg} (${ci.expAvgRank})</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
          <div class="carrier-flex">
            <div class="carrier-infos">该城市没有利润</div>
          </div>
          `}
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`
  let output = path.join(IMAGE_DATA, 'mabi_trade', `trade.png`)
  // let output = './trade.png'
  nodeHtmlToImage({
    output,
    html
  })
    .then(() => {
      console.log(`保存trade.png成功！`)
      let imgMsg = `[CQ:image,file=${path.join('send', 'mabi_trade', `trade.png`)}]`
      callback(imgMsg)
    })

}

module.exports = {
  trade
}
