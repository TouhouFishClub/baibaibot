'use strict';

const fs = require('fs');
const Log = require('log');
const childProcess = require('child_process');

const URL = require('./url');
const Codec = require('../codec');
const Client = require('../httpclient');
const MessageAgent = require('./message-agent');
const {urlget} = require('../utils/httpreq');
const log = global.log || new Log(process.env.LOG_LEVEL || 'info');
const {getGroupMask} = require('./vreq');


const cookiePath = process.env.COOKIE_PATH || './qq-bot.cookie';
const qrcodePath = process.env.QRCODE_PATH || './static/code.png';

const AppConfig = {
    clientid: 53999199,
    appid: 501004106
};

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(() => resolve(), ms);
    });
}

function writeFileAsync(filePath, data, options) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, data, options, error => {
            if (error) reject(error);
            resolve();
        });
    });
}

class QQ {
    constructor(...msgHandlers) {
        this.tokens = {
            uin: '',
            ptwebqq: '',
            vfwebqq: '',
            psessionid: ''
        };
        this.selfInfo = {};
        this.buddy = {};
        this.discu = {};
        this.group = {};
        this.gn2gid = new Map();
        this.gn2qq = new Map();
        this.buddyNameMap = new Map();
        this.discuNameMap = new Map();
        this.groupNameMap = new Map();
        this.groupInfoMap = {};
        this.userInfoMap = new Map();
        this.client = new Client();
        this.messageAgent = null;
        this.online = true;
        this.msgHandlers = msgHandlers;
    }



    getOnline(){
        return this.online;
    }

    destroy(){
        console.log('will destroy');
        this.online=false;
    }

    async run() {
        await this.login();
        await this.initInfo();
        //await this.getGroupList();
        //await this.getGroupMembers();
        await this.loopPoll();
    }

    async login() {
        beforeGotVfwebqq: {
            if (fs.existsSync(cookiePath)) {
                try {
                    const cookieText = fs.readFileSync(cookiePath, 'utf-8').toString();
                    log.info('(-/5) 检测到 cookie 文件，尝试自动登录');
                    this.tokens.ptwebqq = cookieText.match(/ptwebqq=(.+?);/)[1];
                    this.client.setCookie(cookieText);
                    // skip this label if found cookie, goto Step4
                    break beforeGotVfwebqq;
                } catch (err) {
                    this.tokens.ptwebqq = '';
                    try{
                      childProcess.exec(`rm ${cookiePath}`);
                    }catch(e2){

                    }

                    log.info('(-/5) Cookie 文件非法，自动登录失败');
                }
            }
            log.info('(0/5) 开始登录，准备下载二维码');

            // Step0: prepare cookies, pgv_info and pgv_pvid
            // http://pingjs.qq.com/tcss.ping.js  tcss.run & _cookie.init
            const initCookies = {
                pgv_info: `ssid=s${Codec.randPgv()}`,
                pgv_pvid: Codec.randPgv()
            };
            this.client.setCookie(initCookies);
            await this.client.get(URL.loginPrepare);

            // Step1: download QRcode
            const qrCode = await this.client.get({ url: URL.qrcode, responseType: 'arraybuffer' });
            await writeFileAsync(qrcodePath, qrCode, 'binary');
            log.info(`(1/5) 二维码下载到 ${qrcodePath} ，等待扫描`);
            // open file, only for linux
            childProcess.exec(`xdg-open ${qrcodePath}`);

            // Step2:
            let scanSuccess = false;
            const quotRegxp = /'[^,]*'/g;
            const ptqrloginURL = URL.getPtqrloginURL(this.client.getCookie('qrsig'));
            let ptlogin4URL;
            do {
                const responseBody = await this.client.get({
                    url: ptqrloginURL,
                    headers: { Referer: URL.ptqrloginReferer },
                });
                log.debug(responseBody);
                const arr = responseBody.match(quotRegxp).map(i => i.substring(1, i.length - 1));
                if (arr[0] === '0') {
                    scanSuccess = true;
                    ptlogin4URL = arr[2];
                } else await sleep(2000);
            } while (!scanSuccess);
            log.info('(2/5) 二维码扫描完成');
            // remove file, for linux(or macOS ?)
            // childProcess.exec(`rm ${qrcodePath}`);

            // Step3: find token 'vfwebqq' in cookie
            // NOTICE: the request returns 302 when success. DO NOT REJECT 302.
            await this.client.get({
                url: ptlogin4URL,
                maxRedirects: 0,     // Axios follows redirect automatically, but we need to disable it here.
                validateStatus: status => status === 302,
                headers: { Referer: URL.ptlogin4Referer }
            });
            this.tokens.ptwebqq = this.client.getCookie('ptwebqq');
            log.info('(3/5) 获取 ptwebqq 成功');
        } // ========== label 'beforeGotVfwebqq' ends here ==========

        // Step4: request token 'vfwebqq'
        const vfwebqqResp = await this.client.get({
            url: URL.getVfwebqqURL(this.tokens.ptwebqq),
            headers: { Referer: URL.vfwebqqReferer }
        });
        log.debug(vfwebqqResp);
        try {
            this.tokens.vfwebqq = vfwebqqResp.result.vfwebqq;
            log.info('(4/5) 获取 vfwebqq 成功');
        } catch (err) {
            console.log(err);
            try{
              childProcess.execSync(`rm ${cookiePath}`);
            }catch(e3){

            }

            log.info('(-/5) Cookie 已失效，切换到扫码登录');
            return this.login();
        }
        // Step5: psessionid and uin
        const loginStat = await this.client.post({
            url: URL.login2,
            data: {
                ptwebqq: this.tokens.ptwebqq,
                clientid: AppConfig.clientid,
                psessionid: "",
                status: "online",
            },
            headers: {
                Origin: URL.login2Origin,
                Referer: URL.login2Referer
            }
        });
        log.debug(loginStat);
        this.tokens.uin = loginStat.result.uin;
        this.tokens.psessionid = loginStat.result.psessionid;
        this.messageAgent = new MessageAgent({
            psessionid: this.tokens.psessionid
        });
        log.info('(5/5) 获取 psessionid 和 uin 成功');
        const cookie = await this.client.getCookieString();
        console.log('开始保存cookie');
        fs.writeFile(cookiePath, cookie, 'utf-8', () => log.info(`保存 Cookie 到 ${cookiePath}`));
        console.log('保存cookie完成')
    }

    getSelfInfo() {
        log.info('开始获取用户信息');
        return this.client.get({
            url: URL.selfInfo,
            headers: { Referer: URL.referer130916 }
        });
    }

    getBuddy() {
        log.info('开始获取好友列表');
        return this.client.post({
            url: URL.getBuddy,
            headers: {
                Referer: URL.referer130916
            },
            data: {
                vfwebqq: this.tokens.vfwebqq,
                hash: Codec.hashU(this.tokens.uin, this.tokens.ptwebqq)
            }
        });
    }

    getOnlineBuddies() {
        log.info('开始获取好友在线状态');
        return this.client.get({
            url: URL.onlineBuddies(this.tokens.vfwebqq, this.tokens.psessionid),
            headers: {
                Referer: URL.referer151105
            }
        });
    }

    getGroup() {
        log.info('开始获取群列表');
/*
        var hash = Codec.hashU(this.tokens.uin, this.tokens.ptwebqq);
        console.log(hash)
        return getGroupMask(this.client.getCookieString(),this.tokens.vfwebqq,hash);
*/
        return this.client.post({
            url: URL.getGroup,
            headers: {
                Referer: URL.referer130916
            },
            data: {
                vfwebqq: this.tokens.vfwebqq,
                hash: Codec.hashU(this.tokens.uin, this.tokens.ptwebqq)
            }
        });

    }

    getDiscu() {
        log.info('开始获取讨论组列表');
        return this.client.post({
            url: URL.getDiscu(this.tokens.vfwebqq, this.tokens.psessionid),
            headers: {
                Referer: URL.referer130916
            },
            data: {
                vfwebqq: this.tokens.vfwebqq,
                hash: Codec.hashU(this.tokens.uin, this.tokens.ptwebqq)
            }
        });
    }

    async initInfo() {
        console.log('开始信息初始化');
        let manyInfo = await Promise.all([
            this.getSelfInfo(),
            this.getBuddy(),
            this.getDiscu(),
            this.getGroup()
        ]);
        log.debug(JSON.stringify(manyInfo, null, 4));
        this.selfInfo = manyInfo[0].result;
        this.buddy = manyInfo[1].result;
        this.discu = manyInfo[2].result.dnamelist;
        this.group = manyInfo[3].result.gnamelist;
        let promises = this.group.map(async e => {
            console.log('get group info:');
            console.log(e);
            const rawInfo = await this.getGroupInfo(e.code);
            return e.info = rawInfo.result;
        });
        promises = promises.concat(this.discu.map(async e => {
            const rawInfo = await this.getDiscuInfo(e.did);
            return e.info = rawInfo.result;
        }));
        manyInfo = await Promise.all(promises);
        log.debug(JSON.stringify(manyInfo, null, 4));
        log.info('信息初始化完成');
    }

    getBuddyName(uin) {
        let name = this.buddyNameMap.get(uin);
        if (name) return name;
        this.buddy.marknames.some(e => e.uin == uin ? name = e.markname : false);
        if (!name) this.buddy.info.some(e => e.uin == uin ? name = e.nick : false);
        this.buddyNameMap.set(uin, name);
        return name;
    }

    getDiscuName(did) {
        let name = this.discuNameMap.get(did);
        if (name) return name;
        this.discu.some(e => e.did == did ? name = e.name : false);
        this.discuNameMap.set(did, name);
        return name;
    }

    getDiscuInfo(did) {
        return this.client.get({
            url: URL.discuInfo(did, this.tokens.psessionid, this.tokens.vfwebqq),
            headers: { Referer: URL.referer151105 }
        });
    }

    getNameInDiscu(uin, did) {
        const nameKey = `${did}${uin}`;
        let name = this.discuNameMap.get(nameKey);
        if (name) return name;
        let discu;
        for (let d of this.discu) {
            if (d.did == did) {
                discu = d;
                break;
            }
        }
        discu.info.mem_info.some(i => i.uin == uin ? name = i.nick : false);
        this.discuNameMap.set(nameKey, name);
        return name;
    }

    getGroupName(groupCode) {
        let name = this.groupNameMap.get(groupCode);
        if (name) return name;
        this.group.some(e => e.gid == groupCode ? name = e.name : false);
        this.groupNameMap.set(groupCode, name);
        return name;
    }

    getGroupInfo(code) {
        return this.client.get({
            url: URL.groupInfo(code, this.tokens.vfwebqq),
            headers: { Referer: URL.referer130916 }
        });
    }

    getUserInfoInGroup(uin,groupCode){
        const infoKey = `${groupCode}${uin}`;
        let info = this.userInfoMap.get(infoKey);
        if(info){
            return info;
        }else{
          let group;
          for (let g of this.group) {
            if (g.gid == groupCode) {
              group = g;
              break;
            }
          }
          const members = group.info.minfo;
          if(members){
            for(let i=0;i<members.length;i++){
              if(uin==members[i].uin){
                this.userInfoMap.set(infoKey, members[i]);
                return members[i];
              }
            }
          }
          return {};
        }
    }

    getMemberListInGroup(groupCode){
        if(this.groupInfoMap[groupCode]){
            return this.groupInfoMap[groupCode];
        }else{
          let group;
          for (let g of this.group) {
            if (g.gid == groupCode) {
              group = g;
              break;
            }
          }
          if(group){
            const members = group.info.minfo;
            const cards = group.info.cards;
            var map = {};
            if(members){
              for(let i=0;i<members.length;i++){
                var uin = members[i].uin;
                map[uin]=members[i];
              }
            }
            if(cards){
              for(let i=0;i<cards.length;i++){
                var uin = cards[i].muin;
                var card = cards[i].card;
                map[uin].card=card;
              }
            }
            var ret = []
            for(var p in map){
              ret.push(map[p]);
            }
            this.groupInfoMap[groupCode]=ret;
            return ret;
          }else{
            return [];
          }
        }
    }

    getNameInGroup(uin, groupCode) {
        const nameKey = `${groupCode}${uin}`;
        let name = this.groupNameMap.get(nameKey);
        if (name) return name;
        let group;
        for (let g of this.group) {
            if (g.gid == groupCode) {
                group = g;
                break;
            }
        }
        const members = group.info.minfo;
        const cards = group.info.cards;
        if(cards){
            for(let i=0;i<cards.length;i++){
                if(uin==cards[i].muin){
                  this.groupNameMap.set(nameKey, cards[i].card);
                  return cards[i].cards;
                }
            }
        }
        if(members){
            for(let i=0;i<members.length;i++){
                if(uin==members[i].uin){
                  this.groupNameMap.set(nameKey, members[i].nick);
                  return members[i].nick;
                }
            }
        }
        /*
        if(!group.info.cards){
            group.info.cards=[];
        }
        group.info.cards.some(i => i.muin == uin ? name = i.card : false);
        if (!name) group.info.minfo.some(i => i.uin == uin ? name = i.nick : false);
        this.groupNameMap.set(nameKey, name);
        */
        return name;
    }

    logMessage(msg) {
        const content = msg.result[0].value.content.filter(e => typeof e == 'string').join(' ');
        const { from_uin, send_uin } = msg.result[0].value;
        switch (msg.result[0].poll_type) {
            case 'message':
                log.info(`[新消息] ${this.getBuddyName(from_uin)} | ${content}`);
                break;
            case 'group_message':
                log.info(`[群消息] ${this.getGroupName(from_uin)} : ${this.getNameInGroup(send_uin, from_uin)} | ${content}`);
                break;
            case 'discu_message':
                log.info(`[讨论组] ${this.getDiscuName(from_uin)} : ${this.getNameInDiscu(send_uin, from_uin)} | ${content}`);
        }
    }

    handelMsgRecv(msg) {
        const content = msg.result[0].value.content.filter(e => typeof e == 'string').join(' ');
        const { from_uin, send_uin } = msg.result[0].value;
        let msgParsed = { content };
        switch (msg.result[0].poll_type) {
            case 'message':
                msgParsed.type = 'buddy';
                msgParsed.id = from_uin;
                msgParsed.name = this.getBuddyName(from_uin);
                break;
            case 'group_message':
                msgParsed.type = 'group';
                msgParsed.id = send_uin;
                msgParsed.name = this.getNameInGroup(send_uin, from_uin);
                msgParsed.groupId = from_uin;
                msgParsed.groupName = this.getGroupName(from_uin);
                msgParsed.user = this.getUserInfoInGroup(send_uin, from_uin);
                break;
            case 'discu_message':
                msgParsed.type = 'discu';
                msgParsed.id = send_uin;
                msgParsed.name = this.getNameInDiscu(send_uin, from_uin);
                msgParsed.discuId = from_uin;
                msgParsed.discuName = this.getDiscuName(from_uin);
        }
        this.msgHandlers.forEach(handler => handler.tryHandle(msgParsed, this));
    }

    async loopPoll() {

        log.info('开始接收消息...');
        let failCnt = 0;
        do {
            if(!this.online){
                break;
            }
            let msgContent;
            try {
                msgContent = await this.client.post({
                    url: URL.poll,
                    data: {
                        ptwebqq: this.tokens.ptwebqq,
                        clientid: AppConfig.clientid,
                        psessionid: this.tokens.psessionid,
                        key: ''
                    },
                    headers: {
                        Origin: URL.msgOrigin,
                        Referer: URL.referer151105
                    },
                    responseType: 'text',
                    validateStatus: status => status === 200 || status === 504
                });
                if (failCnt > 0) failCnt = 0;
            } catch (err) {
                log.debug('Request Failed: ', err);
                if (err.response.status === 502)
                    log.info(`出现 502 错误 ${++failCnt} 次，正在重试`);
                if (failCnt > 10)
                    return log.error(`服务器 502 错误超过 ${failCnt} 次，连接已断开`);
            } finally {
                log.debug(msgContent);
                if (msgContent) {
                    if (msgContent.retcode && msgContent.retcode === 103) {
                        await this.getOnlineBuddies();
                    } else if (msgContent.result) {
                        try {
                            this.logMessage(msgContent);
                            this.handelMsgRecv(msgContent);
                        } catch (err) {
                            log.error('Error when handling msg: ', msgContent, err);
                        }
                    }
                }
            }
        } while (true);
    }

    async innerSendMsg(url, key, id, content) {
        const resp = await this.client.post({
            url,
            data: this.messageAgent.build(key, id, content),
            headers: { Referer: URL.referer151105 }
        });
        log.debug(resp);
        /* it returns 
         * { errmsg: 'error!!!', retcode: 100100 }
         * when success, i don't know why.
         * fxxk tencent
         */
        return resp;
    }

    async sendBuddyMsg(uin, content) {
        const resp = await this.innerSendMsg(URL.buddyMsg, 'buddy', uin, content);
        log.info(`发消息给好友 ${this.getBuddyName(uin)} : ${content}`);
        return resp;
    }

    async sendDiscuMsg(did, content) {
        const resp = await this.innerSendMsg(URL.discuMsg, 'discu', did, content);
        log.info(`发消息给讨论组 ${this.getDiscuName(did)} : ${content}`);
        return resp;
    }

    async sendGroupMsg(gid, content) {
        const resp = await this.innerSendMsg(URL.groupMsg, 'group', gid, content);
        log.info(`发消息给群 ${this.getGroupName(gid)} : ${content}`);
        return resp;
    }

    shutupGroupMember(groupCode,uin,seconds){
        let group;
        let groupName;
        for (let g of this.group) {
          if (g.gid == groupCode) {
            group = g;
            groupName = g.name;
            break;
          }
        }
        if(group){
          const members = group.info.minfo;
          var userName;
          if(members){
            for(let i=0;i<members.length;i++){
              if(uin==members[i].uin) {
                  userName = members[i].nick;
                  break;
              }
            }
          }
          if(groupName.indexOf('咸鱼')>0){
            var userqq = this.gn2qq[userName];
            var groupqq = 205700800;
            if(userqq&&groupqq){
              var url = "http://qinfo.clt.qq.com/cgi-bin/qun_info/set_group_shutup"
              var shutup = encodeURIComponent('[{"uin":'+userqq+',"t":'+seconds+'}]');
              var data = "gc="+groupqq+"&bkn=1657909858&shutup_list="+shutup;
              console.log(shutup,data);
              this.client.extraPost(url,data);
              log.info('禁言：'+data);
            }
          }
        }
    }

      getGroups(){
        return this.group;
      }

    async getGroupList(){
        try{
          var url = "http://qun.qq.com/cgi-bin/qun_mgr/get_group_list";
          var data = "bkn=1657909858";
          const resp = await this.client.extraPost(url,data);
          log.info('群列表：'+data);
          console.log(resp);
          var manageList = resp.manage;
          var joinList = resp.join;
          for(var i=0;i<joinList.length;i++){
            var gn = joinList[i].gn;
            this.gn2gid[gn]=joinList[i];
          }
          for(var i=0;i<manageList.length;i++){
            var gn = manageList[i].gn;
            this.gn2gid[gn]=manageList[i];
          }
        }catch(e){
           console.log(e);
        }

    }

    async getGroupMembers(){
        var str = fs.readFileSync("src/groupMembers/205700800","utf-8");
        var stra = str.split("\n");
          var c = 1;
          for(var i=0;i<stra.length;i++){
            var e = stra[i].trim();
            if(e==c){
              c++;
              var l1 = stra[i+2];
              var l2 = stra[i+3];
              i=i+2;
              var la1 = l1.split("\t");
              var la2 = l2.split("\t");
              var qqcode;
              var username;
              if(la1.length>2){
                qqcode = la1[0];
                username = stra[i-1].trim();
              }else{
                qqcode = la2[0];
                username = stra[i].trim();
              }
              this.gn2qq[username]=qqcode;
              console.log(qqcode,username);
            }
          }
    }

}

module.exports = QQ;
