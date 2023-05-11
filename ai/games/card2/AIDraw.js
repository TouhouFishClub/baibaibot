const {getChatgptReplay} = require('../../chat/openai');
var request = require('request');
var fs = require('fs')
const { sendImageMsgBuffer } = require('../../../cq/sendImage')
var {sendGmImage} = require('../../../cq/sendImage');
var gm = require('gm')
var imageMagick = gm.subClass({ imageMagick : true });

var limit = {};

var mainlist = [
  "幻想世界",
  "奇幻世界",
  "以星际旅行为主题",
  "以名侦探为主题",
  "以乡村田园生活为主题",
  "童话世界",
  "高科技未来世界",
  "幻想魔法学园",
  "高中校园生活"
]

function AIdraw(content,gid,qq,callback){
  var now = new Date().getTime();
  if(limit[qq]==undefined){
    limit[qq]={ts:now,c:1}
  }else{
    if(now>limit[qq].ts){
      limit[qq]={ts:now+600000,c:1}
    }else{
      limit[qq].c=limit[qq].c+1;
    }
  }
  if((qq+"").startsWith("35747")||(qq+"").startsWith("79901")){

  }else{
    if(limit[qq].c>1){
      var left = Math.round((limit[qq].ts-now)/60000);
      callback('请在'+left+'分钟后再试哦');
      return;
    }
  }
  var main = mainlist[Math.floor(Math.random()*mainlist.length)];
  var promptchat1  = '写一个'+main+'的女主角人设，按照如下格式\n  第一行名字。第二行写故事背景和人物介绍，不少于150字。第三行为她写一句符合人设的台词。第四行为她写20个符合人设的中文关键词。第五行把上一行的关键词翻译成英语，关键词用逗号隔开。只写这些就够了，其余地方不准出现换行符。';
  var promptchat2  = '随机挑选一个二次元动漫的女主角，并描述她的人设，按照如下格式\n  第一行写中文的名字。第二行写故事背景和人物介绍，不少于150字。第三行为她写一句符合人设的台词。第四行为她写20个符合人设的中文关键词。第五行把上一行的关键词翻译成英语，关键词用逗号隔开。第六行写该人物的英文名，然后在大括号{}内写该人物的出处的英文名。请一定要严格按照我说的格式去写，不许在其他地方出现换行符。';
  var promptchat = promptchat2;
  getChatgptReplay(promptchat,205700,357474,function(r){
    r = r.trim();
    r = r.replace(/:/g,'：');
    var rda = r.split('\n');
    var ra = [];
    for(var i=0;i<rda.length;i++){
      if(rda[i].trim().length>2){
        ra.push(rda[i]);
      }
    }
    var kk = 1;
    if(ra.length>=6){
      kk = ra.length-4;
    }
    var engkw = '';
    var rr = '';
    for(var i=0;i<ra.length;i++){
      var rd = ra[i].trim();
      var n=rd.indexOf('：')
      if(n>0&&n<10){
        rd = rd.substring(n+1);
      }
      ra[i]=rd;
      if(i==5){
        rd = '((((('+rd+')))))';
      }
      if(rd.length>0&&i<ra.length-kk){
        rr = rr + rd+'\n';
      }else{
        engkw = engkw + ',' + rd;
      }
    }
    rr = rr.trim();
    if(engkw.startsWith(",")){
      engkw = engkw.substring(1);
    }
    console.log(ra);
    console.log(main)
    console.log(rr+"\n\n")
    console.log(engkw)

    generageAIImage(engkw,rr,callback)
  })
}


/*
换模型
 curl -i -H 'Content-Type:application/json' -d '{"sd_model_checkpoint": "5.safetensorsfp16.ckpt [f095a4a68e]","CLIP_stop_at_last_layers": 2}' http://192.168.17.235:7993/sdapi/v1/options
 */


function generageAIImage(kw,detail,callback){
  var now = new Date().getTime();
  var bd = {
    "prompt": "masterpiece, best quality, fully detailed,((((((1girl)))))),"+kw,
    "negative_prompt":"((part of the head)), ((((mutated hands and fingers)))), deformed, blurry, bad anatomy, disfigured, poorly drawn face, mutation, mutated, extra limb, ugly, poorly drawn hands, missing limb, blurry, floating limbs, disconnected limbs, malformed hands, blur, out of focus, long neck, long body, Octane renderer,lowres, bad anatomy, bad hands, text, missing fingers, worst quality, low quality, normal quality, signature, watermark, blurry,ugly, fat, obese, chubby, (((deformed))), [blurry], bad anatomy, disfigured, poorly drawn face, mutation, mutated, (extra_limb), (ugly), (poorly drawn hands), messy drawing, morbid, mutilated, tranny, trans, trannsexual, [out of frame], (bad proportions), octane render,maya,EasyNegative,badhandv4",
    "steps": 20,
    "width":500,
    height:800
  };
  var imgreq = request({
    url: "http://192.168.17.235:7993/sdapi/v1/txt2img",
    method: "POST",
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
      'content-type':'application/json',
    },
    body:JSON.stringify(bd)
  }, function(error, response, resbody) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
      var data = eval('('+resbody+')');
      var images = data.images;
      var img0 = images[0];
      const imgBuffer = Buffer.from(img0, 'base64');
      var fn = 'static/'+now+'.png'
      fs.writeFile(fn, imgBuffer,function(){
        generateWordImage(fn,detail,callback)
      });
    }
  })
}


var wd = '艾丽娜\n艾丽娜生活在一个幻想世界中，她是一位拥有神秘力量的女孩。在年幼的时候，她不小心触发了自己的能力，从此以后，她开始探索自己的能力，并决定利用自己的力量保护那些弱小的生命。\n艾丽娜是一个柔弱而坚韧的女孩。她有着一双晶莹剔透的眼睛，深邃而又幽暗。在向往正义的同时，她非常注重自己的形象，保持着淡雅的容貌。她身上穿着一件淡紫色的长裙，轻盈的穿行于森林之间，仿佛一只凤凰在飞翔。她的外表虽然显得柔弱，但她内心的坚强和勇气却让她成为众人的信仰。\n晶莹剔透、深邃幽暗、淡雅、凤凰、坚强、勇气、信仰、神秘、力量、保护、森林、长裙、柔弱、正义、形象、年幼、探索、幻想、弱小、生命';
function generateWordImage(chapath,uw,callback){
  var ur = '';
  var now = new Date().getTime();
  var c = 0
  for(var i=0;i<uw.length;i++){
    if(uw[i]=='\n'){
      c=0;
      ur = ur + '\n\n';
    }else{
      c++;
      ur = ur + uw[i];
      if(c%22==21){
        ur = ur + '\n'
        c = 0;
      }
    }
  }
  ur = ur.trim();
  console.log(ur);
  var img1 = new imageMagick("static/blank.png");
  var fn1 = 'static/'+now+"_blank.jpg";
  img1.resize(512, 800,'!') //加('!')强行把图片缩放成对应尺寸150*150！
    .autoOrient()
    .fontSize(22)
    .fill('blue')
    .font('./font/STXIHEI.TTF')
    .drawText(0,0,ur,'NorthWest')
    .write(fn1, function(err){
      var chaimg = new imageMagick(chapath);
      chaimg.append(fn1,true)
      sendGmImage(chaimg,'',callback);
    });
}


//generageAIImage();
//draw()

module.exports={
  AIdraw
}