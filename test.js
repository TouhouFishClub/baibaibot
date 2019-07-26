const {  handleGun,  addplayer,  init,  generateImage} = require('./ai/games/survival/main');
var callback = function(r){console.log(r)}
handleGun("俄罗斯轮盘","qq1","nam1","g1",callback)
addplayer("qq1","nam1","g1",callback);
addplayer("qq2","nam2","g1",callback);
addplayer("qq3","nam3","g1",callback);
addplayer("qq4","nam4","g1",callback);
addplayer("qq5","nam5","g1",callback);
addplayer("qq6","nam6","g1",callback);
init(callback);
