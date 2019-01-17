var fs = require('fs');
const phantom = require('phantom');


var job_cn = {
  "Samurai":"武士",
  "RedMage":"赤魔法师",
  "WhiteMage":"白魔法师",
  "Warrior":"战士",
  "Summoner":"召唤师",
  "Scholar":"学者",
  "Paladin":"骑士",
  "Ninja":"忍者",
  "Monk":"武僧",
  "Machinist":"机工士",
  "Dragoon":"龙骑士",
  "DarkKnight":"暗黑骑士",
  "BlackMage":"黑魔法师",
  "Bard":"吟游诗人",
  "Astrologian":"占星术士"
}

var jobs = [
  {
    id:1,
    cn:"占星术士",
    en:"Astrologian"
  },
  {
    id:2,
    cn:"吟游诗人",
    en:"Bard"
  },
  {
    id:3,
    cn:"黑魔法师",
    en:"BlackMage"
  },
  {
    id:4,
    cn:"暗黑骑士",
    en:"DarkKnight"
  },
  {
    id:5,
    cn:"龙骑士",
    en:"Dragoon"
  },
  {
    id:6,
    cn:"机工士",
    en:"Machinist"
  },
  {
    id:7,
    cn:"武僧",
    en:"Monk"
  },
  {
    id:8,
    cn:"忍者",
    en:"Ninja"
  },
  {
    id:9,
    cn:"骑士",
    en:"Paladin"
  },
  {
    id:10,
    cn:"学者",
    en:"Scholar"
  },
  {
    id:11,
    cn:"召唤师",
    en:"Summoner"
  },
  {
    id:12,
    cn:"战士",
    en:"Warrior"
  },
  {
    id:13,
    cn:"白魔法师",
    en:"WhiteMage"
  },
  {
    id:14,
    cn:"赤魔法师",
    en:"RedMage"
  },
  {
    id:15,
    cn:"武士",
    en:"Samurai"
  },
]


var bosses = [
  {
    "id": 1036,
    "name": "Susano",
    "cn": "豪神"
  },
  {
    "id": 1037,
    "name": "Lakshmi",
    "cn": "美神"
  },
  {
    "id": 1038,
    "name": "Shinryu",
    "cn": "神龙"
  },
  {
    "id": 1040,
    "name": "Byakko",
    "cn": "白虎"
  },
  {
    "id": 1041,
    "name": "Tsukuyomi",
    "cn": "月读"
  },
  {
    "id": 1043,
    "name": "Suzaku",
    "cn": "朱雀"
  },
  {
    "id": 1044,
    "name": "Seiryu",
    "cn": "青龙"
  },
  {
    "id": 42,
    "name": "Alte Roite",
    "cn": "o1s"
  },
  {
    "id": 43,
    "name": "Catastrophe",
    "cn": "o2s"
  },
  {
    "id": 44,
    "name": "Halicarnassus",
    "cn": "o3s"
  },
  {
    "id": 45,
    "name": "Exdeath",
    "cn": "o4s门神"
  },
  {
    "id": 46,
    "name": "Neo Exdeath",
    "cn": "o4s本体"
  },
  {
    "id": 1039,
    "name": "Bahamut Prime",
    "cn": "绝巴哈"
  },
  {
    "id": 51,
    "name": "Phantom Train",
    "cn": "o5s"
  },
  {
    "id": 52,
    "name": "Demon Chadarnook",
    "cn": "o6s"
  },
  {
    "id": 53,
    "name": "Guardian",
    "cn": "o7s"
  },
  {
    "id": 54,
    "name": "Kefka",
    "cn": "o8s门神"
  },
  {
    "id": 55,
    "name": "God Kefka",
    "cn": "o8s本体"
  },
  {
    "id": 1042,
    "name": "The Ultima Weapon",
    "cn": "绝神兵"
  },
  {
    "id": 60,
    "name": "Chaos",
    "cn": "o9s"
  },
  {
    "id": 61,
    "name": "Midgardsormr",
    "cn": "o10s"
  },
  {
    "id": 62,
    "name": "Omega",
    "cn": "o11s"
  },
  {
    "id": 63,
    "name": "Omega-M and Omega-F",
    "cn": "o12s门神"
  },
  {
    "id": 64,
    "name": "The Final Omega",
    "cn": "o12s本体"
  }
]



var api_key = "c776341dc7547e20623eb12350bd5e74";

function fflogsReply(content,userName,callback){
  var ca = content.split(' ');
  var boss = ca[0].trim();
  var job = ca[1];
  if(job){
    job = job.trim();
  }
  var rate = ca[2];
  if(rate){
    rate = rate.trim();
  }
  if(rate.endsWith("%")){
    rate = rate.substring(0,rate.length-1);
  }
  var url;
  var bossid = boss;
  var ba = [];
  for(var i=0;i<bosses.length;i++){
    if(boss[i].cn.indexOf(boss)>=0||boss[i].name.indexOf(boss)>=0){
      ba.push(boss[i]);
    }
  }
  if(ba.length==1){
    bossid = ba[0].id;
  }else if(ba.length==0){
    callback('no match');
  }else{
    var ret = "请选择：\n";
    for(var i=0;i<ba.length;i++){
      ret = ret + "fflog "+ba[i].cn+" "+(job?job:"")+" "+(rate?rate:"")+"\n";
    }
    callback(ret);
    return;
  }

  if(job==undefined){
    url = "https://www.fflogs.com/zone/statistics/15/#boss="+bossid+"&dataset=0&metric=fightdps"
  }else{
    var a = [];
    for(var i=0;i<jobs.length;i++){
      if(jobs[i].en.indexOf(job)>=0||jobs[i].cn.indexOf(job)>=0){
        a.push(jobs[i].en);
      }
    }
    if(a.length==1){
      job = a[0];
    }else{
      job = "Any";
    }
  }
  var rt = parseInt(rate);
  if(rt>=0&&rt<100){

  }else{
    rt = 75;
  }
  if(bossid>0){
    if(job){
      url = "https://www.fflogs.com/zone/statistics/15/#class=Global&spec="+job+"&boss="+bossid+"&dataset="+rt
    }
    getPic(url,callback)
  }
}



let getPic = async ( url,callback) => {
  //url路径
  console.log(url);
  //创建一个实例
  const instance = await phantom.create();
  //创建一个页面
  const page     = await instance.createPage();
  //设置页面参数
  await page.property( 'viewportSize' , { width : 1200 , height : 1000 } );

  //打开url，返回状态（url有转码，解决中文问题）
  const status = await page.open( url);
  if(status=='success'){
    const bb = await page.evaluate(function () {
      return document.getElementById('table-container').getBoundingClientRect();
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
    var filename = "../coolq-data/cq/data/image/send/ff14/logs/"+now.getTime()+".png";
    //filename="1.png";
    console.log(filename);
    await page.render(filename);
    //销毁实例
    await instance.exit();
    callback('[CQ:image,file=send/ff14/logs/'+now.getTime()+'.png]');
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
  fflogsReply
}