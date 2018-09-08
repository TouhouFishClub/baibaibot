const MAX_DICE_SURFACE = 10000
const MAX_DICE_NUMBER = 20
module.exports = function(content, callback){
  const errorRand = () => {
    callback('输入错误')
  }
  if(!/^\d+(x\d+){0,1}$/.test(content)){
    errorRand()
    return
  }
  let sp = content.split('x').map(x => x.trim())
  if(sp[0] > MAX_DICE_SURFACE || sp[1] > MAX_DICE_NUMBER){
    errorRand()
    return
  }
  let randomArr = []
  for(let i = 0; i < (parseInt(sp[1]) || 1); i ++){
    randomArr.push(Math.ceil(Math.random() * parseInt(sp[0])))
  }
  callback(`您掷出的点数为${randomArr.join(', ')}\n总计：${randomArr.reduce((p, c) => p + c)}点\n最大点数：${sp[0] * randomArr.length}(${((randomArr.reduce((p, c) => p + c)) / (sp[0] * randomArr.length) * 100).toFixed(2)}%)`)
}