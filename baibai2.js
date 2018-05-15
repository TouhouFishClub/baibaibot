var http=require('http');
var https=require('https');
var tls = require('tls');
let onlineObj = {}
const { DQCore, allGameAction } = require('./ai/DQ/DQgameCore')

var path = require('path');

//const { QQ, MsgHandler } = require('./qqlib');

const{saveTxt,answer} = require(path.join(__dirname, '/lib/mongo.js'))
const xchange = require('./ai/xchange')
const {cal} = require('./ai/calculator');
const {baiduSearch,baikeReply} = require('./ai/baidusearch');
const {weatherReply,getWeatherByCity} = require('./ai/weather');
const {tulingMsg,getLike} = require('./ai/tuling');
const {translateMsg}=require('./ai/translate');
const {money} = require('./ai/money');
const {getloc,route} = require('./ai/map');
const {searchSongByName} = require('./ai/song');
const kce = require('./ai/kanColleEquip')
const kcq = require('./ai/kanColleQuest')
const {getMapData} = require('./ai/kancolle/kancollemap')
const {searchsenka} = require('./ai/kancolle/senka');
const {fight,useMagicOrItem,regenTimer} = require('./ai/favour/battle');

const {actionGroup,actionBuddy} = require('./ai/ouat/ouatMain');

const {handleUserOperation,mazeRegenTimer} = require('./ai/chess/road');
const {pairReply}=require('./ai/pairAI');
const {getKancollStaffTweet,stream,streaminit} = require('./ai/twitter');
//const {getShipReply}=require('./ai/kancolle/getship');
const {getShip} = require('./ai/kancolle/ship');
const roulette = require('./ai/Roulette')

const {kancolleInfo} = require('./ai/kancolle/shipData');
const {updateShipDB,updateItemDB,updateSuffixDB,loadShip,loadItem,loadSuffix,searchShipByName}=require('./ai/kancolle/shipData');
const {pushTask,pushToGroup} = require('./ai/push');
const {replayReply} = require('./ai/replay');

const {getUserNameInGroup,getUserNickInGroupByCache,getGroupName,banUserRandom} = require('./cq/cache');


const {lottoryReply,getlottory} = require('./ai/lottory');
const smuggler = require('./ai/mabinogi/smuggler')
const {drawNameCard,getCard} = require('./ai/games/card/draw');

const op = require('./ai/mabinogi/optionset')
const {googleImageSearch} = require('./ai/image/google');
const {getVoice} = require('./ai/voice/xunfei')

const {handlePrivateMsg} = require('./ai/private');
const rua = require('./ai/mabinogi/ruawork')
const {baiduVoice} = require('./ai/voice/baiduvoice')
const {saveChat} = require('./ai/chat/collect');

loadShip();
loadItem();
updateShipDB();
updateItemDB();
loadSuffix();
pushTask();
initWS();
streaminit();
regenTimer();

var wsonline = false;
function initWS(){
  var WebSocketClient = require('websocket').client;

  var client = new WebSocketClient();

  client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
  });

  client.on('connect', function(connection) {
    wsonline = true;
    console.log('WebSocket Client Connected');
    connection.on('error', function(error) {
      console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
      wsonline=false;
      console.log('echo-protocol Connection Closed');
    });
    connection.on('message', function(message) {
      if (message.type === 'utf8') {
        handleMsg(JSON.parse(message.utf8Data))
      }
    });
  });
  client.connect('ws://192.168.17.52:23335/event');
}

function reconnect(){
  if(!wsonline){
    initWS();
  }
}












function handleMsg(msgObj,res){
  try{
    //console.log(msgObj)
    handleMsg_D(msgObj,res);
  }catch(e){
    console.log(e);
  }
}




function handleMsg_D(msgObj,response){
  var type = msgObj.message_type;
  var groupid = msgObj.group_id;
  var content = msgObj.message;
  if(content){
    if(content.indexOf('&amp;')>-1){
      content=content.replace(/&amp;/g,'&');
    }
    if(content.indexOf('&#44;')>-1){
      content=content.replace(/&#44;/g,',');
    }
  }
  if(type=='private'){
    var userid = msgObj.user_id;
    if(userid=='357474405'){
      var ca = content.split('|');
      if(ca.length==2){
        var gid = ca[0];
        var text = ca[1];
        var callback = function(res){
          if(res.trim().length>0){
            setTimeout(function(){
              var options = {
                host: '192.168.17.52',
                port: 23334,
                path: '/send_group_msg?group_id='+gid+'&message='+encodeURIComponent(res),
                method: 'GET',
                headers: {

                }
              };
              console.log("priv:"+userid+":"+content+":"+res);
              var req = http.request(options);
              req.on('error', function(err) {
                console.log('req err:');
                console.log(err);
              });
              req.end();
            },1000);
          }
        }
        baiduVoice(text,callback);
        return;
      }
    }
    var callback = function(res){
      if(res.trim().length>0){
        setTimeout(function(){
          var options = {
            host: '192.168.17.52',
            port: 23334,
            path: '/send_private_msg?user_id='+userid+'&message='+encodeURIComponent(res),
            method: 'GET',
            headers: {

            }
          };
          console.log("priv:"+userid+":"+content+":"+res);
          var req = http.request(options);
          req.on('error', function(err) {
            console.log('req err:');
            console.log(err);
          });
          req.end();
        },1000);
      }
    }
    tulingMsg(userid,content,callback,userid);

    return;
  }
  if(type!='group'){
    return;
  }
  var from = msgObj.user_id;

  var name = getUserNameInGroup(from,groupid);
  var nickname = getUserNickInGroupByCache(from,groupid);
  console.log(groupid+":"+name+":"+content)
  if(name==null){
    name = nickname;
  }
  var groupName = getGroupName(groupid);
  saveChat(groupid,from,name,content);
  var callback = function(res,blank){
    if(res.trim().length>0){
      setTimeout(function(){
        if(!blank){
          res = ""+res
        }
        var options = {
          host: '192.168.17.52',
          port: 23334,
          path: '/send_group_msg?group_id='+groupid+'&message='+encodeURIComponent(res),
          method: 'GET',
          headers: {

          }
        };
        console.log(res);
        var req = http.request(options);
        req.on('error', function(err) {
          console.log('req err:');
          console.log(err);
        });
        req.end();
      },1000);
    }
  }


  var rcontent=content.trim();
  if(
    rcontent === '俄罗斯轮盘' ||
    rcontent === '俄羅斯輪盤' ||
    rcontent === '加入' ||
    rcontent === '加入' ||
    rcontent === 'join' ||
    rcontent === '參加' ||
    rcontent === '参加' ||
    rcontent === '开枪' ||
    rcontent === '开火' ||
    rcontent === 'fire' ||
    rcontent === '開火' ||
    rcontent === '開槍' ||
    rcontent === '退出' ||
    rcontent === '退出' ||
    rcontent === 'quit' ||
    rcontent === 'escape' ||
    rcontent === '逃跑' ||
    rcontent === '跳过' ||
    rcontent === 'skip' ||
    rcontent === 'pass' ||
    rcontent === '逃跑' ||
    rcontent === 'kill' ||
    rcontent === '作弊' ||
    rcontent === '作弊' ||
    rcontent === '犯規' ||
    rcontent === '犯规'
  ){
    roulette(name,rcontent,callback,from,groupid)
    return
  }

  if(content.trim() === '走私查询'){
    smuggler(callback)
    return
  }


  let con =content.trim(), fi = con.substring(0,4)
  if(fi === '释放查询' || fi === 'opts'){
    op(name, con.substring(4).trim(), 'normal', callback);
    return;
  }

  if(con === 'ruawork' || (con.indexOf('茹娅') + 1 && con.indexOf('上班') + 1)){
    rua(callback)
    return
  }

  let fie = con.substring(0,3)
  if(fie == 'opt' && fi != 'opts'){
    op(name, con.substring(3).trim(), 'image', callback);
    return;
  }
  if(rcontent=='好感度'){
    getLike(from,name,callback);
    return;
  }

  if(rcontent.startsWith("抽卡")){
    drawNameCard(name,from,callback,groupid);
    return;
  }
  if(rcontent.startsWith("搜图")){
    googleImageSearch(content.substring(2),callback)
    return;
  }

  var first = content.substring(0,1);
  if(first=="*"||first=='×'){
    lottoryReply(content.substring(1),name,callback);
    return;
  }



  if(first=='`'||first=='·'||first=='ˋ'||first=="'"||first=="‘"||first=="，"){

    var c1 = content.substring(1);
    if(c1==""){
      var ret = "`1+名词：百科查询\n翻译成中文：`6+要翻译的内容\n翻译成日文：`2+要翻译的内容\n翻译成英文：`3+要翻译的内容\n";
      ret = ret + "`4+内容：百度查询\n`c汇率转换\n`0+数字：大写数字转换\n`8+地点A-地点B：公交查询\n";
      ret = ret + '`r+数字：ROLL一个小于该数字的随机整数\n`g砍人\n`m迷宫\n';
      ret = ret + "天气预报：城市名+天气\n教百百说话：问题|答案\n计算器：直接输入算式\n闲聊：``+对话";
      callback(ret);
    }else{
      reply(c1,name,callback,groupid,from,groupName,nickname);
    }
    return;
  }
  if(rcontent=='天气'){
    if(msg.user){
      var city = msg.user.city;
      if(city.length>0&&city.length<5){
        getWeatherByCity(city,name,callback);
      }
    }
    return;
  }

  var n = content.indexOf('天气');
  if(n>1&&n<10&&rcontent.length==n+2){
    var city = content.substring(0,n).trim();
    try{
      getWeatherByCity(city,name,callback);
    }catch(e){
      console.log(e);
    }
    return;

  }
  var ca = content.split('|');
  if(ca.length==2){
    if(ca[0].length<50 && ca[0].split(' ').length < 2){
      saveTxt(ca[0],ca[1],name,groupName,callback);
      return;
    }
  }

  var calret = cal(content);
  if(calret){
    callback(content+"="+calret);
    return;
  }
  if(content.indexOf('百百')>-1){
    tulingMsg(from,content.trim(),callback,groupid);
    return;
  }
  answer(content,name,groupName,callback,groupid,from);
  if(nickname.indexOf('百百')==-1){
    replayReply(content,name,groupid,callback);
  }

}

function reply(content,userName,callback,groupid,from,groupName,nickname){
  var first = content.substring(0,1);
  if(first=='`'||first=='·'||first=='ˋ'||first=="'"||first=="‘"||first=="，"){
    tulingMsg(userName,content.substring(1),callback,groupid);
  }else if(first==2){
    translateMsg(content.substring(1),'ja',callback);
  }else if(first==3){
    translateMsg(content.substring(1),'en',callback);
  }else if(first==1){
    baikeReply(content.substring(1),userName,callback);
  }else if(first==4){
    baiduSearch(userName,content.substring(1),callback);
  }else if(first==0){
    callback(money(content.substring(1)));
  }else if(first=='b'||first=='B'){
    banUserRandom(from,groupid);
  }else if(first=='c'||first=='C'){
    xchange(userName,content.substring(1),callback);
  }else if(first=='d'||first=='D'){
    pairReply(content.substring(1),userName,callback);
  }else if(first=='t'||first=='T'){
    getKancollStaffTweet(content.substring(1),userName,callback);
  }else if(first=="e"||first=='E'){
    kce(userName,content.substring(1),callback);
  }else if(first=="l"||first=='L'){
    getShipReply(content.substring(1),userName,callback);
  }else if(first=="q"||first=='Q'){
    kcq(userName,content.substring(1),callback);
  }else if(first=="k"||first=='K'){
    getShip(content.substring(1),callback);
  }else if(first=="z"||first=='Z'){
    searchsenka(userName,content.substring(1),callback);
  }else if(first=='s'||first=='S'){
    searchSongByName(userName,content.substring(1),callback);
  }else if(first=='r'||first=='R'){
    callback(""+Math.floor(Math.random()*parseInt(content.substring(1))));
  }else if(first=='f'||first=='F'){
      if((groupid+"").startsWith('20570')>0||(groupid+"").startsWith('67096')>0||(new Date().getHours()<=7&&new Date().getHours()>=0)){
        fight(from,content.substring(1),groupid,callback);
      }else{
        callback('为防止刷屏，当前关闭游戏功能');
      }
  }else if(first=='g'||first=='G'){
      if((groupid+"").startsWith('20570')>0||(groupid+"").startsWith('67096')>0||(new Date().getHours()<=7&&new Date().getHours()>=0)){
        useMagicOrItem(from,userName,content.substring(1),groupid,callback);
      }else{
        callback('为防止刷屏，当前关闭游戏功能');
      }
  }else if(first=='m'||first=='M'){
    handleUserOperation(from,content.substring(1),qqq.getMemberListInGroup(groupid),callback);
  }else if(first==8){
    var ca = content.substring(1).split('-');
    if(ca.length==2){
      route(0,ca[0],ca[1],callback);
    }
  }else if(first=='6'){
    translateMsg(content.substring(1),'zh-CHS',callback)
  }else{
    translateMsg(content,'zh-CHS',callback)
  }
}












module.exports={
  handleMsg,
  reconnect,
  reply
}


