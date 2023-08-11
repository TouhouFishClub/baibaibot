var fs = require('fs');
var MongoClient = require('mongodb').MongoClient;
var mongourl = require('../../baibaiConfigs').mongourl;
const {IMAGE_DATA,RECORD_DATA} = require('../../baibaiConfigs');


let saveImage = function(url){
  var now = new Date();
  var rd = Math.floor(Math.random()*8888+1000);
  var filename = "/save/"+now.getTime()+rd+".png";
  var req = request({
    url: url,
    method: "GET"
  }, function(error, response, body){
    if(error&&error.code){
      console.log('pipe error catched!')
      console.log(error);
    }
  }).pipe(fs.createWriteStream(filename));
  req.on('close',function(){
    console.log(filename);
  });
  var image = '[CQ:image,file=send/save/'+now.getTime()+rd+'.png]';
  return image;
}

var udb;
initDB();
function initDB(){
  MongoClient.connect(mongourl, function(err, db) {
    udb=db;
    alermTimer();
  });
}



function handleSaveCard(content,qq,callback){
  if(content.startsWith("狗牌[CQ:image")){
    var s = content.substring(2);

    var ra = "";
    var s1 = s;
    var n = s1.indexOf("[CQ:image");
    var imglist = [];
    while (n >= 0) {
      var n1 = s1.indexOf(']');
      var head = s1.substring(0, n);
      var tail = s1.substring(n1 + 1);
      var image = s1.substring(n, n1 + 1);
      var n2 = image.indexOf("https://gchat.qpic.cn");
      var n22 = image.indexOf("http://gchat.qpic.cn");
      if(n22>=0&&n2<0){
        n2=n22;
      }
      if (n2 > 0) {
        var n3 = image.indexOf("?");
        var url = image.substring(n2, n3);
        image = saveImage(url);
        imglist.push(image);
      }
      s1 = tail;
      n = s1.indexOf("[CQ:image");
      ra = ra + head + image;
    }
    ra = ra + s1;




  }
}