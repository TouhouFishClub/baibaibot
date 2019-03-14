const bm = require('./ai/Bomberman')

callback = msg => {
  console.log(msg)
}

bm('炸弹人', '001', '001', '19', callback)
bm('加入', '001', '001', '19', callback)
bm('加入', '002', '002', '19', callback)
bm('加入', '003', '003', '19', callback)
bm('加入', '004', '004', '19', callback)