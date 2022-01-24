const md5 = require("md5")
const {horoscope} = require("./zodiac");

module.exports = function(type, qq, callback, other){
  let str = `${other || qq}${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`
  let md = md5(str)
  let rp = parseInt(md.substring(0, 15), 16).toString().split('').reduce((p, c) => p + parseInt(c), 0)
  let rpFixType = parseInt(md.substring(15, 16), 16) % 3
  let rpFix = parseInt(md.substring(16, 20), 16).toString().split('').reduce((p, c) => p + parseInt(c), 0)
  switch (rpFixType){
    case 0:
      rp += rpFix
      break
    case 1:
      rp -= rpFix
      break
  }
  if(rp < 0){
    rp = Math.abs(rp)
  }
  if(rp > 100){
    if(rp > 105){
      rp = 100 - (rp - 105)
    }
    else {
      rp = 100
    }
  }
  if(type == 'ignoreDesc') {
    callback(`[CQ:at,qq=${qq}] 今天的运势指数是 ${rp}% ！\n${new Array(rp).fill('|').join('')}`)
    return
  }
  if(other) {
    callback(`[CQ:at,qq=${other}] 今天的运势指数是 ${rp}% ！\n${new Array(rp).fill('|').join('')}`)
    return
  }
  var text = `[CQ:at,qq=${qq}] 今天的运势指数是 ${rp}% ！\n${new Array(rp).fill('|').join('')}`
  runtarot(qq,text,callback);
}

function runtarot(qq,text,callback){
  let str = `${qq}${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`
  let md = md5(str)
  let rp = parseInt(md.substring(0, 15), 16).toString().split('').reduce((p, c) => p + parseInt(c), 0)
  var rpfix = rp % 44;
  var name = tarotIndex[Math.floor(rpfix/2)];
  var desp = tarot[name][rpfix%2];
  callback(text+'\n占卜\n'+name+" "+desp);
  horoscope(qq,callback);
}


const tarot = { '愚者':
  [ '正位：无忧无虑、轻松愉快。古怪、与众不同。不成熟。出乎意料的。',
    '逆位：奇特的习惯。精神错乱、胡言乱语。疯狂、发怒。狂喜、陶醉。' ],
  '魔法师': [ '正位：自愿、乐意。自治、独立。技术、熟练。精明、灵敏。外交、交际。', '逆位：说谎。攀权附贵。诡计、谋略、耍花招。' ],
  '女祭司长': [ '正位：学习、研究。直觉。秘密。信念、信赖。神秘。', '逆位：无知。偏见。歇斯底里。' ],
  '女帝': [ '正位：肥沃、多产。理解。交换意见。帮助、分享。怀孕。', '逆位：愚蠢。不孕。轻薄、无趣。' ],
  '皇帝': [ '正位：稳定、安定。力量。权力。守护、保卫。', '逆位：注视着伟大的事物。傲慢、自大。敌对、反抗。' ],
  '法皇': [ '正位：灵感。慈悲、仁爱。慰藉、援助、解救。有耐心。依循传统。', '逆位：仇恨、憎恨。无法宽容。不道德、邪恶。' ],
  '恋人':
    [ '正位：选择。企图、尝试。检查、调查。缔结、婚约、订约。合并、结合、合而为一。',
      '逆位：不守誓约、通奸、外遇。分离。优柔寡断。' ],
  '战车': [ '正位：胜利。经营的技能。公众人物、大众认可。', '逆位：失败。无能。失误。' ],
  '正义': [ '正位：冷静、明智。法律。逻辑、有道理的。划分阶级。', '逆位：不公平、失去正义。法律问题。混乱、没有秩序。' ],
  '隐者': [ '正位：谨慎、慎重。沉思、冥想。孤独、隐居。寂静、无声。', '逆位：顾影自怜。妒忌。拖延、延迟、耽搁。' ],
  '命运之轮': [ '正位：轮流、交替。大自然的循环。改变。好机会。', '逆位：不稳定。失去优势。' ],
  '力量': [ '正位：活力、能量。道德勇气。棘手的工作、强健的工作。勇敢。', '逆位：怠惰、懒散。冲动。虚弱、软弱。' ],
  '吊人': [ '正位：牺牲、奉献。理想化、理想主义。有利他人的行为、利他主义。对神秘事物的狂热份子。', '逆位：无能。生病。' ],
  '死神': [ '正位：结束。突然的且激烈的改变。开始。', '逆位：危险的阻碍、令人担心的难关。逆境。' ],
  '节制': [ '正位：温和、适度。适应、通融。足够的休息、有益健康的休养。关心。', '逆位：焦虑、挂念。不舒服、不愿意。' ],
  '恶魔': [ '正位：本能、天性。魅力、吸引力。感官享受、好色。暗示。', '逆位：堕落、曲解。不安、烦乱。憎恨、讨厌。' ],
  '塔': [ '正位：逃避、避免。仓促的起程。流放、流亡。粉碎必然的事物、打破习惯传统。危险。', '逆位：事故、灾难。毁灭。混乱。' ],
  '星': [ '正位：希望。明显的指引。新的想法。和平、和睦。', '逆位：不幸的征召。辞职、放弃。' ],
  '月': [ '正位：梦。幻觉。冒险。不可思议的遭遇。旅行。', '逆位：危险。邪恶。谎言。' ],
  '太阳': [ '正位：同意、一致。友善、友谊。爱。荣誉。欢乐。', '逆位：痛苦、不幸。利己主义、自我中心。易怒。' ],
  '审判': [ '正位：复活、回复、更新。生日、出生。觉醒。重新获得、恢复。', '逆位：怀疑、不相信。悔恨、懊悔、遗憾。生病。' ],
  '世界': [ '正位：报答、奖赏、结果。完美。成功。继承、遗传、传统。时间、一段时光。', '逆位：延期、拖延。迷惑、欺骗。失败。' ] }
const tarotIndex = Object.keys(tarot);





















