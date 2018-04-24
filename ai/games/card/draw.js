var http = require('http');
var https = require('https');
var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';
var fs = require('fs');
var cache = {};
var gm = require('gm')
var request = require("request");
var imageMagick = gm.subClass({ imageMagick : true });
var {sendGmImage} = require('../../../cq/sendImage');

function drawNameCard(username,qq,callback,groupid){
  var now = new Date().getTime();
  console.log("1111+"+groupid);
  var cooldown;
  var maxtimes;
  if((groupid+"").startsWith("67096")){
    if(new Date().getHours()>7){
        cooldown = 60000*10;
        maxtimes=11;
    }else{
        cooldown = 60000*10;
        maxtimes=11;
    }
  }else if((groupid+"").startsWith("61614")||(groupid+"").startsWith("2057")){
    if(new Date().getHours()>7){
        cooldown = 60000*10;
        maxtimes=1;
    }else{
        cooldown = 60000*10;
        maxtimes=3;
    }
  }else{
    cooldown = 60000*10;
    maxtimes = 3;
  }
  if(cache[qq]){
    var then=cache[qq].ts;
    var cc=cache[qq].c;
    if(now-then<cooldown){
      if(cc>=maxtimes){
          callback('【'+username+'】抽卡太快了，休息一会吧，下次抽卡时间：'+new Date(then+cooldown).toLocaleString());
          return;
      }else{
        cache[qq]={ts:now,c:cc+1};
      }
    }else{
      cache[qq]={ts:now,c:1};
    }
  }else{
    cache[qq]={ts:now,c:1};
  }
  if(Math.random()<0.5){
    draw2df(qq,username,callback);
    return;
  }
  MongoClient.connect(mongourl, function(err, db) {
    var cl_card = db.collection('cl_card');
    var ag = [];
    if(true){};
    ag.push({'$sample':{'size':1}});
    cl_card.aggregate(ag, function(err, data) {
      console.log(data);
      var ud = data[0];
      var name = ud._id;
      var ret = '【'+username+'】'+'抽到了：'+name+'\n';
      saveCard(qq,name);
      var cb=function(detailjson){
        console.log(detailjson);
        var img = detailjson.img;
        var tdata = detailjson.t;
        if(tdata){
          tdata=tdata.replace(/&nbsp;/g,'').replace(/&quot;/g,'"').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&#160;/g,'<');
        }
        var cb2 = function(imgname){
          callback(ret+'[CQ:image,file='+imgname+']');
        }
        if(img&&tdata){
          generateImageByWords(img,tdata,cb2);
        }else{
          callback(ret);
        }
      }
      if(data.detail){
        cb(ud.detail);
        db.close();
      }else{
        getDetailByName(cl_card,name,data.href,cb,db);
      }
    });
  });
}

function getDetailByName(cl_card,name,href,callback,db){
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
        if(line<2){
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
      cl_card.updateOne({'_id':name},{'$set':{detail:{img:imgsrc,t:tdata},ts:new Date()}},function(){
        db.close();
      });
      callback({img:imgsrc,t:tdata});
    });
    res.on('error',function(){
      callback('爆炸啦喵');
    })
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
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

function saveCard(qq,cardName){
  var now = new Date().getTime();
  MongoClient.connect(mongourl, function(err, db) {
    var cl_ucard = db.collection('cl_ucard');
    var query = {'_id':qq};
    cl_ucard.findOne(query, function(err, data) {
      if(data){
        var cardObj = data.d;
        var len = Object.keys(cardObj).length;
        if(len<10){
          data.d[cardName]=now;
        }else{
          var tmpObj = data.tmp;
          var tmpArr = Object.keys(tmpObj);
          var tmplen = tmpArr.length;
          if(tmplen>10){
            tmpArr.sort(function(a,b){return tmpObj[a]-tmpObj[b]});
            delete(tmpObj[tmpArr[0]]);
          }
          data.tmp[cardName]=now;
        }
        cl_ucard.save(data);
      }else{
        var cd = {};
        cd[cardName]=now;
        cl_ucard.save({'_id':qq,d:cd,tmp:{}});
      }
      db.close();
    });
  });
}

function getCard(qq,userName,callback){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_ucard = db.collection('cl_ucard');
    var query = {'_id':qq};
    cl_ucard.findOne(query, function(err, data) {
      if(data){
        var cardObj = data.d;
        var ret = '【'+userName+'】的仓库：\n';
        for(var p in cardObj){
          ret = ret + p + ''+ ','+'';
        }
        ret = ret + '\n【'+userName+'】的手卡：\n';
        var tmpObj = data.tmp;
        for(var p in tmpObj){
          ret = ret + p + ','+'';
        }
        //ret = ret + '查卡请输入【查卡-卡名】，废弃请输入【弃卡-卡名】，临时手牌加入请输入【锁卡-卡名】';
        callback(ret);
      }else{
        callback('【'+userName+'】什么也没有');
      }
      db.close();
    });
  });
}

function generateImageByWords(img,wd,callback){
  if(img&&wd){
    var wa = wd.split('\n');
    var maxwd = 0;
    var uwd = 23;
    var uw = "";
    for(var i=0;i<wa.length;i++){
      var lw = wa[i];
      var ud = "";
      while(lw.length>uwd){
        ud = ud + lw.substring(0,uwd)+"\n";
        lw = lw.substring(uwd);
      }
      if(lw.length>0){
        uw = uw + ud +lw+"\n";
      }else{
        uw = uw + ud;
      }
    }
    var ua = uw.split('\n');
    for(var i=0;i<ua.length;i++){
      if(ua[i].length>maxwd){
        maxwd = ua[i].length;
      }
    }
    var len = ua.length;
    var imgname = new Date().getTime()+"";
    var folder = 'static/'
    try{
      var imgreq = request({
        url: img,
        method: "GET"
      }, function(error, response, body){
        if(error&&error.code){
          console.log('pipe error catched!')
          console.log(error);
        }
      }).pipe(fs.createWriteStream(folder + imgname));
      imgreq.on('error',function(err){
        console.log(err);
        console.log(img);
        callback("");
      })
      imgreq.on('close',function(){
        var img0 = new imageMagick(folder + imgname);
        var img1 = new imageMagick("static/blank.png");
        console.log("len:"+maxwd+":"+len);
        img1.resize(maxwd*19+29, len*21+29,'!') //加('!')强行把图片缩放成对应尺寸150*150！
          .autoOrient()
          .fontSize(20)
          .fill('blue')
          .font('./static/dfgw.ttf')
          .drawText(0,0,uw,'NorthWest')
          .write(folder+imgname+"_blank.jpg", function(err){
            img0.size(function(err,imgsize){
              console.log(imgsize);
              sendGmImage(img0.append(folder+imgname+"_blank.jpg",true),callback);
            });
          });
      });
    }catch(e){
      console.log('pipe error');
      console.log(e);
      callback();
    }

  }else{

  }
}

function draw2df(qq,username,callback){
  console.log('will draw 2df');
  MongoClient.connect(mongourl, function(err, db) {
    var cl_card_2df = db.collection('cl_card_2df');
    var ag = [];
    if(true){};
    ag.push({'$sample':{'size':1}});
    cl_card_2df.aggregate(ag, function(err, data) {
      var ud = data[0];
      var name = ud._id;
      var img = ud.img;
      var n = name.indexOf(':');
      var gamename = name.substring(0,n);
      var cd = name.substring(n+1);
      var n1 = cd.indexOf('cv');
      if(n1>0){
        cd = cd.substring(0,n1);
      }
      var ret = '【'+username+'】'+'抽到了：'+cd+'\n';
      var da = ud.d;
      var dr = "";
      var dc = 0;
      for(var i=0;i<da.length;i++){
        if(i==0){
          dr=da[i];
          dc = da[i].split('\n').length;
        }else{
          var nc = da[i].split('\n').length;
          if(dc+nc>22){
            break;
          }else{
            dc=dc+nc;
            dr=dr+"\n"+da[i];
          }
        }
      }
      saveCard(qq,name);
      var cb = function(imgname){
        callback(ret+'[CQ:image,file='+imgname+']');
      }
      if(img&&dr){
        var words = gamename+"\n"+dr;
        words=words.replace(/&nbsp;/g,'').replace(/&quot;/g,'"').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&#160;/g,'<');
        generateImageByWords(img,words,cb);
      }else{
        callback(ret);
      }
    });
  });
}



module.exports={
  drawNameCard,
  getDetailByName,
  getCard,
  draw2df
}
