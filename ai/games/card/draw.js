var http = require('http');
var https = require('https');
var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';
var fs = require('fs');

function drawNameCard(username,qq,callback){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_card = db.collection('cl_card');
    cl_card.aggregate([{'$sample':{'size':1}}], function(err, data) {
      console.log(data);
      var ud = data[0];
      var name = ud._id;
      var ret = '【'+username+'】'+'抽到了：'+name+'\n';
      var cb=function(detailjson){
        console.log(detailjson);
        var img = detailjson.img;
        var tdata = detailjson.t;
        tdata=tdata.replace(/&nbsp;/g,'').replace(/&quot;/g,'"').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&#160;/g,'<');
        callback(ret+'[CQ:image,file='+img+']'+'\n'+tdata);
      }
      if(data.detail){
        cb(data.detail);
      }else{
        getDetailByName(cl_card,name,data.href,cb);
      }
    });
  });
}

function getDetailByName(cl_card,name,href,callback){
  var option = {
    host: 'zh.moegirl.org',
    port: 443,
    method: 'GET',
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36'
    },
    path: '/'+encodeURIComponent(name)
  };
  //console.log(option)
  var req = https.request(option, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      var s=resdata;
      var l1 = '<div itemscope=';
      var n1 = s.indexOf(l1);
      var s1 = resdata.substring(n1+l1.length);
      var n2 = s1.indexOf('</div>');
      if(n1<0){
        n1 = s.indexOf('<table border="1" align="right"');
        s1 = s.substring(n1+20);
        n2 = s1.indexOf('</table>');
      }
      var tb = s1.substring(0,n2);
      var s = tb;
      var line=0;
      var imgsrc;
      var tdata="";
      while(true){
        var n3 = s.indexOf('<tr');
        var n4 = s.indexOf('</tr>');
        var row = s.substring(n3,n4);
        console.log(n3,n4);
        if(line==0){
          var n5 = row.indexOf('https://img.moegirl.org');
          if(n5>0){
            var s51 = row.substring(n5);
            var n6 = s51.indexOf('"');
            imgsrc = s51.substring(0,n6);
          }
        }
        s=s.substring(n4+5);
        tdata=tdata+getinner(row).trim()+"\n";
        if(n3<0){
          break;
        }else{
          line++;
        }
      }
      //cl_card.updateOne({'_id':name},{'$set':{detail:{img:imgsrc,t:tdata},ts:new Date()}});
      callback({img:imgsrc,t:tdata});
    });
    res.on('error',function(){
      callback('爆炸啦喵');
    })
  });
  req.setTimeout(10000,function(){
    req.end();
    var ret = {};
    callback(ret);
  });
  req.end();

}

function getinner(s){
  var isinner=0;
  var rn = 0;
  var ret = "";
  for(var i=0;i<s.length;i++){
    if(isinner==0&&s[i]==">"){
      isinner=1;
      ret = ret + " "
    }else if(isinner==1&&s[i]=="<"){
      isinner=0;
    }else if(isinner){
      if(s[i]==" "||s[i]=="\n"){
        if(rn==0){
          //ret=ret+s[i];
        }
        rn=1;
      }else{
        ret=ret+s[i];
        rn=0;
      }
    }
  }

  return ret;
}


module.exports={
  drawNameCard,
  getDetailByName
}
