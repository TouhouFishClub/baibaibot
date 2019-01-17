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




var api_key = "c776341dc7547e20623eb12350bd5e74";

function fflogsReply(content,userName,callback){
  var ca = content.split(' ');
  var boss = ca[0];
  var job = ca[1];
  var rate = ca[2];
  var url;
  var bossid = boss;
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