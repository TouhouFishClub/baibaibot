var AipOcrClient = require("baidu-aip-sdk").ocr;
// 设置APPID/AK/SK
var APP_ID = "14220224";
var API_KEY = "5ziuCkS0e1uIXhqt9ogb0Rvw";
var SECRET_KEY = "LnqYm0ffWaNgdS5AlhvaGPl5D2FSFbXC";
var client = new AipOcrClient(APP_ID, API_KEY, SECRET_KEY);



function baiduocr(url,callback) {
  // var url = "https://gchat.qpic.cn/gchatpic_new/799018865/727605874-2709565858-EED85D67165766654DE3EBCEC0834637/0?term=2";
  client.generalBasicUrl(url).then(function (result) {
    var wds = result.words_result;
    console.log(result);
    var ret = '';
    for(var i=0;i<wds.length;i++){
      var wd = wds[i].words;
      ret = ret + wd + '\n';
    }
    callback(ret.trim());
  }).catch(function (err) {
    console.log(err);
  });
}


module.exports={
  baiduocr
}

