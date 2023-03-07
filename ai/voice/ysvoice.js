const { exec } = require('child_process')


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


function ysVoiceReply(content,gid,qq,callback){
  content=content.substring(2);
  var ca = content.split(':');
  if(ca.length!=2){
    return;
  }
  var ct = ca[0];
  var txt = ca[1];
  let text = content.split("")
  const num = { "1": "一", "2": "二", "3": "三", "4": "四", "5": "五", "6": "六", "7": "七", "8": "八", "9": "九", "0": "零" }
  for (let i = 0; i < text.length; i++) {
    if ((/\d/g).test(text[i]))
      text[i] = num[text[i]]
  }
  content = text.join("")

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
