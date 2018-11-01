const https = require('https')
var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';
var path = require('path');
var udb;
initDB();
function initDB(){
  MongoClient.connect(mongourl, function(err, db) {
    udb=db;
  });
}

function zodiac(content, callback) {
  let zo = changeCode(content.substr(0, 2))
  zrun(zo,callback);
}

function zrun(zo,callback){
  if(zo) {
    https.get({
      host: 'www.d1xz.net',
      port: 443,
      path: `/yunshi/today/${zo}/`,
      method: 'GET'
    }, (res) => {
      let chunk = ''
      res.on('data', data => chunk += data)
      res.on('end', () => {
        callback(renderText(formatData(chunk)))
      })
    }).on('error', (e) => {
      console.error(e);
    })
  } else {
    callback('没有找到这个星座哦')
  }
}

function horoscope(qq,callback){
  getMyZodiac(qq,function(astro){
    if(astro==0){
      callback('您还没有设定星座哦,输入【我的星座是xx座】设定自己的星座');
    }else{
      zrun(astro,callback);
    }
  });
}

function saveMyZodiac(content,qq,userName,callback){
  var n = content.indexOf('座');
  if(n>0){
    content=content.substring(0,n);
  }
  Code = changeCode(content)
  if(Code!=false){
    var cl_zodiac = udb.collection('cl_zodiac');
    cl_zodiac.save({'_id':qq,d:Code});
    callback('【'+userName+'】的星座是【'+content+'】,百百记住了哦');
  }else{
    callback('【'+userName+'】的星座是【'+content+'】,百百不知道那是什么星座哇');
  }
}

function getMyZodiac(qq,callback){
  var cl_zodiac = udb.collection('cl_zodiac');
  cl_zodiac.findOne({'_id':qq}, function(err, data) {
    if (data) {
      callback(data.d);
    } else {
      callback(0);
    }
  });
}

function changeCode(str) {
  switch(str) {
    case '白羊':
      return 'Aries'
    case '金牛':
      return 'Taurus'
    case '双子':
      return 'Gemini'
    case '巨蟹':
      return 'Cancer'
    case '狮子':
      return 'Leo'
    case '处女':
      return 'Virgo'
    case '天秤':
      return 'Libra'
    case '天蝎':
      return 'Scorpio'
    case '射手':
      return 'Sagittarius'
    case '摩羯':
      return 'Capricorn'
    case '水瓶':
      return 'Aquarius'
    case '双鱼':
      return 'Pisces'
    default:
      return false
  }
}

function renderText(obj){
  return `${obj.title}\n${obj.time}\n${obj.desc}\n感情（${obj.prop.feeling}） 财运（${obj.prop.luck}） 健康（${obj.prop.health}） 工作（${obj.prop.work}） 综合（${obj.prop.all}）\n${obj.other.map(val => `${val.info} : ${val.desc}`).join('\n')}`
}

function formatData(data) {
  let obj = {
    title: clipText(data, '<p class="title fb">', '</p>'),
    time: clipText(data, '<p class="time">', '</p>'),
    desc: clipText(data, '<div class="txt"><p>', '</p>'),
    prop: {
      feeling: clipText(data, '<b>感情</b>', '</strong>', -3),
      luck: clipText(data, '<b>财运</b>', '</strong>', -3),
      health: clipText(data, '<b>健康</b>', '</strong>', -3),
      work: clipText(data, '<b>工作</b>', '</strong>', -3),
      all: clipText(data, '<b>综合</b>', '</strong>', -3)
    },
    other: []
  }
  clipText(data, '<ul class="quan_yuan">', '</ul>').split('<li>').forEach(val => {
    if(val.indexOf('<div class="words_b">') + 1){
      obj.other.push({
        info: clipText(val, '<div class="words_b">', '</div>'),
        desc: clipText(val, '<div class="words_t">', '</div>')
      })
    }
  })
  return obj
}

function clipText(str, startTag, endTag, otherSetting) {
  let si = str.indexOf(startTag),
    ei = str.indexOf(endTag, si + startTag.length)
  return otherSetting ?
    (
      otherSetting > 0 ?
        str.substring(si + startTag.length + otherSetting, ei)
        :
        str.substring(ei + otherSetting, ei)
    )
    :
    str.substring(si + startTag.length, ei)
}


module.exports={
  saveMyZodiac,
  horoscope,
  zodiac
}
