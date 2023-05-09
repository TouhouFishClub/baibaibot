const {getChatgptReplay} = require('../../chat/openai');
var request = require('request');
var fs = require('fs')
const { sendImageMsgBuffer } = require('../../../cq/sendImage')
function AIdraw(content,gid,qq,callback){
  var promptchat  = '写一个幻想世界的女主角人设，并写出至少20个外貌关键词，按照如下格式\n  第一行名字，第二行写故事背景，第三行写介绍，第四行写中文关键词，第五行把对应的关键词翻译成英语。关键词用逗号隔开，其余地方不准出现换行符';
  getChatgptReplay(promptchat,205700,357474,function(r){
    r = r.trim();
    console.log(r);
    var ra = r.split('\n');
    var engkw = ra[ra.length-1];
    console.log(engkw);
    var now = new Date().getTime();
    var fn = now+'.png';
    generageAIImage(engkw,function(imgbuffer){
      sendImageMsgBuffer(imgbuffer,fn,'aicard',callback,r,'IF');
    })
  })
}


/*
换模型
 curl -i -H 'Content-Type:application/json' -d '{"sd_model_checkpoint": "5.safetensorsfp16.ckpt [f095a4a68e]","CLIP_stop_at_last_layers": 2}' http://192.168.17.235:7993/sdapi/v1/options
 */


function generageAIImage(kw,callback){
  var bd = {
    "prompt": "masterpiece, best quality, fully detailed,1girl,"+kw,
    "negative_prompt":"((part of the head)), ((((mutated hands and fingers)))), deformed, blurry, bad anatomy, disfigured, poorly drawn face, mutation, mutated, extra limb, ugly, poorly drawn hands, missing limb, blurry, floating limbs, disconnected limbs, malformed hands, blur, out of focus, long neck, long body, Octane renderer,lowres, bad anatomy, bad hands, text, missing fingers, worst quality, low quality, normal quality, signature, watermark, blurry,ugly, fat, obese, chubby, (((deformed))), [blurry], bad anatomy, disfigured, poorly drawn face, mutation, mutated, (extra_limb), (ugly), (poorly drawn hands), messy drawing, morbid, mutilated, tranny, trans, trannsexual, [out of frame], (bad proportions), octane render,maya,EasyNegative,badhandv4",
    "steps": 20,
    "width":512,
    height:768
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
      callback(imgBuffer)
    }
  })
}

//generageAIImage();
//draw()

module.exports={
  AIdraw
}