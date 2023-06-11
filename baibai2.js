var http=require('http');
var https=require('https');
var tls = require('tls');
var fs = require('fs');
var request = require('request');
let onlineObj = {}
const { DQCore, allGameAction } = require('./ai/DQ/DQgameCore')

const {diffuseReply,novelAI,naifu,novelAIDiffuse,HDdiffuse,saveMagicPrefer} = require('./ai/image/diffuse')
const {ImgScale} = require('./ai/image/scale');
const { myip } = require('./baibaiConfigs')

var path = require('path');
//const { QQ, MsgHandler } = require('./qqlib');

const{saveTxt,answer,getMsgCount} = require(path.join(__dirname, '/lib/mongo.js'))
const { drawTxtImage } = require('./cq/drawImageBytxt')
const xchange = require('./ai/xchange')
const {cal} = require('./ai/calculator');
const {baiduSearch,baikeReply} = require('./ai/baidusearch');
const {getWeatherByCity} = require('./ai/weather');
const {tulingMsg,getLike,getQAIresponse} = require('./ai/tuling');
const {translateMsg}=require('./ai/translate');
const {money} = require('./ai/money');
const {route} = require('./ai/map');
const {searchSongByName} = require('./ai/song');
const kce = require('./ai/kanColleEquip')
const kcq = require('./ai/kanColleQuest')
const {fight,useMagicOrItem} = require('./ai/favour/battle');
const {handleUserOperation} = require('./ai/chess/road');

const {pairReply}=require('./ai/pairAI');
const {getShip} = require('./ai/kancolle/ship');
const roulette = require('./ai/Roulette')
const {copperReply} = require('./ai/games/card/copper');

require('./ai/push');


const {beautyReply} = require('./ai/ff14/beauty');

const {replayReply} = require('./ai/replay');
const {getUserNameInGroup,getUserNickInGroupByCache,getGroupName,getGroupMemberNum,banUserRandom} = require('./cq/cache');
const {lottoryReply} = require('./ai/lottory');
const smuggler = require('./ai/mabinogi/smuggler')
const { createEchoStone, echoStoneEventSwitch } = require('./ai/mabinogi/echostone')
const {drawNameCard} = require('./ai/games/card/draw');
const op = require('./ai/mabinogi/optionset')
const {googleImageSearch} = require('./ai/image/google');
const rua = require('./ai/mabinogi/ruawork')
const {baiduVoice} = require('./ai/voice/baiduvoice')
const {saveChat} = require('./ai/chat/collect');
const {getFoodRate} = require('./ai/kancolle/food');
const {handleSenkaReply} = require('./ai/kancolle/senka2');
const {descryptReply} = require('./ai/image/qqspeak');
const rp = require('./ai/rp');
const {G21Boss} = require('./ai/mabinogi/G21Boss');
const checkIgnoreUser = require('./ai/ignoreUser');
const {searchMHW} = require('./ai/mhw/index');
const {searchFeChara} = require('./ai/fe/feChara');
const {replyKancolleRoute} = require('./ai/kancolle/map_new');
const {searchFF14Item} = require('./ai/ff14/item');
const {searchQuest} = require('./ai/ff14/strategy');
const rd = require('./ai/randomDice')
const {zodiac,saveMyZodiac} = require('./ai/zodiac')

const {saveAlarm} = require('./ai/private/alerm');
const {poemReply} = require('./ai/image/xiaobing');

const {simplized,traditionalized,qqlized} = require('./lib/chs_cht');


const {fflogsReply} = require('./ai/ff14/fflogs');
const {fflogs2Reply} = require('./ai/ff14/fflogs2');

const gf = require('./ai/girlsfrontline/index')
const {handleGun} = require('./ai/games/survival/main');
const bomberman = require('./ai/games/Bomberman/main');
const {handleFF14weatherReply} = require('./ai/ff14/ff14weather');

const anr = require('./ai/arknights/arkNightsRecruit')
const ans = require('./ai/arknights/arkNightsCharacter')
const anc = require('./ai/arknights/arkNightsCalc')
const and = require('./ai/arknights/arkNightsBuildingTheme')
const anchan = require('./ai/arknights/arkNightsChallenge')
const anp = require('./ai/arknights/arkNightsCharacterCompare')
const { arkCalendar } = require('./ai/arknights/arkNightsCalendar')
const { mabiCalendar } = require('./ai/mabinogi/mabiCalendar')

const { PerfectCactpot } = require('./ai/ff14/cactpot')
const {runsetu} = require('./ai/games/card/setu');
//const { wfp } = require('./ai/worldflipper/BossBattlePushing')
const {calAttr} = require('./ai/ff14/attr');
require('./ai/ff14/activity')

const { raffle } = require('./ai/spinach/RedBlueBall')

// const cov = require('./ai/CoV2020')
const { cov } = require('./ai/CoV2019ByTianApi')
const chp = require('./ai/chp')
const { morse } = require('./ai/MorseCode')

const {actp} = require('./ai/AnimalCrossing/TurnipProphet')
const { saveDTCPrice } = require('./ai/AnimalCrossing/priceRecord');

const { discord } = require('./ai/PrincessConnect/discord')
const { cherugo } = require('./ai/PrincessConnect/cherugo')
const { guildRankSearch } = require('./ai/PrincessConnect/guildRank')
const { schedule } = require('./ai/PrincessConnect/schedule')
const { chishenme } = require('./ai/chishenme')
const {ff14MarketReply} = require('./ai/ff14/itemmarket');
const {catreply} = require('./ai/games/card/cat');

const {handleFlyindReply} = require('./ai/games/flying/flight_chess');

const { drawBubble } = require('./ai/chat/drawBubble')
const { fiveThousandTrillionYen } = require('./ai/chat/5000choyen')
const { flashHandler } = require('./MsgHandler/flash')
const { testGif } = require('./gif/test')

const { Reliquary } = require('./ai/GenshinImpact/Reliquary')

const { composition, groupCompositionRank } = require('./ai/composition')
const { tapFish } = require('./ai/tapfishNew')
const {handleSweepReply} = require('./ai/games/sweeping/sweepmain');
const { calendar } = require('./ai/calendar.js')
const {handleGaReply,handleMazeReply} = require('./ai/image/gimage');

const { renderColorBoard } = require('./ai/mabinogi/renderColor')

const { trade, tradeOcr } = require('./ai/mabinogi/trade')

const { searchMabiRecipe } = require('./ai/mabinogi/recipe/searchRecipe')


const { ergo } = require('./ai/mabinogi/ergo')
const { mabiGacha, selectGachaGroup } = require('./ai/mabinogi/gacha/index')

const { menu } = require('./ai/menu')
const { ygo } = require('./ai/ygo/ygo')

// const { carrot } = require('./ai/mabinogi/carrot')

const { FerryTimetable } = require('./ai/mabinogi/ferryTimetable')
const { BossWork } = require('./ai/mabinogi/BossWork/BossWork')
const { searchEquipUpgrade } = require('./ai/mabinogi/ItemUpgrade/index')

const {handleDSReply,handleVoteReply} = require('./ai/games/ds/dsmain')

const { renderChatPersonas } = require('./ai/chat/personas/index')
const { renderGroupCount, randomGroupUser } = require('./ai/chat/groupCount/index')
const { searchGroupChat } = require('./ai/chat/GroupChatSearch/index')

const {handleCustomChatgptReplay,getChatgptReplay,getBaibaiReplay} = require('./ai/chat/openai');
const {ysVoiceReply} = require('./ai/voice/ysvoice')
const {AIdraw,yishijie} = require('./ai/games/card2/AIDraw')


let globalConfig = {
	FLASH_RESEND : false
}

let groupConfig = {

}

const configAdminSet = new Set([
	799018865,
	357474405
])

const BOT_MASTER = [
  {
    port: 29334,
    qq: 3580280499,
    master: 782804214
  },
  {
    port: 26334,
    qq: 3159074419,
    master: 1150926118
  },
  {
    port: 28334,
		qq: 3477642092,
    master: 2512217733
  }
]

var botlist = [
  {
    qq:1,
    port:23334,
    wsport:23335,
		configs: {}
  },
  {
    qq:1,
    port:24334,
    wsport:24335,
		configs: {}
  },
  {
    qq:1,
    port:25334,
    wsport:25335,
		configs: {}
  },
  {
    qq:1,
    port:26334,
    wsport:26335,
		configs: {}
  },
  {
    qq:1,
    port:27334,
    wsport:27335,
		configs: {}
  },
  {
    qq:1,
    port:28334,
    wsport:28335,
		configs: {}
  },
  {
    qq:1,
    port:29334,
    wsport:29335,
		configs: {}
  },
  {
    qq:1,
    port:30004,
    wsport:30005,
		configs: {}
  },
  {
    qq:1,
    port:30014,
    wsport:30015,
		configs: {}
  },
  {
    qq:1,
    port:30024,
    wsport:30025,
		configs: {
			enableMatchKeywords: [
				'^opt',
				'^mbi',
			]
		}
  }

]

const groupExpire = new Map()

init();
function init(){
  // for(var i=0;i<botlist.length;i++){
  //   var port = botlist[i].port;
  //   var wsport = botlist[i].wsport;
  //   initBotWS(port,wsport);
  // }
	botlist.forEach(bot => {
		let { port, wsport, configs } = bot
		initBotWS(port, wsport)
	})
}

function initBotWS(port,wsport, configs){
  var WebSocketClient = require('websocket').client;

  var client = new WebSocketClient();

  client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
  });

  client.on('connect', function(connection) {
    wsonline = true;
    console.log('WebSocket Client Connected '+wsport);
    connection.on('error', function(error) {
      console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
      wsonline=false;
      console.log('echo-protocol Connection Closed');
    });
    connection.on('message', function(message) {
      if (message.type === 'utf8') {
        handleMsg(JSON.parse(message.utf8Data),port, configs)
      }
    });
  });
  client.connect('ws://'+myip+':'+wsport+'/event');
}

var queue = []
var xqueue = []
function addSendQueue(groupid,msg,port){
  var gidstr = groupid+"";
    msg = msg.replace(/CQ:image,file=sen/gi, "CQ:image,file=file:/home/flan/baibai/coolq-data/cq/data/image/sen")
    msg = msg.replace(/CQ:cardimage,file=sen/gi, "CQ:cardimage,file=file:/home/flan/baibai/coolq-data/cq/data/image/sen")
    msg = msg.replace(/CQ:record,file=sen/gi, "CQ:record,file=file:/home/flan/baibai/coolq-data/cq/data/record/sen")
    var bdy = {"group_id": groupid, message: msg};
    console.log("send:"+groupid+":"+msg);
    request({
        headers:{
            "Content-Type":"application/json"
        },
        method: "POST",
        url: 'http://'+myip+':'+port+'/send_group_msg',
        body: JSON.stringify(bdy)
    }, function(error, response, body) {
        if (error && error.code) {
            console.log('pipe error catched!')
            console.log(error);
        } else {
            console.log('ok1');
        }
        saveChat(groupid, 981069482, "百百", msg,port);
    });
}

const formatMsg = msg => {
	let out = []
	msg.split('[CQ:').forEach((cqmsg, index) => {
		if(index) {

		} else {
			if(cqmsg) {
				out.push({
					"type": "text",
					"data": {
						"text": cqmsg
					}
				})
			}
		}
	})
}

const formatSize = (byte) => {
  let sizeOpt = ['byte', 'KB', 'MB', 'GB', 'TB'], i = 0, t = byte
  while(i < sizeOpt.length && t > 1) {
    t = t / 1024
    i ++
  }
  return `${(t * 1024).toFixed(2)}${sizeOpt[i - 1]}`
}

function handleMsg(msgObj,port, configs){
  try{
    handleMsg_D0(msgObj,port, configs);
  }catch(e){
    console.log(e);
  }
}

function handleMsg_D0(msgObj,port, configs){

  //TODO: 目前百百会接受自己的发言，暂时先这样处理
  if(new Set([
    981069482,
    3291864216,
    1840239061,
    2771362647,
    384901015
  ]).has(msgObj.user_id)) {
    return
  }

  var content = msgObj.message;
  if (content) {
    if (content.indexOf('&amp;') > -1) {
      content = content.replace(/&amp;/g, '&');
    }
    if (content.indexOf('&#44;') > -1) {
      content = content.replace(/&#44;/g, ',');
    }
    if (content.indexOf('[CQ:at,qq=2375373419]') > -1) {
      content = content.replace(/\[CQ:at,qq=2375373419\]/g, '百百');
    }
    if (content.indexOf('[CQ:at,qq=981069482]') > -1) {
        content = content.replace(/\[CQ:at,qq=981069482\]/g, '百百');
    }
    if (content.indexOf('[CQ:at,qq=3291864216]') > -1) {
      content = content.replace(/\[CQ:at,qq=3291864216\]/g, '百百');
    }
    if (content.indexOf('[CQ:at,qq=1840239061]') > -1) {
      content = content.replace(/\[CQ:at,qq=1840239061\]/g, '百百');
    }
    if (content.indexOf('[CQ:at,qq=914853856]') > -1) {
      content = content.replace(/\[CQ:at,qq=914853856\]/g, '百百');
    }
    msgObj.message=content;
  }
  handleMsg_D(msgObj,port, configs);
}

function handleMsg_D(msgObj,port, configs) {



  // console.log('\n\n\n\n\n======================')
  // console.log(msgObj)
  // console.log('======================\n\n\n\n\n')
  var type = msgObj.message_type;
  var groupid = msgObj.group_id;
  var content = msgObj.message;
  if(content){
    var nn0 = content.toLowerCase().indexOf('%rd');
    if(nn0>0){
      var rdx = parseInt(content.substring(nn0+3));
      var ft = content.substring(0,nn0);
      var et = content.substring(nn0+3+(''+rdx).length)
      var rdn = Math.floor(Math.random()*rdx)+1;
      content = ft+rdn+et;
    }
  }

  var self= msgObj.self_id;
  var callback
  // var port;
  // var sf = (self+"").substring(0,5);
  // if(sf=="38490"){
  //   port = 29334;
  // }

  var gidstr= groupid+"";
  var force=0;
  if(content&&content.length>6){
    if((content.trim().substring(0,6)=="!force")||(content.trim().substring(0,6)=="！force")){
      force=1;
    }
  }
  if(!force){
    if((
        gidstr.startsWith("22169")||
        gidstr.startsWith("74633")||
        gidstr.startsWith("22169")||
        gidstr.startsWith("67096")||
        gidstr.startsWith("77670")||
        gidstr.startsWith("69738")||
        gidstr.startsWith("96435")||
        gidstr.startsWith("xxxxx")
      )&&port==23334){
      return;
    }
    if((
        gidstr.startsWith("22169")||
        gidstr.startsWith("xxxxx")

      )&&port==25334){
      return;
    }
    if((
        gidstr.startsWith("20570")||
        gidstr.startsWith("57758")||
        gidstr.startsWith("xxxxx")
      )&&port!=24334){
      return;
    }
    if((
        gidstr.startsWith("25032")||
        gidstr.startsWith("xxxxx")
      )&&port!=30004){
      return;
    }
  }else{
    content = content.substring(6).trim();
  }

  if(getMsgCount(port)>1500){
    return;
  }

  switch(msgObj.notice_type) {
    case 'group_increase':
			// 暂时屏蔽欢迎提示
      // if(new Set([
      //   2375373419, 3291864216, 1840239061, 981069482, 914853856, 2771362647, 760946387,
      //   '2375373419', '3291864216', '1840239061', '981069482', '914853856', '2771362647', '760946387',
      // ]).has(msgObj.user_id)){
      //   return
      // }
      // // 加群操作
      // let wellcome
      // switch(groupid){
      //   case 96681597:
      //     wellcome = `欢迎新人[CQ:at,qq=${msgObj.user_id}]，入服教程：https://bbs.gugu6.info/forum.php?mod=viewthread&tid=95#lastpost`
			// 		addSendQueue(groupid,wellcome,port);
      //     break
      //   case 672926817:
      //     wellcome = `看！新内鬼[CQ:at,qq=${msgObj.user_id}]`
			// 		addSendQueue(groupid,wellcome,port);
      //     break
      //   default:
      //     // wellcome = `欢迎[CQ:at,qq=${msgObj.user_id}]加群`
      //     break
      // }
      return
    case 'group_decrease':
			// 暂时屏蔽离群提示
      // if(msgObj.sub_type == 'kick') {
      //   addSendQueue(groupid,`${msgObj.user_id}被踹走了`,port);
      // } else {
      //   addSendQueue(groupid,`${msgObj.user_id}溜走了`,port);
      // }
      return
    case 'group_upload':
			// 暂时屏蔽上传文件提示
      // if(new Set([672926817, 577587780, '672926817', '577587780']).has(msgObj.group_id)) {
      //   addSendQueue(groupid, `[CQ:at,qq=${msgObj.user_id}] 倒了群垃圾！\n ${msgObj.file.name}(${formatSize(msgObj.file.size || 0)})` ,port);
      //   return
      // }
      break
		case 'group_recall':
			console.log(`\n\n\n\n\n===============`)
			console.log(msgObj)
			break
  }


  if (type == 'private') {
		console.log('\n\n\n\n===== 这是私聊 =====')
		console.log(msgObj)
		console.log('===== 这是私聊 =====\n\n\n\n')
    var userid = msgObj.user_id;
    callback = function (res) {
	    console.log('private res:'+res);
      if (res.trim().length > 0) {
          var options = {
            host: ''+myip+'',
            port: port,
            path: '/send_private_msg?user_id=' + userid + '&message=' + encodeURIComponent(res),
            method: 'GET',
            headers: {}
          };
          console.log("priv:" + userid + ":" + content + ":" + res);
          var req = http.request(options);
          req.on('error', function (err) {
            console.log('req err:');
            console.log(err);
          });
          req.end();
      }
    }
	getChatgptReplay(content,357470,357470,callback);
    return;
  }
  if (type != 'group') {
    return;
  }
  var from = msgObj.user_id;

  var name = getUserNameInGroup(from, groupid,port);
  var nickname = getUserNickInGroupByCache(from, groupid);
  console.log(groupid + ":" + name + ":" + content)
  if (name == null) {
    name = nickname;
  }
  if (name.startsWith("nick error") || name.startsWith("card error")) {
    name = '[CQ:at,qq=' + from + ']';
  }

  var groupName = getGroupName(groupid,port);

	// console.log('\n\n\n\n=====================')
	// console.log(msgObj)
	// console.log('=====================\n\n\n\n')

  saveChat(groupid, from, name, content,port, msgObj);

	var rdmPerpend = [
		'::>_<::',
		'୧(๑•̀ɜ•́๑)૭✧',
		'( •︠ˍ•︡ )',
		'(๑•̀ㅂ•́)و✧',
		'٩(•̤̀ᵕ•̤́๑)',
		'ฅ՞•ﻌ•՞ฅ',
		'(ฅ∀<`๑)',
		'(๑˘ ³˘๑)/',
		'վ\'ᴗ\' ի',
		'(>_<)',
		'就是',
		'那',
		'这个',
	],
	rdmAppend = [
		'::>_<::',
		'୧(๑•̀ɜ•́๑)૭✧',
		'( •︠ˍ•︡ )',
		'(๑•̀ㅂ•́)و✧',
		'٩(•̤̀ᵕ•̤́๑)',
		'ฅ՞•ﻌ•՞ฅ',
		'(ฅ∀<`๑)',
		'(๑˘ ³˘๑)/',
		'վ\'ᴗ\' ի',
		'(>_<)',
		'捏',
		'的说',
		'？',
		'没了',
		'是吧',
	]
	callback = function (res, blank) {
		if (res.trim().length > 0) {
			// 添加自定义后缀
			if(new Set([99999]).has(port)) {
				if(Math.random() < 0.5) {
					res = `${rdmPerpend[~~(rdmPerpend.length * Math.random())]} ${res}`
				} else {
					res = `${res} ${rdmAppend[~~(rdmAppend.length * Math.random())]}`
				}
			}

			switch(port) {
				case 29334:
					// 5秒随机
					groupExpire.set(msgObj.group_id, Date.now() + (~~(5*Math.random()))*1000)
					break
				case 30004:
					// 5秒随机
					groupExpire.set(msgObj.group_id, Date.now() + (~~(5*Math.random()))*1000)
					break
				case 30014:
					// 5秒随机
					groupExpire.set(msgObj.group_id, Date.now() + (~~(5*Math.random()))*1000)
					break
				case 30024:
          // 5秒随机
          groupExpire.set(msgObj.group_id, Date.now() + (~~(5*Math.random()))*1000)
					break
			}

			addSendQueue(groupid,res,port);
		}
	}

  if(msgObj.user_id != 799018865 && (groupExpire.get(msgObj.group_id) || 0) > Date.now()) {
    console.log(`该群在${(groupExpire.get(msgObj.group_id) - Date.now()) / 1000}秒后可发消息`)
    return
  }

	//TODO: 洛奇交易群屏蔽功能，但是记录群内语句
	if(
		msgObj.group_id === 704773457 &&
		msgObj.user_id != 799018865 &&
		!(
			msgObj.message.trim().startsWith('opt')
			|| msgObj.message.trim().startsWith('释放查询')
			|| msgObj.message.trim().startsWith('gcs')
			|| msgObj.message.trim().startsWith('meu')
			|| msgObj.message.trim().startsWith('mbi')
			|| msgObj.message.trim().startsWith('洛奇')
			|| msgObj.message.trim().startsWith('菜单')
			|| msgObj.message.trim().startsWith('menu')
			// || msgObj.message.trim().startsWith('rua')
			// || msgObj.message.trim().startsWith('boss')
		)
	) {
		answer(content,name,groupName,callback,groupid,from);
		return
		// if(msgObj.user_id != 799018865) {
		// 	return
		// } else {
		// }
	}
  handle_msg_D2(content,from,name,groupid,callback,groupName,nickname,'group',port,msgObj)
}

function handle_msg_D2(content,from,name,groupid,callback,groupName,nickname,msgType,port,msgObjSource){

  content=content.trim();

  if(content.startsWith("w")){

    var options = {
      host: ''+myip+'',
      port: 11005,
      path: '/c?d='+encodeURIComponent(content)+'&gid='+groupid+"&name="+encodeURIComponent(name)+"&qq="+from+"&port="+port,
      method: 'GET',
      headers: {}
    };
    var req = http.request(options,function(res){
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        if(resdata.length>0){
          callback(resdata);
        }
      });
    });
    req.on('error', function (err) {
      console.log('req err:');
      console.log(err);
    });
    req.end();


    return;
  }
	// console.log(from)

	if(!groupConfig[groupid]) {
		groupConfig[groupid] = {
			FLASH_RESEND : false,
			FLASH_RESEND_USER: new Set(),
      FLASH_RESEND_BAN: new Set(),
      RESEND_MSG: new Map()
		}
	}
	if(content.startsWith('/groupset') && configAdminSet.has(from)) {
		//控制台
		let codes = content.substring(10).split(' ')
		switch(codes[0]) {
      case 'send_msg':
        let f = parseInt(codes[1]), r = parseInt(codes[2])
        if(isNaN(f) || isNaN(r))
          return
        groupConfig[groupid].RESEND_MSG.set(f, r)
        callback('设置成功')
        break
			case 'flash_resend':
				if(codes[1] == 'true'){
					groupConfig[groupid].FLASH_RESEND = true
					callback('此群闪照跟踪已开启')
          if(codes[2] == '--banid') {
            codes[3].split(',').forEach(id => {
              groupConfig[groupid].FLASH_RESEND_BAN.add(id)
            })
          }
				}
				if(codes[1] == 'false'){
					groupConfig[groupid].FLASH_RESEND = false
					callback('此群闪照跟踪已关闭')
				}
				break
			case 'check_flash_type':
				callback(`此群闪照跟踪功能${groupConfig[groupid].FLASH_RESEND ? '开启': '关闭'}中`)
				break
			case 'force_resend':
				groupConfig[groupid].FLASH_RESEND_USER.add(codes[1])
				callback(`${codes[1]}已强制闪照跟踪`)
				break
			case 'remove_force_resend':
				if(groupConfig[groupid].FLASH_RESEND_USER.has(codes[1])) {
					groupConfig[groupid].FLASH_RESEND_USER.delete(codes[1])
					callback(`${codes[1]}已移除强制闪照跟踪`)
				} else {
					callback(`${codes[1]}未被强制闪照跟踪`)
				}
				break
			case 'force_resend_list':
				let arr = Array.from(groupConfig[groupid].FLASH_RESEND_USER)
				if(arr.length) {
					callback(`此群${arr.join(',')}被强制闪照跟踪`)
				} else {
					callback(`此群无人被强制闪照跟踪`)
				}
				break
		}
		return
	}

  if(content.startsWith('/') && configAdminSet.has(from)) {
  	console.log('=============================')
		console.log('entry console')
  	//控制台
		let codes = content.substring(1).split(' ')
		switch(codes[0]) {
			case 'flash_resend':
				if(codes[1] == 'true'){
					globalConfig.FLASH_RESEND = true
					callback('闪照跟踪已开启')
				}
				if(codes[1] == 'false'){
					globalConfig.FLASH_RESEND = false
					callback('闪照跟踪已关闭')
				}
				break
		}
		return
	}

  if(groupConfig[groupid].RESEND_MSG.has(from)) {
    let r = Math.random() * 100, gr = groupConfig[groupid].RESEND_MSG.get(from)
    if(r > gr) {
      console.log(`==== MSG：[${from}] ${r} / ${gr} ====`)
      return
    }
  }

  if(content.match(/CQ:image,type=flash,file=/)) {
  	// console.log('====================>', FLASH_RESEND)
    if((globalConfig.FLASH_RESEND || groupConfig[groupid].FLASH_RESEND) && groupConfig[groupid].FLASH_RESEND_BAN.has(`${from}`)) {
      callback(`有人发了一张闪照，但是只被我偷偷记下了`)
      return
    }
  	let targetFile = content.substring(content.match(/CQ:image,type=flash,file=/).index + 25, content.length - 7)
		flashHandler(
			from,
			groupid,
			targetFile,
			port,
			globalConfig.FLASH_RESEND || groupConfig[groupid].FLASH_RESEND || groupConfig[groupid].FLASH_RESEND_USER.has(`${from}`),
			callback
		)
		return
	}


  if((content=='百百')||(content.indexOf('百百')>=0&&content.indexOf('菜单')>=0)){
    var ret = "";
    ret = ret + "欢迎使用百百型机器人\n";
    ret = ret + "通用功能导航：【`】【·】【ˋ】【'】【‘】【，】【’】任选其一\n";
    ret = ret + "游戏导航：【玩游戏】\n";
    ret = ret + "最终幻想XIV导航【ffxiv】\n";
    ret = ret + "明日方舟导航【ark】\n";
    ret = ret + "洛奇导航【opt】\n"
    ret = ret + "舰队collection导航【'e】\n"
    ret = ret + "大头菜价记录和预测【dtsh】\n"
    ret = ret + "其他/意见或建议/定制功能请到\n"
    ret = ret + "https://github.com/TouhouFishClub/baibaibot/issues"
		drawTxtImage('', ret.trim(), callback, {color: 'black', font: 'STXIHEI.TTF'})
    // callback(ret.trim());
    return;
  }

  if(content=="玩游戏"){
    var ret = "";
    ret = ret + "俄罗斯轮盘【俄罗斯轮盘】\n";
    ret = ret + "炸弹人【炸弹人】\n";
    ret = ret + "抽卡【抽卡】\n";
    ret = ret + "捉内鬼【捉内鬼】\n";
    ret = ret + ""
    callback(ret.trim());
    return;
  }

  if(content.startsWith('c ')){
    content=content.substring(1).trim();
    getChatgptReplay(content,groupid,from,callback);
    return;
  }
  // if(content.startsWith('s ')||content.startsWith('s1')||content.startsWith('s2')||content.startsWith('s3')){
  //   content=content.trim();
  //   handleCustomChatgptReplay(content,groupid,from,callback);
  //   return;
  // }
  if(content.startsWith('百百 ')){
		if(new Set([30004]).has(port)) {
			return
		}
		if(new Set([74276571]).has(groupid)) {
			return
		}
		if(!new Set([24334, 25334]).has(port)) {
			return
		}
    content=content.trim();
    getBaibaiReplay(content,groupid,from,callback);
    return;
  }




  if(content=='扫雷'||content=='群扫雷'){
    handleSweepReply(content.trim(),from,name,groupid,callback);
    return;
  }
  if(content.trim().substring(0,1)=='s'){
    var left = content.trim().substring(1).trim();
    if(left.length==2){
      handleSweepReply(left.trim(),from,name,groupid,callback);
      return;
    }
  }






  if(
    content === '炸弹人' ||
    content === '炸彈人' ||
    content === '参加' ||
    content === '參加' ||
    content === '放置' ||
    content === '移动' ||
    content === '移動' ||
    content === '待机' ||
    content === '待機'
  ){
    bomberman(content, from, name, groupid, callback)
    return
  }

  if(content=="捉内鬼"){
      handleDSReply(content,groupid,from,name,callback,port);
      return;
  }
  if(content.trim().substring(0,3).toLocaleLowerCase()=='tng'){
    handleVoteReply(content.substring(3),groupid,from,name,callback,port);
    return;
  }
  if(content.trim().substring(0,3).toLocaleLowerCase()=='zng'){
    handleDSReply(content.substring(3),groupid,from,name,callback,port);
    return;
  }
  if(content.startsWith('z8')){
    handleSenkaReply(content.trim(),groupid,from,callback);
  }




  var rcontent = content;
  rcontent=rcontent.replace(/上/g,"u").replace(/下/g,"d").replace(/左/g,"l").replace(/右/g,"r");
  rcontent=rcontent.replace(/开火/g,"开枪").replace(/fire/g,"开枪");
  rcontent=rcontent.replace(/move/g,"移动");
  var survivalnew = false;
  if(rcontent=="俄罗斯轮盘"){
    survivalnew=true;
  }else if(rcontent.indexOf("开枪")>-1){
    if(rcontent.startsWith("开枪")&&rcontent.length==3){
      survivalnew=true;
    }else if(rcontent.startsWith("向")&&rcontent.endsWith("开枪")&&rcontent.length==4){
      survivalnew=true;
    }else if(rcontent=="开枪"){
      survivalnew=true;
    }
  }else if(rcontent.indexOf("移动")>-1){
    if(rcontent.startsWith("移动")&&rcontent.length==3){
      survivalnew=true;
    }else if(rcontent.startsWith("向")&&rcontent.endsWith("移动")&&rcontent.length==4){
      survivalnew=true;
    }else if(rcontent=="移动"){
      survivalnew=true;
    }
  }else if(rcontent=="u移"||rcontent=="d移"||rcontent=="l移"||rcontent=="r移"){
    survivalnew=true;
  }else if(rcontent=="u射"||rcontent=="d射"||rcontent=="l射"||rcontent=="r射"){
    survivalnew=true;
  }else if(rcontent=="加入"||rcontent=="参加"||rcontent=="join"){
    survivalnew=true;
  }
  if(survivalnew==true){
    handleGun(rcontent,from,name,groupid,callback);
    return;
  }


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


  if(content.trim() === '摸鱼日历'){
    tapFish(callback)
    return
  }


  if(content.trim()=="杂鱼"){

    //ret = '[CQ:record,file=send/c/paimoe_zayu.mp3]'
    //callback(ret)
    //return;
  }

  if(content.trim() === '走私查询'){
    smuggler(callback)
    return
  }

  if(content.trim()=='时尚品鉴'){
    beautyReply(content,groupid,callback);
    return;
  }

  if(content=="飞行棋"||content.startsWith("fly")){
    handleFlyindReply(content,from,groupid,callback)
    return;
  }


  if(content == 'testgif' && from == 799018865) {
    console.log('==== test gif module ====')
    testGif(callback)
  }

  if(content == 'test' && from == 799018865) {
		callback([
			'testtest',
			{
				"type": "share",
				"data": {
					"url": "http://live.bilibili.com/27921417",
					"title": "华恋型芙兰",
					"content": "关注主播谢谢喵",
					"image": "https://i0.hdslb.com/bfs/face/502d8074fffd1d254c6f60c3f4c40100f6e9d15b.jpg"
				}
			}
		])
  }

  if(content == '今日专家' || content == '今日专家地下城') {
    let index = ~~((new Date().getTime()+28800000 - 25200000)/60/60/24/1000)%9
  	callback(`今天的专家地下城是${['皮卡','伊比','赛尔','拉比','玛斯','菲奥娜','巴里','克里尔','伦达'][index]}地下城`)
	  return
  }

  if(content == '来块回音石' || content == '来个回音石') {
	  createEchoStone(groupid, callback)
	  return
  }

  if(content == '来块简单模式回音石' || content == '来个简单模式回音石') {
	  createEchoStone(groupid, callback, false, 0)
	  return
  }

  if(content == '来块低保回音石' || content == '来个低保回音石') {
	  createEchoStone(groupid, callback, true)
	  return
  }

	if(content == '来块简单模式低保回音石' || content == '来个简单模式低保回音石') {
		createEchoStone(groupid, callback, true, 0)
		return
	}

  if(content == '开启回音石活动') {
	  echoStoneEventSwitch(groupid, callback, true)
	  return
  }

  if(content == '关闭回音石活动') {
	  echoStoneEventSwitch(groupid, callback, false)
	  return
  }

  if(content.match(/^尔格\d{1,2}突破\d{1,5}手$/)) {
    ergo(from, content, callback)
  }
	if(content.startsWith('洛奇蛋池')) {
		selectGachaGroup(from, groupid, callback, content.substring(4).trim())
		return;
	}
	if(content == '洛奇来一发') {
		mabiGacha(from, groupid, callback, 1)
		return;
	}
  if(content == '洛奇来十连') {
    mabiGacha(from, groupid, callback, 11)
    return;
  }
  if(content == '洛奇来一单') {
    mabiGacha(from, groupid, callback, 60)
    return;
  }
  if(content == '洛奇来十单') {
    mabiGacha(from, groupid, callback, 600)
    return;
  }

  if(content.startsWith('menu') || content.startsWith('菜单')) {
    menu(content, groupid, callback)
    return
  }

  let con =content.trim(), fi = con.substring(0,4)
  if(fi === '释放查询'){
    op(from, name, con.substring(4).trim(), 'image', callback);
    return;
  }
  if(fi == 'ffiv'){
    searchFF14Item(con.substring(4),name,callback);
    return;
  }
  if(fi == 'ffiq'){
    searchQuest(con.substring(4),name,callback);
    return;
  }
  if(fi == 'ffid'){
    ff14MarketReply(con.substring(4),from,callback);
    return;
  }

  if(con.startsWith("/")){
    calAttr(content.substring(1),from,callback);
    return;
  }
  fi = con.substring(0,5)
  if(fi == 'ffxiv'){
    searchFF14Item(con.substring(5),name,callback);
    return;
  }

  if(fi == 'fflog'){
    fflogs2Reply(con.substring(5).trim(),name,callback,0);
    return;
  }
  if(fi == 'cnlog'){
    fflogs2Reply(con.substring(5).trim(),name,callback,1);
    return;
  }

  fi = con.substring(0, 3)
  if(fi == 'ffc') {
    PerfectCactpot(con.substring(3), callback)
  }


  if(con === 'ruawork' || (con.indexOf('茹娅') + 1 && con.indexOf('上班') + 1)){
    rua(callback)
    return
  }

  if(con.startsWith('jrrp') || con.startsWith('今日运势')){
    if(port == 29334){
      return
    }
		if(!new Set([24334, 25334]).has(port)) {
			return
		}
    let s = con.substring(4).trim()
    //[CQ:at,qq=395338563]

    if(s.startsWith('[CQ:at')){
      s = s.substring(s.indexOf('qq=') + 3, s.indexOf(']'))
      rp(from, callback, s)
      return
    }
    let ignoreJrrpDestSet = new Set([
      577587780,
      1072617253
    ])

    if(ignoreJrrpDestSet.has(groupid) || true) {
      rp(from, callback, from)
      return
    }
    rp(from, callback)
    return
  }

  if(con.endsWith('是什么颜色')) {
    renderColorBoard(con.substring(0, con.length - 5).trim(), callback)
    return
  }

  if(con.startsWith('查') && (con.endsWith('成分') | con.endsWith('浓度'))) {
    composition(con, callback)
    return
  }

  if(con.startsWith('查') && (con.endsWith('成分排名') | con.endsWith('浓度排名'))) {
    let s = con.substring(1, con.length - 4).trim()
    groupCompositionRank(groupid, port, s, callback)
    return
  }

  // 日历系统
  if(content.startsWith('日历设置')) {
    calendar(content.substr(4), from, groupid, callback)
    return
  }
  if(content.startsWith('日历修改')) {
    calendar(content.substr(4), from, groupid, callback, 'insert')
    return
  }
  if(content.startsWith('选择日历')) {
    calendar(content.substr(4), from, groupid, callback, 'insert-select')
    return
  }
  if(content.startsWith('日历删除')) {
    calendar(content.substr(4), from, groupid, callback, 'delete')
    return
  }
  if(content.startsWith('选择删除')) {
    calendar(content.substr(4), from, groupid, callback, 'delete-select')
    return
  }
  if(content.endsWith('日历')) {
    calendar(content.substr(0, content.length - 2), from, groupid, callback, 'search')
    return
  }

  if(con.indexOf('座运势') + 1 && con.length == 5){
    zodiac(con, callback)
    return
  }
  if(con.startsWith("我的星座是")){
    saveMyZodiac(con.substring(5),from,name,callback);
    return;
  }

  if(con.startsWith('作诗')||con.startsWith('写诗')){
    poemReply(con.substring(2),name,callback);
    return;
  }

  fi = con.substring(0,2)
  if(fi=='fe'){
    searchFeChara(content.substring(2),from,groupid,callback);
    return;
  }



  if(con == '方舟老黄历') {
    arkCalendar(callback)
  }
  if(con == '洛奇老黄历') {
    mabiCalendar(callback)
  }
  // if(con == '胡萝卜') {
  //   carrot(false, callback, groupid)
	// 	return
  // }
  if(con.startsWith('轮渡时刻表') || con.startsWith('mft')) {
		if(con.startsWith('轮渡时刻表')) {
			con = con.substring(5).trim()
		}
		if(con.startsWith('mft')) {
			con = con.substring(3).trim()
		}
		FerryTimetable(con, from, groupid, callback)
		return
  }
  if(con.toLowerCase() == 'bosswork' || con.toLowerCase() == 'boss时间表') {
		BossWork(from, groupid, callback)
		return
  }
  if(con == '群关键词' || con == 'hawk') {
		renderChatPersonas(groupid, callback)
		return
  }
  if(con == '群水笔' || con == '群水比' || con == '群发言排行') {
		renderGroupCount(port, groupid, callback)
		return
  }
  if(con.startsWith('抽一个群友')) {
		randomGroupUser(con.substring(5).trim(), port, groupid, callback)
		return
  }
  if(con.startsWith('点草一个群友')) {
		randomGroupUser(con.substring(6).trim(), port, groupid, callback, true)
		return
  }
  if(con.startsWith('gcs')) {
		searchGroupChat(from, con.substring(3).trim(), port, groupid, callback)
		return
  }
  if(con == '打开财富密码') {
		raffle(content, from, groupid, callback)
		return
  }
  if(/^打开\d+次财富密码$/.test(con)) {
  	let pt = parseInt(con.split('次')[0].substring(2))
		if(pt <=5)  {
			raffle(content, from, groupid, callback, pt)
		}
		return
  }
  if(con.endsWith('吃什么')) {
    chishenme(from, con.substring(0, con.length - 2), callback)
		return
  }
  if(con.endsWith('什么') && con.match('吃') && con.match('吃').length) {
    chishenme(from, con.substring(0, con.length - 2), callback, false)
		return
  }
  if(con == 'bcr日程') {
    schedule('cn', callback)
  }
  if(con == 'pcr日程') {
    schedule('jp', callback)
  }
  if(con == 'chp' || con == '彩虹屁') {
    chp(callback)
  }
  if(con.endsWith('.jpg')) {
    let tar = con.substring(0, con.length - 4)
		if(tar.split('#').length == 2) {
			fiveThousandTrillionYen(tar, callback)
			return
		}
    if((tar.length <= 3 && tar.trim()) || (tar.split('#').length <= 4 && tar.split('#').length >= 2)) {
      drawBubble(tar, callback)
			return
    }
    return
  }


  if(con.substring(0, 4) == 'rmct') {
    morse(con.substring(4).trim(), false, callback)
    return
  }

  if(con.substring(0, 3) == 'rmc') {
    morse(con.substring(3).trim(), true, callback)
    return
  }

  let fie4 = con.substring(0, 4)
  if(fie4 == '切噜～♪') {
    cherugo(con.substring(4), false, callback)
    return
  }
  if(fie4 == '切噜一下') {
    cherugo(con.substring(4), true, callback)
    return
  }

  if(con.toLowerCase() === 'bcr') {
    callback(`bcr模块指令已迁移至sbcr`)
    return
  }

  if(fie4.toLowerCase() == 'sbcr'){
    // console.log('=============')
    // console.log(con.substring(3))
    discord(con.substring(4), from, groupid, callback);
    return;
  }

  let fie = con.substring(0, 3)
  if(fie.toLowerCase() === 'bcs') {
    // callback('活动结束已关闭此功能')
    // return
    let grs = con.substring(3).trim(), sp = grs.split(' -- '), option = {}
    if(sp.length == 2) {
      grs = sp[0]
      if(from == 799018865) {
        let params = sp[1]
        params.split('&').forEach(p => {
          let s = p.split('=')
          if(s.length == 2) {
            option[s[0]] = s[1]
          } else {
            option[s[0]] = true
          }
        })
      }
    }
    guildRankSearch(grs, from, groupid, callback, option)
    return
  }
  if(fie.toLowerCase() == 'tra') {
    trade(con.substring(3), port, from, groupid, callback)
	  return
  }
  if(fie.toLowerCase() == 'tro') {
		tradeOcr(con.substring(3), port, callback)
	  return
  }
  if(fie.toLowerCase() == 'ysr') {
	  Reliquary(con.substring(3), from, port, callback)
	  return
  }
  if(fie.toLowerCase() == 'ysb') {
	  Reliquary(con.substring(3), from, port, callback, 'baiduAip')
	  return
  }
  if(fie.toLowerCase() == 'ark'){
    let sa, si
    switch(con.substring(3, 4)){
      case 's':
      case 'S':
        sa = con.substring(4)
        si = sa.indexOf('+')
        if(si > -1) {
          sa = sa.substring(si + 1)
        }
        ans(from, sa, callback)
        break;
      case 'e':
      case 'E':
        sa = con.substring(4)
        si = sa.indexOf('+')
        if(si > -1) {
          sa = sa.substring(si + 1)
        }
        anc(from, sa, callback)
        break;
      case 'd':
      case 'D':
        sa = con.substring(4)
        si = sa.indexOf('+')
        if(si > -1) {
          sa = sa.substring(si + 1)
        }
        and(from, sa, callback)
        break;
      case 'c':
      case 'C':
        sa = con.substring(4)
        si = sa.indexOf('+')
        if(si > -1) {
          sa = sa.substring(si + 1)
        }
        anchan(sa, callback)
        break;
      case 'p':
      case 'P':
        sa = con.substring(4)
        si = sa.indexOf('+')
        if(si > -1) {
          sa = sa.substring(si + 1)
        }
        anp(from, sa, callback)
        break;
      case 'l':
      case 'L':
        arkCalendar(callback)
        break;
      default:
        sa = con.substring(3)
        si = sa.indexOf('+')
        if(si > -1) {
          sa = sa.substring(si + 1)
        }
        si = sa.toLowerCase().indexOf('tag')
        if(si > -1) {
          sa = sa.substring(si + 3)
        }
        anr(from, sa, callback)
    }
    return
  }
  if(fie.toLowerCase() == 'ygo'){
    ygo(con.substring(3).trim(), callback);
    return;
  }

  if(fie.toLowerCase() == 'dtc'){
    actp(con.substring(3), from, groupid, -1, callback);
    return;
  }
  if(fie.toLowerCase() == 'dts'){
    saveDTCPrice(con.substring(3),from,groupid,callback);
    return;
  }

  if(fie == 'opt' && fi != 'opts'){
    op(from, name, con.substring(3).trim(), 'image', callback);
    return;
  }

  if(fie == 'meu'){
    searchEquipUpgrade(from, groupid, con.substring(3).trim(), callback);
    return;
  }

  if(fie == 'mbi'){
    searchMabiRecipe(con.substring(3).trim(), callback);
    return;
  }

  if(fie == 'mbd'){
    searchMabiRecipe(con.substring(3).trim(), callback, true);
    return;
  }

  if(rcontent=='好感度'){
    getLike(from,name,callback);
    return;
  }

  if(rcontent.toUpperCase().startsWith("HD")){
    ImgScale(rcontent,groupid,from,callback);
    return;
  }
  if(rcontent.startsWith('咏唱设置')){
    saveMagicPrefer(content,groupid,from,callback);
    return;
  }
  if(rcontent.startsWith("魔法少女")){
  	naifu(callback,rcontent);
	return;
  }
  if(rcontent.startsWith("魔法烧酒HD")){
    HDdiffuse(rcontent,groupid,from,callback);
    return;
  }
  if(rcontent.startsWith("魔法烧酒")){
    novelAIDiffuse(rcontent,groupid,from,callback);
    return;
  }
  if(rcontent.startsWith("马猴烧酒")){
    novelAI(callback,rcontent);
    return;
  }

  if(rcontent.startsWith("画图 ")||rcontent.startsWith("绘图 ")){
    if(new Set([23334, 26334, 28334, 30004, 30014]).has(port)){
      return
    }
    if(rcontent.startsWith("画图 ")){
      diffuseReply(rcontent.substring(2),groupid,from,callback);
      return;
    }
    if(rcontent.startsWith("绘图 ")){
      diffuseReply(rcontent.substring(2),groupid,from,callback,true);
      return;
    }
  }

  if(rcontent.startsWith("我要转生")||rcontent.startsWith("异世界")){
    yishijie(content,groupid,from,callback)
    return;
  }

  if(rcontent.startsWith("抽卡")){
    AIdraw(content,groupid,from,callback)
    return;
  }

  if(rcontent.startsWith("抽抽卡")){
    if(new Set([23334, 29334, 26334, 28334, 30004, 30014]).has(port)){
      return
    }
    drawNameCard(name,from,callback,groupid);
    return;
  }


  if(rcontent.startsWith("猫图")||rcontent.startsWith("吸猫")){
    if(new Set([23334, 29334, 26334, 28334, 30004, 30014, 30024]).has(port) && from !== 799018865){
      return
    }
    catreply(rcontent.substring(2),from,callback);
    return;
  }
  if(rcontent.startsWith("色图")||rcontent.startsWith("炼铜")){
    if(new Set([29334, 26334, 28334, 30004, 30014, 30024]).has(port) && from !== 799018865){
      return
    }
    runsetu(rcontent,groupid,from,callback,port);
    return;
  }
  if(rcontent.startsWith("玛丽")){
     handleGaReply(content.substring(2),groupid,from,callback);
     return;
  }
  if(rcontent.split('$').length==2){
    handleMazeReply(rcontent,groupid,from,callback);
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
  if(first=="%"){
    replyKancolleRoute(content.substring(1),name,callback);
  }




  if(first=='`'||first=='·'||first=='ˋ'||first=="'"||first=="‘"||first=="，"||first=="’"){

    var c1 = content.substring(1);
    if(c1==""){
      var ret = "`1+名词：百科查询\n翻译成中文：`6+要翻译的内容\n翻译成日文：`2+要翻译的内容\n翻译成英文：`3+要翻译的内容\n";
      ret = ret + "`4+内容：百度查询\n`c汇率转换\n`0+数字：大写数字转换\n";
      ret = ret + '`d50x10：ROLL10次小于50整数\n';
      ret = ret + "天气预报：城市名+天气\n教百百说话：问题|答案\n计算器：直接输入算式\n闲聊：``+对话\n";
      ret = ret + "今日运势占卜【今日运势】【jrrp】\n";
			drawTxtImage('', ret.trim(), callback, {color: 'black', font: 'STXIHEI.TTF'})
      // callback(ret);
    }else{
      reply(c1,name,callback,groupid,from,groupName,nickname,port);
    }
    return;
  }

  var n = content.indexOf('天气');
  if(n==2){
    var place = content.substring(0,2);
    if((place.indexOf("风")>=0)||(place.indexOf("冰")>=0)||(place.indexOf("火")>=0)||(place.indexOf("水")>=0)){
      handleFF14weatherReply(content,callback);
      return;
    }
  }

  let co = content.indexOf('疫情')
  if(content.endsWith('疫情') && content.length <= 10 && content.length > 2) {
    cov(content.substring(0, content.length - 2), callback)
    return
  }
  if(content == '硝局的花园') {
    cov(
      '硝局的花园',
      callback,
      true,
      ['现有女友', '今日新增女友', '确诊女友', '疑似女友', '境外女友'],
      {
        name: '硝局的花园',
        type: 'other',
      },
      {
        confirmedCount: [~~(8 * Math.random()), ~~(4 * Math.random())],
        curedCount: [~~(200 * Math.random()), ~~(100 * Math.random())],
        currentConfirmedCount: [~~(4 * Math.random()), ~~(2 * Math.random())],
        deadCount: [~~(4 * Math.random()), ~~(2 * Math.random())],
        suspectedCount: [~~(200 * Math.random()), ~~(100 * Math.random())]
      },
      '硝局的花园',
    )
    return
  }

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
    if(ca[0].length<300 && ca[0].split(' ').length < 2){
      saveTxt(ca[0],ca[1],name,groupName,callback,from,groupid);
      return;
    }
  }

  var calret = cal(content);
  if(calret){
    callback(content+"="+calret);
    return;
  }
  if(content.indexOf('百百')>-1){
    // if(port == 29334){
    //   return
    // }
		if(!new Set([24334, 25334]).has(port)) {
			return
		}
    tulingMsg(from,content.trim(),callback,groupid);
    return;
  }
  answer(content,name,groupName,callback,groupid,from);
  replayReply(content,name,groupid,callback,from,port);
  if(msgType=='private'){
    tulingMsg(from,content.trim(),callback,groupid);
    return;
  }
}

function reply(content,userName,callback,groupid,from,groupName,nickname,port){
  var first = content.substring(0,1);
  if(content.substring(0, 2) == 'gf'){
    gf(content.substring(2), callback)
  } else if(first=='`'||first=='·'||first=='ˋ'||first=="'"||first=="‘"||first=="，"||first=="’"){
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
  }/*else if(first=='d'||first=='D'){
    pairReply(content.substring(1),userName,callback);
  }*/else if(first=='t'||first=='T'){
    getKancollStaffTweet(content.substring(1),userName,callback);
  }else if(first=="e"||first=='E'){
    kce(userName,content.substring(1),callback);
  }else if(first=="l"||first=='L'){
    getShipReply(content.substring(1),userName,callback);
  }else if(first=="q"||first=='Q'){
    kcq(userName,content.substring(1),callback);
  }else if(first=="i"||first=='I'){
    descryptReply(content.substring(1),callback);
  }else if(first=="k"||first=='K'){
    getShip(content.substring(1),callback);
  }else if(first=='s'||first=='S'){
    searchSongByName(userName,content.substring(1),callback);
  }else if(first=='r'||first=='R'){
    // rd(content.substring(1), callback)
    callback(""+Math.floor(Math.random()*parseInt(content.substring(1))));
  }else if(first=='d'||first=='D'){
    rd(content.substring(1), from, callback)
    // callback(""+Math.floor(Math.random()*parseInt(content.substring(1))));
  }else if(first=='w'||first=='W'){
    searchMHW(content.substring(1),from,groupid,callback);
  }else if(first=='f'||first=='F'){
    fight(from,content.substring(1),groupid,callback,port);
  }else if(first=='g'||first=='G'){
    useMagicOrItem(from,userName,content.substring(1),groupid,callback,port);
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










const test1='123123'

module.exports={
  handleMsg,
  reply,
  handle_msg_D2,
  test1
}


