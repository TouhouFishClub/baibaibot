const http = require("http")
const path = require("path");
const { LOCALE_IP } = require("./baibaiConfigs")
const {simplized} = require("./lib/chs_cht")
const {saveAlarm} = require("./ai/private/alerm")
const {saveChat} = require("./ai/chat/collect")
const {getUserNameInGroup, getUserNickInGroupByCache, getGroupName} = require("./cq/cache");
const { getMsgCount } = require(path.join(__dirname, './lib/mongo.js'))
const DefaultOption = {
	ws: -1,
	port: -1,
}

class Bot {
	messageObject = {}

	constructor(option) {
		this.BOT = Object.assign(DefaultOption, option)
	}

	async init() {
		if(this.BOT.ws < 0) {
			console.log(`websocket port error`)
			return
		}
		await this.connectWebSocketSync().catch(e => {
			console.log(e)
		})
	}

	connectWebSocketSync() {
		return new Promise((resolve, reject) => {
			const { client } = require('websocket')
			const c = new client()
			c.on('connectFailed', error => {
				reject(`Connect Error: ${error.toString()}`)
			})
			c.on('connect', connection => {
				console.log('WebSocket Client Connected')
				resolve(`port ${ this.BOT.ws }: connect success`)
				connection.on('error', error => {
					console.log(`Connection Error: ${error.toString()}`)
				})
				connection.on('close', () => {
					console.log(`echo-protocol Connection Closed`)
				})
				connection.on('message', message => {
					if (message.type === 'utf8') {
						this.messageObject = JSON.parse(message.utf8Data)
						this.messageHandler()
					}
				})
			})
			c.connect(`ws://${ LOCALE_IP }:${ this.BOT.ws }/event`)
		})
	}

	messageHandler() {
		try {
			if(this.messageObject.user_id == this.messageObject.self_id) {
				return
			}
			this.replaceMsgStr()
			this.handleMsg_D()
		} catch(e) {
			console.log(e)
		}
	}

	replaceMsgStr(){
		var content = this.messageObject.message;
		if (content) {
			if (content.indexOf('&amp;') > -1) {
				content = content.replace(/&amp;/g, '&');
			}
			if (content.indexOf('&#44;') > -1) {
				content = content.replace(/&#44;/g, ',');
			}
			if (content.indexOf(`[CQ:at,qq=${this.messageObject.self_id}]`) > -1) {
				content = content.replace(new RegExp(`[CQ:at,qq=${this.messageObject.self_id}]`, 'g'), '百百');
			}
			content = simplized(content);
			this.messageObject.message = content;
		}
	}

	handleMsg_D(msgObj,botqq) {
		var type = msgObj.message_type;
		var groupid = msgObj.group_id;
		var content = msgObj.message;
		var self= msgObj.self_id;
		var callback
		var port;
		if(botqq==2){
			port = 24334;
		}else if(botqq==3){
			port = 25334;
		}else if(botqq==4){
			port = 26334;
		}else if(botqq==5){
			port = 27334;
		}else if(botqq==11){
			port = 29334;
		}else{
			var sf = (self+"").substring(0,5);
			if(sf=="38490"){
				port = 29334;
			}else{
				port = 23334;
			}
		}

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

				gidstr.startsWith("61614")||
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
				gidstr.startsWith("xxxxx")
			)&&port!=24334){
				return;
			}
		}else{
			content = content.substring(6).trim();
		}

		if(getMsgCount(port)>1500){
			return;
		}

		// switch(msgObj.notice_type) {
		// 	case 'group_increase':
		// 		if(new Set([
		// 			2375373419, 3291864216, 1840239061, 981069482, 914853856, 2771362647,
		// 			'2375373419', '3291864216', '1840239061', '981069482', '914853856', '2771362647',
		// 		]).has(msgObj.user_id)){
		// 			return
		// 		}
		// 		// 加群操作
		// 		let wellcome
		// 		switch(groupid){
		// 			case 96681597:
		// 				wellcome = `欢迎新人[CQ:at,qq=${msgObj.user_id}]，入服教程：https://bbs.gugu6.info/forum.php?mod=viewthread&tid=95#lastpost`
		// 				break
		// 			case 672926817:
		// 				wellcome = `看！新内鬼[CQ:at,qq=${msgObj.user_id}]`
		// 				break
		// 			default:
		// 				wellcome = `欢迎[CQ:at,qq=${msgObj.user_id}]加群`
		// 				break
		// 		}
		// 		addSendQueue(groupid,wellcome,botqq);
		// 		return
		// 	case 'group_decrease':
		// 		if(msgObj.sub_type == 'kick') {
		// 			addSendQueue(groupid,`${msgObj.user_id}被踹走了`,botqq);
		// 		} else {
		// 			addSendQueue(groupid,`${msgObj.user_id}溜走了`,botqq);
		// 		}
		// 		return
		// 	case 'group_upload':
		// 		if(new Set([672926817, 577587780, '672926817', '577587780']).has(msgObj.group_id)) {
		// 			addSendQueue(groupid, `[CQ:at,qq=${msgObj.user_id}] 倒了群垃圾！\n ${msgObj.file.name}(${formatSize(msgObj.file.size || 0)})` ,botqq);
		// 			return
		// 		}
		// 		break
		// }


		if (type == 'private') {
			var userid = msgObj.user_id;
			callback = function (res) {
				return;

				if (res.trim().length > 0) {
					setTimeout(function () {
						var options = {
							host: ''+LOCALE_IP+'',
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
					}, 1000);
				}
			}
			if (saveAlarm(content, userid, callback)) {

			} else {
				//TODO
				var from = userid;
				var groupid = 999999999;
				var groupName = 'private_group_name';
				var name = 'n';
				var nickname = 'n'
				handle_msg_D2(content,from,name,groupid,callback,groupName,nickname,'private',port)
			}
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
		saveChat(groupid, from, name, content,port);
		callback = function (res, blank) {
			if (res.trim().length > 0) {
				addSendQueue(groupid,res,botqq);
			}
		}
		handle_msg_D2(content,from,name,groupid,callback,groupName,nickname,'group',port)
	}
}

module.exports = {
	Bot
}