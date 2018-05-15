var http = require('http');
var https = require('https');
var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';
var fs = require('fs');
var cache = {};
var gm = require('gm')
var request = require("request");
var imageMagick = gm.subClass({ imageMagick : true });
const phantom = require('phantom');
var {sendGmImage} = require('../../../cq/sendImage');
const {baiduVoice} = require('../../voice/baiduvoice');

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
    drawBangumi(qq,username,callback);
    return;
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
        if(img&&tdata){
          generateImageByWords(img,tdata,callback,ret);
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

function generateImageByWords(img,wd,callback,words){
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
              sendGmImage(img0.append(folder+imgname+"_blank.jpg",true),words,callback);
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
      var voice = undefined;
      var daa = dr.split('\n');
      for(var i=0;i<daa.length;i++){
        var txt = daa[daa.length-i-1].trim();
        if((txt.startsWith("「")||txt.startsWith("『"))&&(txt.endsWith("」")||txt.endsWith("』"))){
          voice=txt.substring(1,txt.length-1);
          break;
        }
      }
      if(voice){
        baiduVoice(voice,callback);
      }
      saveCard(qq,name);
      if(img&&dr){
        var words = gamename+"\n"+dr;
        words=words.replace(/&nbsp;/g,'').replace(/&quot;/g,'"').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&#160;/g,'<');
        generateImageByWords(img,words,callback,ret);
      }else{
        callback(ret);
      }
    });
  });
}





function drawBangumi(qq,username,callback){
  var id = Math.floor(Math.random()*60000)
  var option = {
    host: 'bangumi.tv',
    port: 80,
    method: 'GET',
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36'
    },
    path: '/character/'+id
  };
  console.log('\n\n=====================================')
  console.log("will fetch from:"+id);
  console.log(option);
  console.log('=====================================\n\n')
  var req = http.request(option, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    if(res.statusCode==200){
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function(){
        var n1 = resdata.indexOf('<div class="infobox">');
        var s1 = resdata.substring(n1);
        var n2 = s1.indexOf('<div id="crtPanelCollect"');
        var h1 = s1.substring(0,n2);
        var s2 = s1.substring(n2+5);
        var n3 = s2.indexOf('<div class="detail"');
        var s3 = s2.substring(n3);
        var n4 = s3.indexOf('<div class="crtCommentList"');
        var h2 = s3.substring(0,n4);

        var hd = '<link rel="stylesheet" type="text/css" href="http://bangumi.tv/min/g=css?r305">';
        h1='<div id="columnCrtA" class="column">'+h1+'</div>';
        h2='<div id="columnCrtB" class="column">'+h2+'</div>';
        var bd = '<div class="columns clearit" id="aaaa">'+h1+h2+'</div>';
        var ret = '<html><head>'+hd+"</head>\n<body>"+bd+'\n</body></html>';
        ret = ret.replace(/src="\/\//g,'src="http://');
        fs.writeFileSync("1.html",ret,"utf-8");

        var path = "bangumi/"+new Date().getTime()+".html";
        fs.writeFileSync("public/"+path,ret,"utf-8");
        getPic(path,username,callback)
      });
    }else if(res.statusCode==500){

    }else{

    }

  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}

let getPic = async ( path,username ,callback) => {
  //url路径
  let url        = 'http://localhost:10086/'+path;
  console.log(url);
  //创建一个实例
  const instance = await phantom.create();
  //创建一个页面
  const page     = await instance.createPage();
  //设置页面参数
  await page.property( 'viewportSize' , { width : 1800 , height : 1600 } );

  const tagName = tag;
  //打开url，返回状态（url有转码，解决中文问题）
  const status = await page.open( url);
  if(status=='success'){
    const bb = await page.evaluate(function () {
      return document.getElementsByTagName('div')[0].getBoundingClientRect();
    });
    //page.clipRect = { top: 0, left: 0, width: 1024, height: 768 };
    await page.property('clipRect', {
      top:    bb.top,
      left:   bb.left,
      width:  bb.width,
      height: bb.height
    })
    // 按照实际页面的高度，设定渲染的宽高
    //延时等待页面js执行完成（phantomjs只是等待页面上全部资源加载完毕，不包含页面js执行时间，所以需延时一段时间等待js）
    await lateTime( 500 );
    //输出页面到当前目录下
    var now = new Date();
    var filename = "../coolq-data/cq/data/image/send/bangumi/"+now.getTime()+".png";
    //filename="1.png";
    console.log(filename);
    await page.render(filename);
    //销毁实例
    await instance.exit();
    var ret = '【'+username+'】'+'抽到了：'+'\n';
    callback(ret+'[CQ:image,file=send/bangumi/'+now.getTime()+'.png]');
  }
};

let lateTime = ( time ) =>{
  return new Promise( function(resolve,reject){
    setTimeout(function(){
      resolve();
    }, time );
  } );
}








module.exports={
  drawNameCard,
  getDetailByName,
  getCard,
  draw2df,
  drawBangumi
}
