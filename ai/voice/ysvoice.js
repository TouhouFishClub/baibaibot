const { exec } = require('child_process')
var request = require('request');
var fs = require('fs')

const genshinSpeakers = ['派蒙', '凯亚', '安柏', '丽莎', '琴', '香菱', '枫原万叶', '迪卢克', '温迪', '可莉', '早柚', '托马', '芭芭拉', '优菈', '云堇', '钟离', '魈', '凝光', '雷电将军', '北斗', '甘雨', '七七', '刻晴', '神里绫华', '戴因斯雷布', '雷泽', '神里绫人', '罗莎莉亚', '阿贝多', '八重神子', '宵宫', '荒泷一斗', '九条裟罗', '夜兰', '珊瑚宫心海', '五郎', '散兵', '女士', '达达利亚', '莫娜', '班尼特', '申鹤', '行秋', '烟绯', '久岐忍', '辛焱', '砂糖', '胡桃', '重云', '菲谢尔', '诺艾尔', '迪奥娜', '鹿野院平藏']

const otherSpeakers = { "星爷": "zxcmp", "鬼": "juyinf_guigushi", "葛优": "geyoump", "四川话": "ppangf_csn", "粤语": "lunaif_ctn", "loli": "xbekef", "东北话": "xjingf_cdb", "然然": "qianranfa" }

const youziSpeakers = { '绫地宁宁': 0, '因幡巡': 1, '朝武芳乃': 2, '常陆茉子': 3, '丛雨': 4, '鞍马小春': 5, '在原七海': 6 }

const bh3Speakers = { '丽塔':0,'伊甸':1,'八重樱':2,'刻晴bh3':3,'卡莲':4,'卡萝尔':5,'姬子':6,'布洛妮娅':7,'希儿':8,'帕朵菲莉丝':9,'幽兰黛尔':10,'德丽莎':11,'格蕾修':12,'梅比乌斯':13,'渡鸦':14,'爱莉希雅':15,'琪亚娜':16,'符华':17,'维尔薇':18,'芽衣':19,'菲谢尔bh3':20,'阿波尼亚':21,'空律':22,'识律':23}

// 生成时使用的 noise_factor，可用于控制感情等变化程度。默认为0.667。
const noise = 0.667
// 生成时使用的 noise_factor_w，可用于控制音素发音长度变化程度。默认为0.8。
const noisew = 0.8
// 生成时使用的 length_factor，可用于控制整体语速。默认为1.2。
const length = 1.2
var gpu = 0;
var ex_wav = 0;

const wavHeader = [
  'RIFF', // chunk id
  0x24, // chunk size
  'WAVE', // format
  'fmt ', // subchunk 1 id
  0x10, // subchunk 1 size
  0x01, // audio format (PCM)
  0x01, // num channels
  0x44, 0xAC, // sample rate (44100)
  0x88, 0x58, 0x01, // byte rate
  0x02, // block align
  0x10, // bits per sample
  'data', // subchunk 2 id
  0x10, // subchunk 2 size
];
let headerBuffer = Buffer.alloc(44);
for (let i = 0; i < wavHeader.length; i++) {
  if (typeof wavHeader[i] === 'string') {
    headerBuffer.write(wavHeader[i], i * 2, 'utf16le');
  } else {
    headerBuffer.writeInt16LE(wavHeader[i], i * 2);
  }
}


function ysVoiceReply(content,gid,qq,callback) {
  if (!(qq + "").startsWith("35747") && !(qq + "").startsWith("79901") && !(gid + "").startsWith("20570")) {
    return;
  }
  content=content.substring(2);
  content= content.replace(/：/g,':')
  content= content.replace(/ /g,'')
  content= content.replace(/\r/g,'。')
  content= content.replace(/\n/g,'。')
  let text = content.split("")
  const num = { "1": "一", "2": "二", "3": "三", "4": "四", "5": "五", "6": "六", "7": "七", "8": "八", "9": "九", "0": "零" }
  for (let i = 0; i < text.length; i++) {
    if ((/\d/g).test(text[i]))
      text[i] = num[text[i]]
  }
  content = text.join("")


  var url = 'http://192.168.17.235:11188/voice?d='+encodeURIComponent(content);
  request({
    url: url,
    method: "GET"
  }, function(error, response, body){
    if(error&&error.code){
      console.log('pipe error catched!')
      console.log(error);
    }else{
      var b64=body;
      var binary = Buffer.from(b64, 'base64')
      var nowts = new Date().getTime();
      fs.writeFile('../coolq-data/cq/data/record/send/'+nowts+'.mp3', Buffer.concat([binary]), err => {
        if (err) throw err;
        console.log('WAV 文件写入成功!');
        ret = '[CQ:record,file=send/'+nowts+'.mp3]'
        callback(ret)
      });
    }
  })
}

//ysVoiceReply('生命之色涡旋流转，七重之门现于世间，力量之塔君临九天',357474,357474,function(){})



function ysVoiceReply000(content,gid,qq,callback){
  if(!(qq+"").startsWith("35747") && !(qq+"").startsWith("79901")&&!(gid+"").startsWith("20570")) {
    return;
  }
  content=content.substring(2);
  content= content.replace(/：/g,':')
  content= content.replace(/ /g,'')
  content= content.replace(/\r/g,'。')
  content= content.replace(/\n/g,'。')
  var n=content.indexOf(':');
  var ct='派蒙';
  var txt='派蒙';
  if(n==-1||n>5){
    ct = genshinSpeakers[Math.floor(Math.random()*genshinSpeakers.length)];
    txt = content;
  }else{
    ct = content.substring(0,n);
    txt=content.substring(n+1);
  }
  let text = txt.split("")
  const num = { "1": "一", "2": "二", "3": "三", "4": "四", "5": "五", "6": "六", "7": "七", "8": "八", "9": "九", "0": "零" }
  for (let i = 0; i < text.length; i++) {
    if ((/\d/g).test(text[i]))
      text[i] = num[text[i]]
  }
  txt = text.join("")

  var characternum = -1;
  for (let i = 0; i < genshinSpeakers.length; i++) {
    if (ct == genshinSpeakers[i]) {
      characternum = i;
      break;
    }
  }
  console.log("输出角色序号:"+characternum)
  if(characternum==-1){
    return;
  }
  var nowts = new Date().getTime();
  var py='run_new.py'
  var cmdStr = '../plugin/Python-3.8.16/python ../plugin/vits_yunzai_plugin/vits/'+ py +' --character=' + characternum + ' --text=' + txt +' --out=../coolq-data/cq/data/record/send/'+nowts+'.wav';

  exec(cmdStr, async function (error, stdout, stderr) {
    if (error) {
      console.log("生成失败", stderr);
    } else {
      ret = '[CQ:record,file=send/'+nowts+'.wav]'
      callback(ret)
    }
  })
}

module.exports={
  ysVoiceReply
}
