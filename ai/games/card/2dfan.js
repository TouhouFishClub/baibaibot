var http = require('http');
var https = require('https');
var MongoClient = require('mongodb').MongoClient;
var mongourl = require('../../../baibaiConfigs').mongourl;
var fs = require('fs');
var request = require('request');
const md5 = require("md5")

function fetch0(id,gamename,gameimg){
  console.log(id,gamename,gameimg);
  fetchGame(id,[],1,gamename,gameimg)
}

function fetchGame(id,lastret,page,gamename,gameimg){
  console.log(gamename,gameimg);
  if(!lastret){
    lastret=[];
  }
  if(!page){
    page=1;
  }
  var option = {
    host: 'www.2dfan.com',
    port: 443,
    method: 'GET',
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36'
    },
    path: '/topics/'+id+'/page/'+page
  };
  console.log('\n\n=====================================')
  console.log("will fetch from:"+id+":"+page);
  console.log(option);
  console.log('=====================================\n\n')
  var req = https.request(option, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    if(res.statusCode==200){
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function(){
        resdata=resdata.toLowerCase();
        var h1 = 'navbar navbar-inner block-header no-border';
        var s0 = resdata;
        var n1 = s0.indexOf(h1);
        if(n1>0){
          var s1 = s0.substring(n1+h1.length);
          var n2 = s1.indexOf('<h3');
          var n3 = s1.indexOf('</h3>');

          if(n2>0&&n3>0){

            var sh = s1.substring(n2+4,n3);
            if(sh.endsWith('介绍')){
              var s2 = s1.substring(n3+3);
              var n4 = s2.indexOf('<p>')
              var n5 = s2.indexOf('分享到');
              var desp = s2.substring(n4,n5);
              var ret = []
              var s10 = desp;
              var n=s10.indexOf('<p');

              do{
                var s11 = s10.substring(n+1);
                var n11 = s11.indexOf('>');
                var n12 = s11.indexOf('</p>');

                var line = s11.substring(n11+1,n12);
                s10 = s11.substring(n12);
                n=s10.indexOf('<p');
                var liner = "";
                var s13 = line;
                var n13 = s13.indexOf('<')
                while(n13>=0){
                  var s14 = s13.substring(n13+1);
                  var n14 = s14.indexOf('>');
                  var inh = s14.substring(0,n14);
                  if(s14.startsWith("img")){
                    var n15 = inh.indexOf('http');
                    var s15 = inh.substring(n15);
                    var n16 = s15.indexOf('"');
                    var imgsrc = s15.substring(0,n16);

                    liner = liner + imgsrc+"\n";
                  }
                  liner = liner + s13.substring(0,n13)+"\n";
                  s13 = s14.substring(n14+1);
                  n13 = s13.indexOf('<')
                }
                liner=liner+s13;
                ret.push(liner);
              }while(n>=0)
              var nret = lastret.concat(ret);
              if((page>35)||(ret[0].startsWith("分享到")&&ret.length<50)){
                saveGame(gamename,lastret,id,gameimg);
                handleGameDesp(gamename,lastret,id,gameimg);
                setTimeout(function(){

                },1000);
              }else{
                fetchGame(id,nret,page+1,gamename,gameimg);
              }
            }else{
              //fetchGame(id+1,[],1,"")
            }
          }
        }
      })
    }else if(res.statusCode==500){
      console.log(11111);
      saveGame(gamename,lastret,id,gameimg);
      handleGameDesp(gamename,lastret,id,gameimg);
      setTimeout(function(){
        //fetchGame(id+1,[],1,"")
      },1000);
    }else{
      console.log(222222222);

      setTimeout(function(){
        //fetchGame(id+1,[],1,"")
      },1000);
    }

  });
  req.end();
}


function handleGameDesp(gamename,desArr,id,gameimg){
  try{
    fs.mkdirSync("4df/"+id+"/");
  }catch(e){

  }

  var imgreq = request({
    url: gameimg,
    method: "GET",
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
      'Referer':'https://www.2dfan.com/subjects/page/1?order=comments_count'
    }
  }, function(error, response, body){
    if(error&&error.code){
      console.log('pipe error catched!')
      console.log(error);
    }
  }).pipe(fs.createWriteStream("4df/"+id+"/g_"+id));
  imgreq.on('error',function(err){
    console.log(err);
  });
  imgreq.on('close',function(){
    for(var i=0;i<desArr.length;i++){
      var des = desArr[i].trim();
      if(i==desArr.length-1){
        break;
      }
      var nextdes = desArr[i+1].trim();
      if(des.indexOf('cv')>=-1){
        if(nextdes.startsWith("http")){
          var n = des.indexOf('cv');
          var char;
          if(n>0){
            char = des.substring(0,n).trim();
          }else{
            char = des;
          }
          if(char.length>52){
            continue;
          }
          var chara = [];
          chara.push(des);
          var charimg = nextdes;
          for(var k=0;k<100;k++){
            var kdes = desArr[i+2];
            if(!kdes){
              break;
            }
            var kkdes = desArr[i+3];
            if(!kkdes){
              break;
            }else if(kkdes.startsWith("http")){
              break;
            }
            i++;
            chara.push(kdes);
          }

          saveChar(gamename,char,charimg,chara,id,gameimg);
        }
      }
    }
  });





}

function saveChar(gamename,char,charimg,chara,id,gameimg){
  var n1=char.indexOf('\n');
  var imgname = "4df/"+id+"/"+md5(char).substring(0,6);



  MongoClient.connect(mongourl, function(err, db) {
    var imgreq = request({
      url: charimg,
      method: "GET",
      headers:{
        'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
        'Referer':'https://www.2dfan.com/topics/'+id+'/page/'+1
      }
    }, function(error, response, body){
      if(error&&error.code){
        console.log('pipe error catched!')
        console.log(error);
      }
    }).pipe(fs.createWriteStream(imgname));
    imgreq.on('error',function(err){
      console.log(err);
    });



    imgreq.on('close',function(){
      var cl_card_2df = db.collection('cl_sdf_card');
      var Obj =  {'_id':gamename+":"+char,imgurl:charimg,img:imgname,d:chara,ts:new Date(),
        gameid:id,gimgurl:gameimg,gimg:id};
      cl_card_2df.save(Obj,function(){
        db.close();
      });
    });
    // cl_card_2df.save(Obj,function(){
    //   db.close();
    // });
  });
}

function saveGame(gamename,desa,id){
  MongoClient.connect(mongourl, function(err, db) {
    if(err){
      console.log('mongo error2:!!!!!!!!!');
      console.log(err);
    }else {
      var cl_game_2df = db.collection('cl_sdf_game');
      var Obj = {'_id': gamename, id: id, d: desa, ts: new Date()};
      cl_game_2df.save(Obj, function () {
        db.close();
      });
    }
  });
}

var wid=1;
function fetchRank(wid){
  if(!wid){
    wid=1
  }
  console.log('widddddddddddddddddddddd:'+wid);
  var url = 'https://www.2dfan.com/subjects/page/'+wid+'?order=comments_count';
  request({
    headers:{
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36',
    },
    url: url,
  }, function(error, response, body) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
      var sa = body.split('<h4 class="media-heading">');
      console.log(sa.length);
      for(var i=1;i<sa.length;i++){
        var ss=sa[i];
        var n = ss.indexOf('href="/subjects/');
        var s1 = ss.substring(n+16);
        var n1 = s1.indexOf('</h4>');
        var s2 = s1.substring(0,n1);
        var n3 = s2.indexOf('"');
        var id = s2.substring(0,n3);
        var n4 = s2.indexOf('>');
        var n5 = s2.indexOf('<');
        var gamename = s2.substring(n4+1,n5);

        var ls = sa[i-1];
        var n6 = ls.indexOf('data-normal="');
        var s6 = ls.substring(n6+13);
        var n7 = s6.indexOf('"');
        var imgsrc = s6.substring(0,n7);
        task.push({id:id,gamename:gamename,gameimg:imgsrc});
      }
    }
  });
}


var task = [];
var working = 0;
function run(){
  setTimeout(function(){
    if(task.length>0){
      var obj = task.pop();
      console.log('now fetching:');
      var gaimg = obj.gameimg;
      working++;
      fetch0(obj.id,obj.gamename,gaimg);
    }else{
      console.log('no task');
      working++;
      if(working>10){
        working=0;
        wid=wid+1;
        fetchRank(wid);
      }
    }
    run();
  },3000)
}

run();

function fixPicName(){
  MongoClient.connect(mongourl, function(err, db) {
    if(err){
      console.log('mongo error2:!!!!!!!!!');
      console.log(err);
    }else {
      var cl_2df_card = db.collection('cl_2df_card');
      var m = {};
      cl_2df_card.find().toArray(function(err, cardArr) {
        for(var i=0;i<cardArr.length;i++){
          var card = cardArr[i];
          var img = card.img;
          var gameid = card.gameid;
          var gimg = card.gimg;
          if(!m[gameid]){
            fs.mkdirSync("2fd/"+gameid);
            m[gameid]=1;
            try{
              let readStream = fs.createReadStream("2df/g_"+gimg);
              readStream.pipe(fs.createWriteStream("2fd/"+gameid+"/g_"+gameid));
            }catch(e){
              console.log(e);
            }
          }else{
            m[gameid]=m[gameid]+1;
          }
          var fn = "2fd/"+gameid+"/"+gameid+"_"+(m[gameid]<10?("0"+m[gameid]):m[gameid]);
          try{
            let readStream = fs.createReadStream(img);
            readStream.pipe(fs.createWriteStream(fn));
          }catch(e){
            console.log(e);
          }
          cl_2df_card.updateOne(card,{'$set':{img:fn,gimg:"2fd/"+gameid+"/g_"+gameid}})
          console.log(card._id);
        }
      })
    }
  });
}




module.exports={
  fetchGame,
  fetchRank,
  fixPicName
}








