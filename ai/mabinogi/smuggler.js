const https = require('https');
const _ = require('lodash')
const { drawTxtImage } = require('../../cq/drawImageBytxt')
const path = require('path-extra')

const fixArea = {
  "アブネアネア湖の北西": {name: "内尔湖西北", imgNum: 1, img: 'ab_hokusei.png'},
  "アブネアネア湖の南東": {name: "内尔湖东南", imgNum: 2, img: 'ab_nanto.png'},
  "アブネアネア湖西": {name: "内尔湖西", imgNum: 3, img: 'ab_nishi.png'},
  "アブネアネア湖の南西": {name: "内尔湖西南", imgNum: 4, img: 'ab_nansei.png'},
  "ブラゴ平原レザール醸造場": {name: "列扎尔酿酒厂", imgNum: 5, img: 'bu_rez.png'},
  "ブラゴ平原東": {name: "布拉格平原东", imgNum: 6, img: 'bu_higashi.png'},
  "ブラゴ平原の北西": {name: "布拉格平原西北", imgNum: 7, img: 'bu_hokusei.png'},
  "ブラゴ平原北": {name: "布拉格平原北", imgNum: 8, img: 'bu_kita.png'},
  "ガイレフの丘ラインアルトの南東": {name: "盖尔茨丘陵东南", imgNum: 9, img: 'gai_line_nanto.png'},
  "ガイレフの丘ラインアルトの南": {name: "盖尔茨丘陵南", imgNum: 10, img: ''},
  "ガイレフの丘フィアードダンジョン": {name: "盖尔茨丘陵 菲奥娜地下城", imgNum: 11, img: 'gai_fia.png'},
  "トゥガルドアイル伐採キャンプ東": {name: "杜加德伐木场东", imgNum: 12, img: 'tug_camp_nanto.png'},
  "コリブ渓谷北": {name: "考利芙峡谷北", imgNum: 13, img: 'co_kita.png'},
  "コリブ渓谷南": {name: "考利芙峡谷南", imgNum: 14, img: 'co_minami.png'},
  "スリアブクィリンの岩石地帯東": {name: "斯利比岩石地带东", imgNum: 15, img: 'cu_ga_higashi.png'},
  "スリアブクィリンの岩石地帯":{name: "斯利比岩石地带", imgNum: 16, img: 'cu_ga.png'},
  "スリアブクィリン西": {name: "斯利比西", imgNum: 17, img: 'cu_nishi.png'},
  "スリアブクィリンの岩石地帯西": {name: "斯利比岩石地带西南", imgNum: 18, img: 'cu_ga_nishi.png'},
  "タルティーン南": {name: "塔汀南", imgNum: 19, img: 'taru_minami.png'},
  "タルティーンの南西": {name: "塔汀西南", imgNum: 20, img: 'taru_nansei.png'},
  "タルティーンストーンヘンジ西": {name: "塔汀巨石群西", imgNum: 21, img: 'taru_st_nishi.png'},
  "タルティーン墓地": {name: "塔汀墓地", imgNum: 22, img: 'taru_bo.png'},
  "センマイ平原北": {name: "仙魔平原北", imgNum: 23, img: 'sen_kita.png'},
  "センマイ平原ペッカダンジョン": {name: "皮卡地下城边", imgNum: 24, img: 'sen_pecca.png'},
  "センマイ平原の南東": {name: "仙魔平原东南", imgNum: 25, img: 'sen_nanto.png'},
  "センマイ平原南": {name: "仙魔平原南", imgNum: 26, img: 'sen_minami.png'},
  "センマイ平原の北西": {name: "仙魔平原西北", imgNum: 27, img: 'sen_hokusei.png'},
  "トゥガルドアイルの東": {name: "杜加德走廊东", imgNum: 28, img: ''},
  "トゥガルドアイルの南東": {name: "杜加德走廊东南", imgNum: 29, img: 'tug_nanto.png'},
  "トゥガルドアイルの南": {name: "杜加德走廊南", imgNum: 30, img: ''}
}
const fixProduct = {
  "ベビーポーション": {name: "婴儿药水(迪尔科内尔)", imgNum: 1, img: ''},
  "ダイエットポーション": {name: "减肥药水(迪尔科内尔)", imgNum: 2, img: ''},
  "いびき防止ポーション": {name: "预防打鼾药(迪尔科内尔)", imgNum: 3, img: ''},
  "人参ポーション": {name: "人参药水(迪尔科内尔)", imgNum: 4, img: ''},
  "蜘蛛の糸グローブ": {name: "蜘蛛丝手套(敦巴伦)", imgNum: 5, img: ''},
  "羊毛ブーツ": {name: "羊毛靴(敦巴伦)", imgNum: 6, img: ''},
  "オーガキラーの仮面": {name: "食人魔屠夫假面(敦巴伦)", imgNum: 7, img: ''},
  "インキュバススーツ": {name: "男妖正装(敦巴伦)", imgNum: 8, img: ''},
  "バンホール産石炭": {name: "班格的煤炭(班格)", imgNum: 9, img: ''},
  "大理石": {name: "大理石(班格)", imgNum: 10, img: ''},
  "黄水晶": {name: "黄水晶(班格)", imgNum: 11, img: ''},
  "ハイランダー鉱石": {name: "苏格兰高地矿石(班格)", imgNum: 12, img: ''},
  "ベリーグラノーラ": {name: "威化(艾明码恰)", imgNum: 13, img: ''},
  "バタービール": {name: "啤酒(艾明码恰)", imgNum: 14, img: ''},
  "野生動物の燻製": {name: "熏制的野味(艾明码恰)", imgNum: 15, img: ''},
  "トリュフパスタ": {name: "蘑菇意大利面(艾明码恰)", imgNum: 16, img: ''},
  "熱気の結晶": {name: "热气结晶(塔汀)", imgNum: 17, img: ''},
  "オルゴール保存石": {name: "音乐盒保存石(塔汀)", imgNum: 18, img: ''},
  "パララの結晶": {name: "帕拉鲁结晶(塔汀)", imgNum: 19, img: ''},
  "円形防護壁の結晶": {name: "环形栅栏结晶(塔汀)", imgNum: 20, img: ''},
  "ミニ化粧台": {name: "迷你梳妆台(塔拉)", imgNum: 21, img: ''},
  "ティーテーブル": {name: "茶几(塔拉)", imgNum: 22, img: ''},
  "ロッキングチェア": {name: "摇椅(塔拉)", imgNum: 23, img: ''},
  "子供用2段ベッド": {name: "儿童双层床(塔拉)", imgNum: 24, img: ''},
  "カブ産海苔": {name: "卡普海苔(卡普港口)", imgNum: 25, img: ''},
  "カブ産カキ": {name: "卡普海贝(卡普港口)", imgNum: 26, img: ''},
  "フカヒレ": {name: "鲨鱼翅(卡普港口)", imgNum: 27, img: ''},
  "ゼリークラゲ": {name: "海蜇(卡普港口)", imgNum: 28, img: ''},
  "鉄鞭": {name: "铁鞭(贝尔法斯特)", imgNum: 29, img: ''},
  "ダークソード": {name: "黑光剑(贝尔法斯特)", imgNum: 30, img: ''},
  "金庫": {name: "金库(贝尔法斯特)", imgNum: 31, img: ''},
  "スケルトンオーガアーマー": {name: "骷髅食人魔铠甲(贝尔法斯特)", imgNum: 32, img: ''}
}

const getData = dateTs => new Promise(resolve => {
  let dateObj = new Date(dateTs), dateStr = `${dateObj.getFullYear()}-${addZero(dateObj.getMonth() + 1)}-${addZero(dateObj.getDate())}`
  // console.log(`===== GET ${dateStr} DATA =====`)
  https.get(`https://weather.erinn.biz/smuggler.php?target_ymd=${dateStr}`, res => {
    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', chunk => {
      rawData += chunk;
    });
    res.on('end', () => {
      try {
        let str = rawData, list = []
        while (true) {
          let index = str.indexOf('<TD class="tblname" width="150">')
          if (index + 1) {
            str = str.substr(index)
            let thumbStr = str.substring(0, str.indexOf('</TR>'))
              , time = thumbStr.substring(32, 40)
              , now = new Date()
              , timestamp = new Date(`${dateStr} ${time}`).getTime()
              , area = thumbStr.substring(thumbStr.indexOf('target="_blank">') + 16, thumbStr.indexOf('</a></TD>')).trim()
              , product = thumbStr.substring(thumbStr.indexOf('<TD bgcolor="#ffffff"><font style="') + 51, thumbStr.indexOf('</font>')).trim()
            str = str.substr(str.indexOf('</TR>'))
            list.push({
              time: time,
              timeStamp: timestamp,
              timeObj: new Date(timestamp),
              startTime: timestamp + 4 * 60 * 1000,
              endTime: timestamp + 4 * 60 * 1000 + 12 * 60 * 1000,
              area: fixArea[area] ? fixArea[area].name : area,
              areaImg: fixArea[area] ? fixArea[area].img : '',
              product: fixProduct[product] ? fixProduct[product].name : product
            })
          } else {
            break
          }
        }
        resolve(list)
      } catch (e) {
        console.log('===== MABINOGI SMUGGLER FETCH ERROR!!! =====')
        console.error(e);
        resolve([])
      }
    })
    res.on('error', e => {
      console.log('===== MABINOGI SMUGGLER ERROR!!! =====')
      console.log(e.message)
      resolve([])
    })
  })
})

module.exports = async function (callback) {
  let FixDay = Date.now() + 60 * 60 * 1000
  let yesterday = Date.now() - 23 *  60 * 60 * 1000
  let list1 = await getData(FixDay)
  let list2 = await getData(yesterday)
  let list = list2.concat(list1)
  list.sort((a, b) => b.startTime - a.startTime)
  // console.log(list)
  if(list.length) {
    let nowObj, nextObj, isShow = false
    list.forEach((ele, i) => {
      if(Date.now() > ele.endTime){
        // console.log('===')
        // console.log(i)
        nowObj = nowObj || list[i - 1]
        nextObj = nextObj || list[i - 2]
      }
    })
    let now = new Date()
    if(!nowObj) {
      callback('服务器维护中')
      return
    }
    if(now.getTime() > nowObj.startTime && now.getTime() < nowObj.endTime){
      isShow = true
    }
    let callbackStr = ''
    if(nowObj.endTime < now.getTime()){
      callbackStr = '服务器维护中'
    } else {
      callbackStr = `【走私查询】拜伦${isShow ? '出现中': '未出现'}\n`
      if(isShow){
        callbackStr += `消失时间：${formatTime(nowObj.endTime)}（${formatTimeOffset(nowObj.endTime - now.getTime())}后消失）\n`
      } else {
        callbackStr += `本次出现时间：${formatTime(nowObj.startTime)} - ${formatTime(nowObj.endTime)}（${formatTimeOffset(nowObj.startTime - now.getTime())}后出现）\n`
      }
      callbackStr += `【交易物品】：${nowObj.product}\n【交易地点】：${nowObj.area}\n`
      if(nextObj){
        callbackStr += `\n下次出现时间：${formatTime(nextObj.startTime)} - ${formatTime(nextObj.endTime)}\n【交易物品】：${nextObj.product}\n【交易地点】：${nextObj.area}`
      }
    }

    let other = ''
    if(nowObj && nowObj.areaImg) {
      let dir = path.join(__dirname, 'smugglerImg/area', nowObj.areaImg)
      // console.log(`\n\n\n\n\n\n\n\n${dir}\n\n\n\n\n\n\n`)
      other = `[CQ:image,file=file:${dir}]`
    }
    drawTxtImage(other, callbackStr, callback, {color: 'black', font: 'STXIHEI.TTF'})
    // callback(callbackStr)
  }
}
const formatTime = ts => `${new Date(ts).getHours()}:${addZero(new Date(ts).getMinutes())}:${addZero(new Date(ts).getSeconds())}`
const addZero = n => n < 10 ? ('0' + n) : n
const formatTimeOffset = ts => `${~~(ts / 1000 / 60)}分${addZero(~~(ts / 1000 % 60))}秒`