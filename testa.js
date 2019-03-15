const bm = require('./ai/Bomberman')

callback = msg => {
  console.log(msg)
}

bm('炸弹人', '001', '001', '19', callback)
bm('参加', '001', '001', '19', callback)
bm('参加', '002', '002', '19', callback)
bm('参加', '003', '003', '19', callback)
bm('参加', '004', '004', '19', callback)
setTimeout(() => {
  // bm('放置', '001', '001', '19', callback)
}, 100)
setTimeout(() => {
  bm('移动', '002', '002', '19', callback)
}, 200)
setTimeout(() => {
  bm('放置', '002', '002', '19', callback)
}, 300)
setTimeout(() => {
  bm('移动', '002', '002', '19', callback)
}, 400)
setTimeout(() => {
  bm('待机', '003', '003', '19', callback)
}, 500)
setTimeout(() => {
  bm('移动', '004', '004', '19', callback)
}, 600)
setTimeout(() => {
}, 700)
setTimeout(() => {
}, 800)
setTimeout(() => {
  // bm('放置', '001', '001', '19', callback)
}, 5100)
setTimeout(() => {
  bm('放置', '002', '002', '19', callback)
}, 5200)
setTimeout(() => {
  bm('放置', '002', '002', '19', callback)
}, 5300)
setTimeout(() => {
  bm('放置', '002', '002', '19', callback)
}, 5400)
setTimeout(() => {
  bm('放置', '003', '003', '19', callback)
}, 5500)
setTimeout(() => {
  bm('放置', '004', '004', '19', callback)
}, 5600)
setTimeout(() => {
}, 5700)
setTimeout(() => {
}, 5800)