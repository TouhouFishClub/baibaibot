const http = require('http')

module.exports = function(content, callback) {
  http.get({
    host: 'interface.sina.cn',
    port: 80,
    path: '/news/wap/fymap2020_data.d.json',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36'
    },
  }, res => {
    let chunk = ''
    res.on('data', data => chunk += data)
    res.on('end', () => {
      let allData = JSON.parse(chunk), str = ''
      if(content.trim()) {
        let area = allData.data.list.find(ele => new RegExp(content).test(ele.name))
        if(area) {
          str += `(${area.name})`
          str += `${allData.data.times}\n`
          str += `更新时间：${allData.data.mtime}\n`
          str += `累计确诊：${area.value}(${area.adddaily.conadd.trim()})\n`
          str += `现有确诊：${area.value - area.cureNum - area.deathNum}\n`
          str += `现有疑似：${area.susNum}\n`
          str += `累计死亡：${area.deathNum}(${area.adddaily.deathadd.trim()})\n`
          str += `累计治愈：${area.cureNum}(${area.adddaily.cureadd.trim()})\n`
          callback(str)
        } else {
          callback(`未找到相关地名，仅支持省、直辖市、特别行政区`)
        }
      } else {
        str += `(全国)`
        str += `${allData.data.times}\n`
        str += `更新时间：${allData.data.mtime}\n`
        str += `累计确诊：${allData.data.gntotal}(${allData.data.add_daily.addcon_new.trim()})\n`
        str += `现有确诊：${allData.data.gntotal - allData.data.deathtotal - allData.data.curetotal}\n`
        str += `现有疑似：${allData.data.sustotal}(${allData.data.add_daily.wjw_addsus_new.trim()})\n`
        str += `累计死亡：${allData.data.deathtotal}(${allData.data.add_daily.adddeath_new.trim()})\n`
        str += `累计治愈：${allData.data.curetotal}(${allData.data.add_daily.addcure_new.trim()})\n`
        callback(str)
      }
    })
  }).on('error', e => {
    console.log(e)
  })
}