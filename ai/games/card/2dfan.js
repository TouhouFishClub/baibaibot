var http = require('http');
var https = require('https');
var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';
var fs = require('fs');


function fetchGame(id,lastret,page,gamename){
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
              var gamename = sh.substring(0,sh.length-2);
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
              fetchGame(id,nret,page+1,gamename);
            }
          }
        }
      })
    }else if(res.statusCode==500){
      //console.log(gamename);
      //console.log(lastret);
      saveGame(gamename,lastret,id);
      handleGameDesp(gamename,lastret,id);
      setTimeout(function(){
        fetchGame(id+1,[],1,"")
      },1000);
    }else{
      setTimeout(function(){
        fetchGame(id+1,[],1,"")
      },1000);
    }

  });
  req.end();
}


function handleGameDesp(gamename,desArr){
  console.log(desArr);
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
        console.log(111111);
        console.log(char);
        console.log(char.length);
        if(char.length>52){
          continue;
        }
        var chara = [];
        chara.push(des);
        var charimg = nextdes;
        for(var k=0;k<100;k++){
          var kdes = desArr[i+2];
          console.log(333333);
          console.log(kdes);
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

        saveChar(gamename,char,charimg,chara);
      }
    }
  }
}

function saveChar(gamename,char,charimg,chara){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_card_2df = db.collection('cl_card_2df');
    var Obj =  {'_id':gamename+":"+char,img:charimg,d:chara,ts:new Date()};
    cl_card_2df.save(Obj,function(){
      db.close();
    });
  });
}

function saveGame(gamename,desa,id){
  MongoClient.connect(mongourl, function(err, db) {
    if(err){
      console.log('mongo error2:!!!!!!!!!');
      console.log(err);
    }else {
      var cl_game_2df = db.collection('cl_game_2df');
      var Obj = {'_id': gamename, id: id, d: desa, ts: new Date()};
      cl_game_2df.save(Obj, function () {
        db.close();
      });
    }
  });
}



module.exports={
  fetchGame
}








