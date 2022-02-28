var MongoClient = require('mongodb').MongoClient;
var mongourl = require('../../baibaiConfigs').mongourl;
var request = require('request');
var Axios = require('axios');
var fs = require('fs');
var http = require('http');
var monthOfDay=[31,28,31,30,31,30,31,31,30,31,30,31];
var u = {};
var c = {};
var memory = {};
var usermap = {};


function getUserIDByName(name,callback){
    MongoClient.connect(mongourl, (err, db) => {
        var cl_senka_8 = db.collection('cl_senka_8')
        cl_senka_8.find({name:name}).limit(10).toArray(function(err, list) {
          for(var i=0;i<list.length;i++){

          }
        });
    })
}


var shipid2name=["","睦月","如月","","","","長月","三日月","","吹雪","白雪","深雪","磯波","綾波","敷波","曙","潮","陽炎","不知火","黒潮","雪風","長良","五十鈴","由良","大井","北上","扶桑","山城","皐月","文月","菊月","望月","初雪","叢雲","暁","響","雷","電","初春","子日","若葉","初霜","白露","時雨","村雨","夕立","五月雨","涼風","霰","霞","島風","天龍","龍田","名取","川内","神通","那珂","大井改","北上改","古鷹","加古","青葉","妙高","那智","足柄","羽黒","高雄","愛宕","摩耶","鳥海","最上","利根","筑摩","最上改","祥鳳","飛鷹","龍驤","伊勢","金剛","榛名","長門","陸奥","伊勢改","赤城","加賀","霧島","比叡","日向","日向改","鳳翔","蒼龍","飛龍","隼鷹","朧","漣","朝潮","大潮","満潮","荒潮","球磨","多摩","木曾","千歳","千代田","千歳改","千代田改","千歳甲","千代田甲","千歳航","千代田航","翔鶴","瑞鶴","瑞鶴改","鬼怒","阿武隈","夕張","瑞鳳","瑞鳳改","大井改二","北上改二","三隈","三隈改","舞風","衣笠","鈴谷","熊野","伊168","伊58","伊8","鈴谷改","熊野改","大和","秋雲","夕雲","巻雲","長波","大和改","阿賀野","能代","矢矧","酒匂","五十鈴改二","衣笠改二","武蔵","夕立改二","時雨改二","木曾改二","Верный","武蔵改","金剛改二","比叡改二","榛名改二","霧島改二","大鳳","香取","伊401","大鳳改","龍驤改二","川内改二","神通改二","那珂改二","あきつ丸","神威","まるゆ","弥生","卯月","あきつ丸改","磯風","浦風","谷風","浜風","Bismarck","Bismarck改","Bismarck zwei","Z1","Z3","Prinz Eugen","Prinz Eugen改","Bismarck drei","Z1 zwei","Z3 zwei","天津風","明石","大淀","大鯨","龍鳳","時津風","明石改","利根改二","筑摩改二","初風","伊19","那智改二","足柄改二","羽黒改二","綾波改二","飛龍改二","蒼龍改二","霰改二","大潮改二","阿武隈改二","吹雪改","白雪改","初雪改","深雪改","叢雲改","磯波改","綾波改","敷波改","金剛改","比叡改","榛名改","霧島改","天龍改","龍田改","球磨改","多摩改","木曾改","長良改","五十鈴改","由良改","名取改","川内改","神通改","那珂改","陽炎改","不知火改","黒潮改","雪風改","島風改","朧改","曙改","漣改","潮改","暁改","響改","雷改","電改","初春改","子日改","若葉改","初霜改","白露改","時雨改","村雨改","夕立改","五月雨改","涼風改","朝潮改","大潮改","満潮改","荒潮改","霰改","霞改","睦月改","如月改","皐月改","文月改","長月改","菊月改","三日月改","望月改","古鷹改","加古改","青葉改","妙高改","那智改","足柄改","羽黒改","高雄改","愛宕改","摩耶改","鳥海改","利根改","筑摩改","長門改","陸奥改","赤城改","加賀改","蒼龍改","飛龍改","龍驤改","祥鳳改","飛鷹改","隼鷹改","鳳翔改","扶桑改","山城改","翔鶴改","鬼怒改","阿武隈改","千歳航改","千代田航改","夕張改","舞風改","衣笠改","千歳航改二","千代田航改二","","","初風改","秋雲改","夕雲改","巻雲改","長波改","阿賀野改","能代改","矢矧改","弥生改","卯月改","Z1改","Z3改","浜風改","谷風改","酒匂改","","天津風改","浦風改","龍鳳改","妙高改二","磯風改","大淀改","時津風改","春雨改","早霜改","清霜改","初春改二","朝雲改","山雲改","野分改","秋月改","天城","葛城","","U-511改","","","","","","","","","香取改","朝霜改","高波改","照月改","Libeccio改","瑞穂改","風雲改","海風改","江風改","速吸改","Graf Zeppelin改","嵐改","萩風改","鹿島改","初月改","Zara改","沖波改","Iowa改","Pola改","親潮改","春風改","Warspite改","Aquila改","水無月改","伊26改","浦波改","山風改","朝風改","松風改","Commandant Teste改","藤波改","伊13改","伊14改","占守改","国後改","八丈改","石垣改","大鷹改","神鷹改","","択捉改","松輪改","佐渡改","対馬改","旗風改","","","天霧改","狭霧改","Richelieu改","Ark Royal改","Jervis改","Ташкент改","Gambier Bay改","Intrepid改","伊168改","伊58改","伊8改","伊19改","まるゆ改","伊401改","雲龍","春雨","雲龍改","潮改二","隼鷹改二","早霜","清霜","扶桑改二","山城改二","朝雲","山雲","野分","古鷹改二","加古改二","皐月改二","初霜改二","叢雲改二","秋月","照月","初月","高波","朝霜","吹雪改二","鳥海改二","摩耶改二","天城改","葛城改","U-511","Graf Zeppelin","Saratoga","睦月改二","如月改二","呂500","暁改二","Saratoga改","Warspite","Iowa","Littorio","Roma","Libeccio","Aquila","秋津洲","Italia","Roma改","Zara","Pola","秋津洲改","瑞穂","沖波","風雲","嵐","萩風","親潮","山風","海風","江風","速吸","翔鶴改二","瑞鶴改二","朝潮改二","霞改二","鹿島","翔鶴改二甲","瑞鶴改二甲","朝潮改二丁","江風改二","霞改二乙","神風","朝風","春風","松風","旗風","神風改","天龍改二","龍田改二","天霧","狭霧","水無月","","伊26","浜波","藤波","浦波","鬼怒改二","由良改二","満潮改二","荒潮改二","Commandant Teste","Richelieu","伊400","伊13","伊14","Zara due","白露改二","村雨改二","神威改","神威改母","","","鈴谷改二","熊野改二","","","","鈴谷航改二","熊野航改二","","Гангут","Октябрьская революция","Гангут два","Sheffield","Ark Royal","Ташкент","占守","国後","Jervis","Janus","春日丸","","","択捉","松輪","大鷹","岸波","早波","大鷹改二","伊504","佐渡","涼月","","神鷹","Luigi Torelli","神鷹改二","涼月改","","UIT-25","対馬","長門改二","夕雲改二","長波改二","Gambier Bay","Saratoga Mk.II","武蔵改二","多摩改二","文月改二","Intrepid","Saratoga Mk.II Mod.2","日振","大東","伊勢改二","日向改二","瑞鳳改二","浦風丁改","磯風乙改","浜風乙改","谷風丁改","瑞鳳改二乙","Samuel B.Roberts","Johnston","巻雲改二","風雲改二","福江","陽炎改二","不知火改二","黒潮改二","沖波改二","平戸","Nelson","","陸奥改二","Gotland","Maestrale","Nelson改","","朝霜改二","Gotland改","Maestrale改","日進","","峯雲","八丈","石垣","日進甲","海風改二","","L.d.S.D.d.Abruzzi","G.Garibaldi","金剛改二丙","比叡改二丙","","赤城改二","Houston","Fletcher","Atlanta","","赤城改二戊","Houston改","Colorado","South Dakota","Hornet","De Ruyter","Luigi Torelli改","伊400改","伊47改","","De Ruyter改","加賀改二戊","御蔵","屋代","Perth","Grecale","Helena","御蔵改","屋代改","Perth改","Grecale改","Helena改","神州丸","夕張改二","夕張改二特","夕張改二丁","秋霜","神州丸改","敷波改二","Fletcher改 Mod.2","Fletcher Mk.II","Gotland andra","薄雲","有明","","迅鯨","","伊47","第四号海防艦","","迅鯨改","","松","竹","","","","加賀改二護","","秋雲改二","","","丹陽","球磨改二","Scirocco","Washington","","雪風改二","球磨改二丁","Scirocco改","Washington改","","","能代改二","","","曙改二","","","","","","","","","","","","","日振改","大東改","浜波改","Samuel B.Roberts改","","","平戸改","福江改","岸波改","峯雲改","早波改","Johnston改","日進改","G.Garibaldi改","Fletcher改","L.d.S.D.d.Abruzzi改","","秋霜改","Atlanta改","South Dakota改","加賀改二","","薄雲改","第四号海防艦改","松改","有明改","Hornet改","Sheffield改","竹改","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""];
function getUserInfo(id,callback){
  var token = '3482b439a9f76a4d6cbd231378f267fa966b4310';
  var now = new Date().getTime();
  var url = 'http://203.104.209.199/kcsapi/api_req_member/get_practice_enemyinfo';
  request({
      url: url,
      method: "POST",
      headers:{
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer':'http://203.104.209.199/kcs2/index.php?api_root=/kcsapi&voice_root=/kcs/sound&osapi_root=osapi.dmm.com&version=5.1.4.1&api_token='+token+'&api_starttime='+now,
          'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36'
      },
      body:'api_token='+token+'&api_verno=1&api_member_id='+id
  }, function(error, response, body){
      if(error&&error.code){
        console.log('pipe error catched!')
        console.log(error);
      }else{
        if(body.startsWith("svdata=")){
          body=body.substring(7);
        }
        var dat = eval('('+body+')');
        var data = dat.api_data;
        var name = data.api_nickname;
        var exp = data.api_experience[0];
        var exps = (exp*7/10000).toFixed(1);
        var cmt = data.api_cmt;
        var ships = data.api_deck.api_ships;
        var shipstr = '';
        for(var i=0;i<ships.length;i++){
          var id = ships[i].api_id;
          if(id>0){
            shipstr=shipstr+shipid2name[ships[i].api_ship_id]+" \t Lv:"+ships[i].api_level+"\n"
          }
        }
        shipstr+shipstr.trim();
        var ret = '';
        ret = ret + name + "  【ID:"+data.api_member_id+"】\n";
        ret = ret + '经验值：【'+exp+'】\t 经验战果值：【'+exps+'】\n'
        ret = ret + cmt + '\n';
        ret = ret + shipstr;
        callback(ret);
      }
  })
}






getDateNo = function(now){
  now = new Date(new Date(now).getTime()+(new Date().getTimezoneOffset()+480)*60000)
  var date = now.getDate()
  var hour = now.getHours()
  if(hour<1){
    date = date -1
    hour = hour + 24
  }
  const no = (date-1)*2+((hour>=13)?1:0)
  return no
}

getRankDateNo = function(now){
  now = new Date(new Date(now).getTime()+(new Date().getTimezoneOffset()+480)*60000)
  var date = now.getDate()
  var hour = now.getHours()
  if(hour<2){
    date = date -1
    hour = hour + 24
  }
  const no = (date-1)*2+((hour>=14)?1:0)
  return no
}


module.exports={
    getUserInfo
}
getUserInfo(8165145,function(r){console.log(r)})




