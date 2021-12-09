const util = require('util')
const request=require('request')
const requestPromise = util.promisify(request)

let areaQuery = {}

const fetchTencentApi = async msg => {
  let data
  if(!Object.keys(areaQuery).length) {
    data = await fetchData()
  }
  let checked = checkArea(msg)

  // console.log(checked)

  if(checked.length) {
    if(!data) {
      data = await fetchData()
    }
    let out = []
    checked.forEach(query => {
      let q = areaQuery[query], item = {}, itemData = data.areaTree[0]
      if(q.prov) {
        itemData = itemData.children.find(x => x.name == q.prov)
      }
      itemData = itemData.children.find(x => x.name == q.name)
      item.data = itemData
      item = Object.assign(q, {queryName: query}, item)
      out.push(item)
    })
    return out
  } else {
    return []
  }
}

const checkArea = area => Object.keys(areaQuery).filter(x => x.match(new RegExp(area, 'g')))

const fetchData = async () => {
  let res = await requestPromise('https://view.inews.qq.com/g2/getOnsInfo?name=disease_h5')
  res = JSON.parse(JSON.parse(res.body).data)
  updateQuery(res)
  return res
}

const updateQuery = data => {
  if(
    data.areaTree &&
    data.areaTree.length &&
    data.areaTree[0] &&
    data.areaTree[0].children &&
    data.areaTree[0].children.length
  ) {
    data.areaTree[0].children.forEach(prov => {
      areaQuery[prov.name] = { prov: null, name: prov.name }
      if(prov.children && prov.children.length) {
        prov.children.forEach(city => {
          if(new Set(['境外输入', '地区待确认']).has(city.name)) {
            areaQuery[`${city.name}-${prov.name}`] = { prov: prov.name, name: city.name }
          } else {
            areaQuery[city.name] = { prov: prov.name }
          }
        })
      }
    })
  }
}

module.exports = {
  fetchTencentApi
}


