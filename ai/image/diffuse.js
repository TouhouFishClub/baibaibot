var fs = require('fs');
var request = require('request');
const {secret} = require("../../secret");
// var base64ToImage = require('base64-to-image');
// const b64img = require('node-base64-image');
var path = require('path');
const { sendImageMsgBuffer } = require(path.join(__dirname, '../../cq/sendImage.js'))
const {realesrgan} = require('./scale');
var MongoClient = require('mongodb').MongoClient;
var mongourl = require('../../baibaiConfigs').mongourl;



function diffuseReply(content,gid,qq,callback,waifu){
  var apikeylist = secret.u2;
  var apikey = apikeylist[Math.floor(Math.random()*apikeylist.length)];
  content = content.trim()
  var url = 'https://api.replicate.com/v1/predictions'
  var version = "a9758cbfbd5f3c2094457d996681af52552901775aa2d6dd0b17fd15df959bef";
  var body1 = '{"version": "'+version+'", "input": {"prompt": "'+content+'"}}';
  if(waifu){
    version = "d79228478508623d9192cfbf39c9fe089d9db7e1dc51cd1c4d266cd58b138453"
    body0 = {"version":version,"input":{"positive_prompt":content,"negative_prompt":"ugly","num_inference_steps":20,"width":768,"height":432}};
    body1 = JSON.stringify(body0);
  }

  console.log(body1)
  request({
    url: url,
    method: "POST",
    proxy:'http://192.168.17.241:2346',
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
      'Authorization': 'Token '+apikey,
      'Content-Type':'application/json'
    },
    body:body1
  }, function(error, response, resbody) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
      // resbody = imgurl;
      // var now = new Date().getTime();
      // var filename = "../coolq-data/cq/data/image/send/diffuse/" + now+"_"+content;
      // var imgreq = request({
      //   url: imgurl,
      //   method: "GET"
      // }, function (error, response, body) {
      //   if (error && error.code) {
      //     console.log('pipe error catched!')
      //     console.log(error);
      //   }
      // }).pipe(fs.createWriteStream(filename));
      // imgreq.on('close', function () {
      //
      // });

      var d1 = eval('(' + resbody + ')');
      if(!(d1&&d1.urls&&d1.urls.get)){
        callback(content+'\n画图失败哦');
        return;
      }
      var geturl = d1.urls.get;
      console.log(geturl);
      setTimeout(function(){
        request({
          url: geturl,
          method: "GET",
          proxy: 'http://192.168.17.241:2346',
          headers: {
            'Authorization': 'Token '+apikey,
            'Content-Type': 'application/json'
          },
        }, function (error, response, resbody2) {
          if (error && error.code) {
            console.log('pipe error catched!')
            console.log(error);
          } else {
            console.log(resbody2);
            var d2 = eval('(' + resbody2 + ')');
            if(d2.output&&d2.output[0]){
              var imgurl = d2.output[0];

              var now = new Date().getTime();
              var filename = "../coolq-data/cq/data/image/send/diffuse/" + now+"_"+content;
              var imgreq = request({
                url: imgurl,
                method: "GET",
                proxy: 'http://192.168.17.241:2346',
              }, function (error, response, body) {
                if (error && error.code) {
                  console.log('pipe error catched!')
                  console.log(error);
                }
              }).pipe(fs.createWriteStream(filename));
              imgreq.on('close', function () {
                var ret = '[CQ:'+'image'+',file=send/diffuse/' + now+"_"+content + ']';
                callback(content+'\n'+ret);
              });
            }else{
              if(waifu){
                callback(content+'\n绘图失败');
              }else{
                callback(content+'\n画图失败');
              }
            }
          }
        });
      },12000);
    }
  });
}

function novelAI(callback,content){
  var hostid = '9485989ce2cab654';
  var url = 'https://'+hostid+'.gradio.app/run/predict/';
  var negetiveStr = '((part of the head)), ((((mutated hands and fingers)))), deformed, blurry, bad anatomy, disfigured, poorly drawn face, mutation, mutated, extra limb, ugly, poorly drawn hands, missing limb, blurry, floating limbs, disconnected limbs, malformed hands, blur, out of focus, long neck, long body, Octane renderer,lowres, bad anatomy, bad hands, text, missing fingers, worst quality, low quality, normal quality, signature, watermark, blurry,ugly, fat, obese, chubby, (((deformed))), [blurry], bad anatomy, disfigured, poorly drawn face, mutation, mutated, (extra_limb), (ugly), (poorly drawn hands), messy drawing, morbid, mutilated, tranny, trans, trannsexual, [out of frame], (bad proportions), octane render, unity, unreal, maya, photorealistic';

  var dt = ['cute girl', '', 'None', 'None', 30, 'Euler a', false, false, 1, 1, 7, -1, -1, 0, 0, 0, false, 768, 512, false, 0.7, 0, 0, 'None', false, 'LoRA', 'None', 1, 'LoRA', 'None', 1, 'LoRA', 'None', 1, 'LoRA', 'None', 1, 'LoRA', 'None', 1, 'Refresh models', false, false, false, false, '', '', 'Seed', '', 'Nothing', '', true, false, false, null, '', '', ''];
var bd = {}
bd.fn_index=123;
bd.session_hash="goaf491shp";
dt[0]=content.substring(4).trim();
dt[1]=negetiveStr;
bd.data=dt;
  request({
    url: url,
    method: "POST",
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
      'content-type':'application/json',
      'referer': 'https://'+hostid+'.gradio.app/'
    },
    body:JSON.stringify(bd)
  }, function(error, response, resbody) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
      var data = eval('('+resbody+')');
      var fn = data.data[0][0].name;
      console.log(fn);
      var imgurl = 'http://'+hostid+'.gradio.app/file='+fn;
      var now = new Date().getTime();
      var filename = "../coolq-data/cq/data/image/send/diffuse/" + now;
      var imgreq = request({
        url: imgurl,
        method: "GET",
        proxy: 'http://192.168.17.241:2346',
      }, function (error, response, body) {
        if (error && error.code) {
          console.log('pipe error catched!')
          console.log(error);
        }
      }).pipe(fs.createWriteStream(filename));
      imgreq.on('close', function () {
        var ret = '[CQ:'+'image'+',file=send/diffuse/' + now+']';
        callback(content+'\n'+ret);
      });
    }
  });
}
//novelAI(function(r){console.log(r)},'cat girl');

var udb;
var cl_magic_config;

initDB();
function initDB(){
  MongoClient.connect(mongourl, function(err, db) {
    udb=db;
    cl_magic_config = db.collection('cl_magic_config');
  });
}

function getMagicCfgStr(magicCfg){
  var ret = '咏唱设置：\n';
  if(magicCfg.size) {
    ret = ret + 'size:'+magicCfg.size;
  }else{
    ret = ret + 'size:768x512或512x768或640x640随机';
  }

  ret = ret.trim()+'\n';
  if(magicCfg.scale){
    ret = ret + 'scale:'+magicCfg.scale;
  }else{
    ret = ret + 'scale:'+'未设置（默认11）';
  }
  ret = ret.trim()+'\n';
  if(magicCfg.sampler){
    ret = ret + 'sampler:'+magicCfg.sampler;
  }else{
    ret = ret + 'sampler:'+'未设置（默认k_euler_ancestral）';
  }
  ret = ret.trim()+'\n';
  if(magicCfg.seed){
    ret = ret + 'seed:'+magicCfg.seed;
  }else{
    ret = ret + 'seed:'+'未设置（默认随机）';
  }
  ret = ret.trim()+'\n';
  if(magicCfg.model){
    ret = ret + 'model:'+magicCfg.model;
  }else{
    ret = ret + 'model:'+'未设置（默认nai-diffusion）';
  }
  ret = ret.trim()+'\n';
  if(magicCfg.uc){
    ret = ret + 'uc:'+magicCfg.uc;
  }else{
    ret = ret + 'uc:'+'未设置（默认..）';
  }
  ret = ret.trim()+'\n';
  return ret.trim();
}

async function saveMagicPrefer(content,gid,qq,callback){
  var ct = content.trim();
  var ca = ct.split('\n');
  var n
  var magicCfg = await getMagicConfigDB(qq);
  if(!magicCfg){
    magicCfg={};
  }
  if(ct==''){
    var ret = getMagicCfgStr(magicCfg);
    callback('您的咏唱设置如下：\n'+ret+'\n咏唱设置方法：\n【咏唱设置】【换行，后面每行一个设置】【key:value】');
    return;
  }
  for(var i=1;i<ca.length;i++){
    var da = ca[i].replace(/：/g,':').trim();
    var n = da.indexOf(':');
    if(n>0){
      var key = da.substring(0,n).trim();
      var value = da.substring(n+1).trim();
      var vv;
      if(key=='scale'){
        vv = parseFloat(value);
        if(vv<1.1){
          vv = 1.1;
        }
        if(vv>100){
          vv = 100;
        }
      }else if(key=='size'){
        value = value.replace(/\*/g,'x');
        if(value=='768x512'||value=='512x768'||value=='640x640'){
          vv = value;
        }else if(value=='随机'||value=='random'){
          vv = null;
        }else{
          vv = null;
        }
      }else if(key=='sampler'){
        if(value=='k_euler_ancestral'||value=='k_euler'||value=='k_lms'||value=='plms'||value=='ddim'){
          vv = value;
        }else{
          vv = 'k_euler_ancestral';
        }
      }else if(key=='seed'){
        var vv = parseInt(value);
        if(vv>0&&vv<4294967295){

        }else{
          vv = null;
        }
      }else if(key=='model'){
        if(value=='nai-diffusion'||value=='safe-diffusion'||value=='nai-diffusion-furry'){
          vv=value
        }else{
          vv = 'nai-diffusion'
        }
      }else if(key=='uc'){
        if(value.toLowerCase()=='default'||value=='默认'){
          vv =null;
        }else{
          vv = value;
        }
      }
      magicCfg[key]=vv;
    }
  }
  saveMagicCfg(qq,magicCfg);
  var ret = getMagicCfgStr(magicCfg);
  callback('您的咏唱设置如下：\n'+ret+'\n咏唱设置方法：\n【咏唱设置】【换行，后面每行一个设置】【key:value】');
}

function saveMagicCfg(qq,magicCfg){
  if(!cl_magic_config){
    cl_magic_config = udb.collection('cl_magic_config');
  }
  magicCfg['_id']=qq;
  cl_magic_config.save(magicCfg);
}

async function getMagicConfigDB(qq){
    if(!cl_magic_config){
      cl_magic_config = udb.collection('cl_magic_config');
    }
    return new Promise((resolve, reject) => {
      cl_magic_config.findOne({'_id': qq}, function (err, magicData) {
        if (err) {
          resolve({})
        } else {
          if(magicData){
            resolve(magicData);
          }else{
            resolve({});
          }
        }
      });
    })
}


var cf = {};
async function naifu(callback,content,novelaitoken,gid,qq){
  var magicCfg = await getMagicConfigDB(qq);
  content=content.substring(4).trim();
  var now = new Date().getTime();
  if(cf[qq]){
    if(cf[qq].ts>now){
      var sub = Math.ceil((cf[qq].ts-now)/60000);
      callback('请'+sub+'分钟后再试');
      return;
    }else{
      cf[qq].c=cf[qq].c+1;
      if(cf[qq].c>3){
        cf[qq].ts = now + 600000;
        cf[qq].c=0;
      }
    }
  }else{
    cf[qq] = {c:1};
  }
  var naifuurl = secret.u3;
  var url;
  if(novelaitoken){
    url = 'https://api.novelai.net/ai/generate-image';
  }else{
    novelaitoken = '';
    url = naifuurl
  }
  var seed = Math.floor(Math.random()*4294967295)
  var bd = {"prompt":"masterpiece, best quality, "+content,"width":768,"height":768,"scale":12,"sampler":"k_euler_ancestral","steps":20,"seed":seed,"n_samples":1,"ucPreset":0,"uc":"lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry"}

  if(novelaitoken){
    var wd = 768;
    var hd = 512;
    var scale = 11;
    var sampler = 'k_euler_ancestral';
    var model = 'nai-diffusion';
    var uc = "((part of the head)), ((((mutated hands and fingers)))), deformed, blurry, bad anatomy, disfigured, poorly drawn face, mutation, mutated, extra limb, ugly, poorly drawn hands, missing limb, blurry, floating limbs, disconnected limbs, malformed hands, blur, out of focus, long neck, long body, Octane renderer,lowres, bad anatomy, bad hands, text, missing fingers, worst quality, low quality, normal quality, signature, watermark, blurry,ugly, fat, obese, chubby, (((deformed))), [blurry], bad anatomy, disfigured, poorly drawn face, mutation, mutated, (extra_limb), (ugly), (poorly drawn hands), messy drawing, morbid, mutilated, tranny, trans, trannsexual, [out of frame], (bad proportions), octane render, unity, unreal, maya, photorealistic";
    if(magicCfg.size){
      var sizea = magicCfg.size.split('x');
      wd = parseInt(sizea[0]);
      hd = parseInt(sizea[1]);

    }else{
      var rd = Math.random();
      if(rd<0.3333){
        wd = 512;
        hd = 768
      }else if(rd<0.6666){
        wd = 640;
        hd = 640
      }
    }
    if(magicCfg.scale){
      scale = magicCfg.scale;
    }
    if(magicCfg.seed){
      seed = magicCfg.seed;
    }
    if(magicCfg.uc){
      uc = magicCfg.uc;
    }
    if(magicCfg.sampler){
      sampler = magicCfg.sampler;
    }
    if(magicCfg.model){
      model = magicCfg.model;
    }
    bd = {"input":"masterpiece, best quality, "+content,"model":model,"parameters":{"width":wd,"height":hd,"scale":scale,"sampler":sampler,"steps":28,"seed":seed,"n_samples":1,"ucPreset":0,"qualityToggle":true,"uc":uc}};
    console.log(bd);
  }
  var now = new Date().getTime();
  var fnc = '';
  var fn = "public/png/"+seed+"_"+fnc+"_"+now;
  var imgreq = request({
    url: url,
    method: "POST",
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
      'content-type':'application/json',
      'authorization': 'Bearer '+novelaitoken
    },
    proxy: 'http://192.168.17.241:2346',
    body:JSON.stringify(bd)
  }, function(error, response, resbody) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
    }
  }).pipe(fs.createWriteStream(fn));
  imgreq.on('close', function () {
    if (fs.existsSync(fn)) {
      var data = fs.readFileSync(fn,"utf-8");
      var da = data.split('\n');
      var imgb64 = da[2].substring(5);
      let dataBuffer = new Buffer(imgb64,'base64');
      sendImageMsgBuffer(dataBuffer, seed+"_"+fnc+"_"+now, 'naifu', msg => {
        var imgurl = 'http://192.168.17.236:4101/send/naifu/'+seed+"_"+fnc+"_"+now+'.png';
        var checkimgurl = 'http://localhost:11001/url='+encodeURIComponent(imgurl);

        request({
          url: checkimgurl,
          headers:{

          }
        }, function(error, response, checkresbody) {
          if (error && error.code) {
            console.log('pipe error catched!')
            console.log(error);
            callback(msg)
          } else {
            if(checkresbody==0){
              var rate = response.headers.rate;
              if(rate>0.85){
                callback('NSFW!\n'+seed+"_"+fnc+"_"+now+'\nrate:'+rate);
              }else{
                callback(msg)
              }
            }else{
              callback(msg)
            }
          }
        })
      },content,'MF');
    }
  });
}

var novelAIToken = undefined;
async function novelAIDiffuse(content,gid,qq,callback){
  if(novelAIToken)  {
    naifu(callback, content, novelAIToken,gid,qq)
  }else {
   var url = 'https://api.novelai.net/user/login'
    var novelAIEml = secret.u4[0];
    var novelAIPwd = secret.u4[1];
    var pwdkey = await calcAccessKey(novelAIEml, novelAIPwd);
    var bd = {"key": pwdkey};
    request({
      url: url,
      method: "POST",
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
        'content-type': 'application/json',
        'referer': 'https://novelai.net/'
      },
      proxy: 'http://192.168.17.241:2346',
      body: JSON.stringify(bd)
    }, function (error, response, resbody) {
      if (error && error.code) {
        console.log('pipe error catched!')
        console.log(error);
      } else {
        var data = eval('(' + resbody + ')');
        var token = data.accessToken;
        novelAIToken = token;
        console.log('novelAI login ok:'+token)
        naifu(callback, content, token,gid,qq)
      }
    });
  }
}

const sodium = require('libsodium-wrappers');

async function calcAccessKey(email,password) {
  await sodium.ready
  return sodium.crypto_pwhash(
    64,
    new Uint8Array(Buffer.from(password)),
    sodium.crypto_generichash(
      sodium.crypto_pwhash_SALTBYTES,
      password.slice(0, 6) + email + 'novelai_data_access_key',
    ),
    2,
    2e6,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
    'base64').slice(0, 64)
}


function HDdiffuse(content,gid,qq,callback){
  novelAIDiffuse(content.substring(2),gid,qq,function(r){
    //  [CQ:image,file=send/naifu/3613846003__1666332859190.png]
    var n = r.indexOf('send/naifu');
    if(n>0){
      var s1 = r.substring(n);
      var n1 = s1.indexOf(']');
      var imgpath = s1.substring(0,n1);
      realesrgan('../coolq-data/cq/data/image/'+imgpath,function(ret){
        if(ret.startsWith("fail")){
          callback(r);
        }else{
          callback(r+"\n"+ret);
        }
      })
    }else{
      callback(r);
    }
  })
}




module.exports={
  novelAI,
  diffuseReply,
  naifu,
  HDdiffuse,
  novelAIDiffuse,
  saveMagicPrefer
}
