var https=require('https');
var http = require('http');
var fs = require('fs');
const phantom = require('phantom');
const {baiduocr} = require('../image/baiduocr');

var tmpstr = fs.readFileSync('ff14/strategy_template.html','utf-8');
var ta = tmpstr.split('~');

function fetchStrategy(){
  var str0 = fs.readFileSync('1.html','utf-8');
  var str = str0;
  var n1 = str.indexOf('<span class="purple">');
  var n31 = str.indexOf('<img src="about:blank"');
  var n41 = str.indexOf('<span class="darkred">');
  var arr = [];
  if(n41>0&&n41<n1){
    n1=n41;
  }
  if(n31>0&&n31<n1){
    n1=n31;
  }
  var id = 0;
  while(n1>0){
    id++;

    var s1 = str.substring(n1+1);
    var n2 = s1.indexOf('<span class="purple">');
    var n3 = s1.indexOf('<img src="about:blank"');
    var n4 = s1.indexOf('<span class="darkred">');
    console.log('n1:'+n1+',n2:'+n2+',n3:'+n3+',n4:'+n4);
    if(n2<0){
      n2=n4;
    }
    if(n4>0&&n4<n2){
      n2=n4;
    }
    if(n3>0&&n3<n2){
      n2=n3;
    }
    var ih = '<'+s1.substring(0,n2);

    ih = ih.replace(/onload="ubbcode.adjImgSize\(this\);"/g,'').replace(/onerror="ubbcode.imgError\(this\)"/g,'')
    ih = ih.replace(/https:\/\/img.nga.178.com\//g,/ngaImgPipe/)
    ih = ih.replace(/alt=""/g,'');

    var tstr = '<span style="font-size:180%;line-height:183%">';
    var x1 = ih.indexOf(tstr);
    var xs1 = ih.substring(x1+tstr.length);
    var x2 = xs1.indexOf('<');
    var title = xs1.substring(0,x2);
    var xs2 = xs1.substring(x2+1);
    var qstr = '</span><span style="font-weight:bold">';
    var x3 = xs2.indexOf(qstr);
    var xs3 = xs2.substring(x3+qstr.length);
    var x4 = xs3.indexOf('<');
    var qname = xs3.substring(0,x4);
    var obj = {id:id,title:title,quest:qname};
    if(x1>0&&x2>0&&x3>0&&x4>0){
      arr.push(obj);
      var fhtml = ta[0]+'<div style="float:left">'+ih+'</div>'+ta[1];
      var path = 'ff14/strategy/'+id+'.html'
      fs.writeFileSync('public/'+path,fhtml);
      getPic(path,id,function(){

      })
    }


    str = s1.substring(n2-10);
    n1 = str.indexOf('<span class="purple">');
    var n31 = str.indexOf('<img src="about:blank"');
    var n41 = str.indexOf('<span class="darkred"');
    if(n1<0){
      n1=n41;
    }
    if(n41>=0&&n41<n1){
      n1=n41;
    }
    if(n31>0&&n31<n1){
      n1=n31;
    }
  }
  console.log(arr);
}




let getPic = async ( path,itemid ,callback) => {
  //url路径
  let url        = 'http://localhost:10086/'+path;
  console.log(url);
  //创建一个实例
  const instance = await phantom.create();
  //创建一个页面
  const page     = await instance.createPage();
  //设置页面参数
  await page.property( 'viewportSize' , { width : 1800 , height : 1600 } );

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
    await lateTime( 1000 );
    //输出页面到当前目录下
    var now = new Date();
    var filename = "ff14/img/"+itemid+".png";
    //filename="1.png";
    console.log(filename);
    await page.render(filename);
    //销毁实例
    await instance.exit();
    callback('[CQ:image,file=send/ff14/'+itemid+'.png]');
  }
};

let lateTime = ( time ) =>{
  return new Promise( function(resolve,reject){
    setTimeout(function(){
      resolve();
    }, time );
  } );
}


const questArr = [{ id: 1, title: '天然要害沙斯塔夏溶洞 LV.15', quest: '挑战沙斯塔夏之人' },
  { id: 2, title: '地下灵殿塔姆·塔拉墓园 LV.16', quest: '在塔姆塔拉的深处' },
  { id: 3, title: '封锁坑道铜铃铜山 LV.17', quest: '消失在铜铃中的梦' },
  { id: 4, title: '魔兽领域日影地修炼所 LV.20', quest: '日影地修炼所的邀请' },
  { id: 5, title: '监狱废墟托托·拉克千狱 LV.24', quest: '千狱深处的响声' },
  { id: 6, title: '名门府邸静语庄园 LV.28', quest: '达尔坦库尔家的悲剧题' },
  { id: 7, title: '休养胜地布雷福洛克斯野营地 LV.32', quest: '布雷福洛克斯的奶酪' },
  { id: 8, title: '古代遗迹喀恩埋没圣堂 LV.35', quest: '埋在圣堂中的疑惑' },
  { id: 9, title: '流沙迷宫樵鸣洞 LV.38', quest: '献给亲爱的战友' },
  { id: 10, title: '对龙城塞石卫塔 LV.41', quest: '石卫塔霸主' },
  { id: 11, title: '山中战线泽梅尔要塞 LV.44', quest: '调查泽梅尔要塞' },
  { id: 12, title: '毒雾洞窟黄金谷 LV.47', quest: '黄金之谷' },
  { id: 13, title: '帝国南方堡外围激战 LV.50', quest: '南方堡死战' },
  { id: 14, title: '天幕魔导城最终决战 LV.50', quest: '超越幻想，究极神兵' },
  { id: 18, title: '神灵圣域放浪神古神殿 LV.50', quest: '古神殿的阴影' },
  { id: 19, title: '邪教驻地无限城古堡 LV.50', quest: '古堡恶灵' },
  { id: 20, title: '领航明灯天狼星灯塔 LV.50', quest: '魅惑航路的歌声' },
  { id: 21, title: '骚乱坑道铜铃铜山 LV.50', quest: '逝于铜铃铜山' },
  { id: 22, title: '恶灵府邸静语庄园 LV.50', quest: '食人庄园' },
  { id: 23, title: '腐坏遗迹无限城市街古迹 LV.50', quest: '腐朽魔都' },
  { id: 24, title: '剑斗领域日影地修炼所 LV.50', quest: '挑战日影地修炼所' },
  { id: 25, title: '纷争要地布雷福洛克斯野营地 LV.50', quest: '再次陷入困境的盟友' },
  { id: 26, title: '财宝传说破舰岛 LV.50', quest: '雾过天晴破舰岛' },
  { id: 27, title: '惨剧灵殿塔姆·塔拉墓园 LV.50', quest: '灵殿昏暗的深处' },
  { id: 28, title: '激战城塞石卫塔 LV.50', quest: '夙愿得偿' },
  { id: 29, title: '凛冽洞天披雪大冰壁 LV.50', quest: '别有洞天' },
  { id: 30, title: '逆转要害沙斯塔夏溶洞 LV.50', quest: '祸起沙斯塔夏' },
  { id: 31, title: '苏醒遗迹喀恩埋没圣堂 LV.50', quest: '圣堂中的陷阱' },
  { id: 32, title: '幻龙残骸密约之塔 LV.50', quest: '前往密约之塔' },
  { id: 33, title: '武装圣域放浪神古神殿 LV.50', quest: '血染古神殿' },
  { id: 34, title: '邪念妖地无限城古堡 LV.50', quest: '古堡凶影' },
  { id: 36, title: '冰雪废堡暮卫塔 LV.51', quest: '冰雪废堡暮卫塔' },
  { id: 37, title: '天山绝顶索姆阿尔灵峰 LV.53', quest: '翻越灵峰' },
  { id: 38, title: '邪龙王座龙巢神殿 LV.55', quest: '狩猎邪龙' },
  { id: 39, title: '圣教中枢伊修加德教皇厅 LV.57', quest: '为了盟友' },
  { id: 40, title: '学识宝库迦巴勒幻想图书馆 LV.59', quest: '沉睡在禁书库的论文' },
  { id: 41, title: '血战苍穹魔科学研究所 LV.60', quest: '苍穹之禁城' },
  { id: 42, title: '空中神域不获岛 LV.60', quest: '空中神域不获岛' },
  { id: 43, title: '博物战舰无限回廊 LV.60', quest: '博物战舰无限回廊' },
  { id: 44, title: '草木庭园圣茉夏娜植物园 LV.60', quest: '草木庭园圣茉夏娜植物园' },
  { id: 45, title: '地脉灵灯天狼星灯塔 LV.60', quest: '地脉灵灯天狼星灯塔' },
  { id: 46, title: '星海空间颠倒塔 LV.60', quest: '星海的呼唤' },
  { id: 47, title: '神圣遗迹无限城市街古迹 LV.60', quest: '神圣遗迹无限城市街古迹' },
  { id: 48, title: '天龙宫殿忆罪宫 LV.60', quest: '圣龙的试炼' },
  { id: 49, title: '黑涡传说破舰岛 LV.60', quest: '惊涛骇浪破舰岛' },
  { id: 50, title: '险峻峡谷塞尔法特尔溪谷 LV.60', quest: '险峻溪谷' },
  { id: 51, title: '秘本宝库迦巴勒幻想图书馆 LV.60', quest: '秘本宝库迦巴勒幻想图书馆' },
  { id: 52, title: '坚牢铁壁巴埃萨长城 LV.60', quest: '终结来临' },
  { id: 53, title: '天山深境索姆阿尔灵峰 LV.60', quest: '天山深境索姆阿尔灵峰' },
  { id: 55, title: '漂流海域妖歌海 LV.61', quest: '乘风破浪' },
  { id: 56, title: '海底宫殿紫水宫 LV.63', quest: '紫水宫的异变' },
  { id: 57, title: '试炼行路巴儿达木霸道 LV.65', quest: '巴儿达木霸道的试炼' },
  { id: 58, title: '解放决战多玛王城 LV.67', quest: '决战多玛王城' },
  { id: 59, title: '巨炮要塞帝国白山堡 LV.69', quest: '潜入帝国白山堡' },
  { id: 60, title: '鏖战红莲阿拉米格 LV.70', quest: '红莲之狂潮' },
  { id: 61, title: '恶党孤城黄金阁 LV.70', quest: '恶党孤城黄金阁' },
  { id: 62, title: '修行古刹星导寺 LV.70', quest: '星导寺修行' },
  { id: 63, title: '沉没神殿斯卡拉遗迹 LV.70', quest: '废王的黄金' },
  { id: 64, title: '红玉火山狱之盖 LV.70', quest: '四圣兽传说' },
  { id: 101, title: '那布里亚勒斯讨伐战', quest: '迎战尊严王' },
  { id: 102, title: '皇都伊修加德保卫战', quest: '伊修加德保卫战' },
  { id: 103, title: '死化奇美拉讨伐战', quest: '复苏的上古武器' },
  { id: 104, title: '海德拉讨伐战', quest: '复苏的上古武器' },
  { id: 105, title: '大桥上的决斗', quest: '天下无双的挑战者' },
  { id: 106, title: '艾玛吉娜杯斗技大会决赛', quest: '斗技场的预告信' },
  { id: 107, title: '无限城的死斗', quest: '随风而逝的结局' },
  { id: 108, title: '伊弗利特歼灭战', quest: '火神伊弗利特重现世间' },
  { id: 109, title: '迦楼罗歼灭战', quest: '风神迦楼罗重现世间' },
  { id: 110, title: '泰坦歼灭战', quest: '土神泰坦重现世间' },
  { id: 111, title: '莫古力贤王歼灭战', quest: '大逆不道' },
  { id: 112, title: '利维亚桑歼灭战', quest: '决战利姆萨·罗敏萨' },
  { id: 113, title: '拉姆歼灭战', quest: '制裁之雷' },
  { id: 114, title: '希瓦歼灭战', quest: '冷若霜雪的冰神希瓦' },
  { id: 115, title: '奥丁歼灭战', quest: '绝命斗神' },
  { id: 116, title: '究极神兵破坏作战', quest: '英雄叙事诗：幻想之章' },
  { id: 117, title: '迦楼罗歼殛战', quest: '登峰造极的风神迦楼罗' },
  { id: 118, title: '泰坦歼殛战', quest: '登峰造极的土神泰坦' },
  { id: 119, title: '伊弗利特歼殛战', quest: '登峰造极的火神伊弗利特' },
  { id: 120, title: '莫古力贤王歼殛战', quest: '登峰造极的贤王莫古尔·莫古十二世' },
  { id: 121, title: '利维亚桑歼殛战', quest: '登峰造极的水神利维亚桑' },
  { id: 122, title: '拉姆歼殛战', quest: '登峰造极的雷神拉姆' },
  { id: 123, title: '希瓦歼殛战', quest: '登峰造极的冰神希瓦' },
  { id: 125, title: '罗波那歼灭战', quest: '武神降临' },
  { id: 126, title: '俾斯麦歼灭战', quest: '魔大陆的钥匙' },
  { id: 127, title: '圆桌骑士歼灭战', quest: '苍穹之禁城' },
  { id: 128, title: '尼德霍格征龙战', quest: '诗的终章' },
  { id: 129, title: '萨菲洛特歼灭战', quest: '生命之树' },
  { id: 130, title: '索菲娅歼灭战', quest: '黄金色的灾厄' },
  { id: 131, title: '祖尔宛歼灭战', quest: '新的同伴' },
  { id: 132, title: '罗波那歼殛战', quest: '登峰造极的武神罗波那' },
  { id: 133, title: '俾斯麦歼殛战', quest: '登峰造极的云神俾斯麦' },
  { id: 134, title: '圆桌骑士幻想歼灭战', quest: '英雄叙事诗：苍穹之章' },
  { id: 135, title: '尼德霍格传奇征龙战', quest: '英雄叙事诗：云廊之章' },
  { id: 136, title: '萨菲洛特歼殛战', quest: '登峰造极的魔神萨菲洛特' },
  { id: 137, title: '索菲娅歼殛战', quest: '登峰造极的女神索菲娅' },
  { id: 138, title: '祖尔宛歼殛战', quest: '登峰造极的鬼神祖尔宛' },
  { id: 140, title: '须佐之男歼灭战', quest: '豪神须佐之男' },
  { id: 141, title: '吉祥天女歼灭战', quest: '美神吉祥天女' },
  { id: 142, title: '神龙歼灭战', quest: '红莲之狂潮' },
  { id: 143, title: '白虎镇魂战', quest: '四圣兽传说' },
  { id: 144, title: '须佐之男歼殛战', quest: '诗在东方' },
  { id: 145, title: '吉祥天女歼殛战', quest: '诗在东方' },
  { id: 146, title: '神龙梦幻歼灭战', quest: '诗在东方' },
  { id: 147, title: '白虎诗魂战', quest: '诗在东方' },
  { id: 149, title: '水晶塔 古代人迷宫', quest: '古代人迷宫' },
  { id: 150, title: '水晶塔 希尔科斯塔', quest: '希尔科斯塔' },
  { id: 151, title: '水晶塔 暗之世界', quest: '暗之世界' },
  { id: 152, title: '魔航船虚无方舟', quest: '魔航船虚无方舟' },
  { id: 153, title: '禁忌城邦玛哈', quest: '禁忌城邦玛哈' },
  { id: 154, title: '影之国', quest: '影之国' } ]


function searchQuest(content,UserName,callback){
  content=content.trim();
  if(content==""){
    var ret = "FF14副本攻略查询【来自NGA】\n输入格式【ffiq+副本名/任务名/ID】\n支持模糊查询\n支持截图查询";
    callback(ret);
    return;
  }
  var n = content.indexOf('[CQ:image');
  if(n>=0){
    var s1 = content.substring(n+1);
    var n1 = s1.indexOf('https://');
    var s2 = s1.substring(n1+8);
    var n2 = s2.indexOf('?');
    var url = 'http://'+s2.substring(0,n2);
    var cb = function(ret){
      var rn = ret.split('\n');
      if(rn.length==1){
        var wd = rn[0];
        searchQuest_d(wd.trim(),UserName,callback);
      }else{
        var wd = rn[0];
        searchQuest_d(wd.trim(),UserName,callback);
      }
    }
    baiduocr(url,cb);
  }else{
    searchQuest_d(content,UserName,callback)
  }
}


function searchQuest_d(content,userName,callback){
  if(parseInt(content)<300){
    for(var i=0;i<questArr.length;i++){
      if(questArr[i].id==parseInt(content)){
        callback(questArr[i].title+'\n'+'[CQ:image,file=send/ff14/quest/'+questArr[i].id+'.png]');
        break;
      }
    }
  }else{
    var may = [];
    var c=false;
    for(var i=0;i<questArr.length;i++){
      var qd = questArr[i];
      var title = qd.title;
      var n0 = title.indexOf('LV.');
      if(n0>0){
        title = title.substring(0,n0).trim();
      }
      var quest = qd.quest;
      var n1 = title.indexOf(content);
      var n2 = quest.indexOf(content);
      if(title==content||quest==content){
        callback(questArr[i].title+'\n'+'[CQ:image,file=send/ff14/quest/'+questArr[i].id+'.png]');
        c=true;
        break;
      }else{
        if(n1>=0||n2>=0){
          may.push(qd);
        }
      }
    }
    if(c){
      return;
    }else{
      if(may.length==1){
        callback(may[0].title+'\n'+'[CQ:image,file=send/ff14/quest/'+may[0].id+'.png]');
      }else if(may.length==0){
        callback('没有找到【'+content+'】')
      }else{
        var ret = '';
        for(var i=0;i<may.length;i++){
          if(i>15){
            break;
          }
          ret = ret + 'ffiq'+may[i].id+':'+may[i].title+'\n';
        }
        ret = ret.trim();
        callback(ret);
      }
    }

  }
}






module.exports={
  fetchStrategy,
  searchQuest
}