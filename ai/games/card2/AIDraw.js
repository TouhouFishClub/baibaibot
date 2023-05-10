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
  "乡村田园",
  "青春校园"
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
  var main = Math.floor(Math.random()*mainlist.length);
  var promptchat  = '写一个'+main+'的女主角人设，并写出至少20个外貌关键词，按照如下格式\n  第一行名字，第二行写故事背景，第三行写人物介绍，人物介绍不少于100字，第四行写中文关键词，第五行把对应的关键词翻译成英语。关键词用逗号隔开，其余地方不准出现换行符';
  getChatgptReplay(promptchat,205700,357474,function(r){
    r = r.trim();
    console.log(r);
    var ra = r.split('\n');
    var engkw = ra[ra.length-1];
    var rr = '';
    for(var i=0;i<ra.length-1;i++){
      var rd = ra[i].trim();
      var n=rd.indexOf('：')
      if(n>0&&n<10){
        rd = rd.substring(n+1);
      }
      if(rd.length>0){
        rr = rr + rd+'\n';
      }
    }
    rr = rr.trim();

    var fn = now+'.png';
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
  console.log(bd)
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