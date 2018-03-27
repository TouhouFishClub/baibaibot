const http = require('http');
const _ = require('lodash')

module.exports = function (callback) {
  http.get('http://weather.erinn.biz/smuggler.php', res => {
    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', chunk => {
      rawData += chunk;
    });
    res.on('end', () => {
      try {
        let str = rawData, list = []
        let fixArea = {
          "アブネアネア湖の北西": "内尔湖西北",
          "アブネアネア湖の南東": "内尔湖东南",
          "アブネアネア湖西": "内尔湖西",
          "アブネアネア湖の南西": "内尔湖西南",
          "ブラゴ平原レザール醸造場": "列扎尔酿酒厂",
          "ブラゴ平原東": "布拉格平原东",
          "ブラゴ平原の北西": "布拉格平原西北",
          "ブラゴ平原北": "布拉格平原北",
          "ガイレフの丘ラインアルトの南東": "盖尔茨丘陵东南",
          "ガイレフの丘ラインアルトの南": "盖尔茨丘陵南",
          "トゥガルドアイル伐採キャンプ東": "菲奥娜地下城边",
          "コリブ渓谷北": "考利芙峡谷北",
          "コリブ渓谷南": "考利芙峡谷南",
          "スリアブクィリンの岩石地帯東": "斯利比岩石地带东",
          "スリアブクィリンの岩石地帯": "斯利比岩石地带",
          "スリアブクィリン西": "斯利比西",
          "スリアブクィリンの岩石地帯西": "斯利比岩石地带西南",
          "タルティーン南": "塔汀南",
          "タルティーンの南西": "塔汀西南",
          "タルティーンストーンヘンジ西": "塔汀巨石群西",
          "タルティーン墓地": "塔汀墓地",
          "センマイ平原北": "仙魔平原北",
          "センマイ平原ペッカダンジョン": "皮卡地下城边",
          "センマイ平原の南東": "仙魔平原东南",
          "センマイ平原南": "仙魔平原南",
          "センマイ平原の北西": "仙魔平原西北",
          "トゥガルドアイルの東": "杜加德走廊东",
          "トゥガルドアイルの南東": "杜加德走廊东南",
          "トゥガルドアイルの南": "杜加德走廊南"
        }
        let fixProduct = {
          "ベビーポーション": "婴儿药水(迪尔科内尔)",
          "ダイエットポーション": "减肥药水(迪尔科内尔)",
          "いびき防止ポーション": "预防打鼾药(迪尔科内尔)",
          "人参ポーション": "人参药水(迪尔科内尔)",
          "蜘蛛の糸グローブ": "蜘蛛丝手套(敦巴伦)",
          "羊毛ブーツ": "羊毛靴(敦巴伦)",
          "オーガキラーの仮面": "食人魔屠夫假面(敦巴伦)",
          "インキュバススーツ": "男妖正装(敦巴伦)",
          "バンホール産石炭": "班格的煤炭(班格)",
          "大理石": "大理石(班格)",
          "黄水晶": "黄水晶(班格)",
          "ハイランダー鉱石": "苏格兰高地矿石(班格)",
          "ベリーグラノーラ": "威化(艾明码恰)",
          "バタービール": "啤酒(艾明码恰)",
          "野生動物の燻製": "熏制的野味(艾明码恰)",
          "トリュフパスタ": "蘑菇意大利面(艾明码恰)",
          "熱気の結晶": "热气结晶(塔汀)",
          "オルゴール保存石": "音乐盒保存石(塔汀)",
          "パララの結晶": "帕拉鲁结晶(塔汀)",
          "円形防護壁の結晶": "环形栅栏结晶(塔汀)",
          "ミニ化粧台": "迷你梳妆台(塔拉)",
          "ティーテーブル": "茶几(塔拉)",
          "ロッキングチェア": "摇椅(塔拉)",
          "子供用2段ベッド": "儿童双层床(塔拉)",
          "カブ産海苔": "卡普海苔(卡普港口)",
          "カブ产カキ": "卡普海贝(卡普港口)",
          "フカヒレ": "鲨鱼翅(卡普港口)",
          "ゼリークラゲ": "海蜇(卡普港口)",
          "鉄鞭": "铁鞭(贝尔法斯特)",
          "ダークソード": "黑光剑(贝尔法斯特)",
          "金庫": "金库(贝尔法斯特)",
          "スケルトンオーガアーマー": "骷髅食人魔铠甲(贝尔法斯特)"
        }
        while (true) {
          let index = str.indexOf('<TD class="tblname" width="150">')
          if (index + 1) {
            str = str.substr(index)
            let thumbStr = str.substring(0, str.indexOf('</TR>'))
              , time = thumbStr.substring(32, 40)
              , now = new Date()
              , timestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...(time.split(':'))).getTime()
              , area = thumbStr.substring(thumbStr.indexOf('target="_blank">') + 16, thumbStr.indexOf('</a></TD>')).trim()
              , product = thumbStr.substring(thumbStr.indexOf('<TD bgcolor="#ffffff"><font style="') + 51, thumbStr.indexOf('</font>')).trim()
            str = str.substr(str.indexOf('</TR>'))
            list.push({
              time: time,
              timeStamp: timestamp,
              startTime: timestamp + 300000,
              endTime: timestamp + 1020000,
              area: fixArea[area] ? fixArea[area] : area,
              product: fixProduct[product] ? fixProduct[product] : product
            })
          } else {
            break
          }
        }
        let nowObj, nextObj, isShow = false
        list.forEach((ele, i) => {
          if(Date.now() > ele.endTime){
            nowObj = nowObj || list[i - 1]
            nextObj = nextObj || list[i - 2]
          }
        })
        let now = new Date()
        if(now.getTime() > nowObj.startTime && now.getTime() < nowObj.endTime){
          isShow = true
        }
        let callbackStr = `【走私查询】拜伦${isShow ? '出现中': '未出现'}\n`
        if(isShow){
          callbackStr += `消失时间：${formatTime(nowObj.endTime)}\n`
          callbackStr += `消失时间：${formatTime(nowObj.endTime)}\n`
        } else {
          callbackStr += `下次出现时间：${formatTime(nowObj.startTime)} - ${formatTime(nowObj.endTime)}\n`
        }
        callbackStr += `【交易物品】：${nowObj.product}\n【交易地点】：${nowObj.area}`
        callback(callbackStr)
      } catch (e) {
        console.error(e);
      }
    });
  })
}
const formatTime = ts => `${new Date(ts).getHours()}:${addZero(new Date(ts).getMinutes())}:${addZero(new Date(ts).getSeconds())}`
const addZero = n => n < 10 ? (0 + n) : n