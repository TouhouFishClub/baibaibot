const fs = require('fs-extra')
const path = require('path-extra')
const md5 = require("md5")
const nodeHtmlToImage = require('node-html-to-image')
const { IMAGE_DATA } = require(path.join(__dirname, '..', '..', 'baibaiConfigs.js'))
const font2base64 = require('node-font2base64')

const Corp_Bold = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', 'font', 'Corp-Bold.otf'))

// 猪猪结果数据
const pigResults = [
  {
    id: "human",
    name: "人类",
    emoji: "👤",
    description: "检测不出猪元素，是人类吗？",
    analysis: "你拥有人类的思维和情感，保持着理性和智慧。不过有时候适当放松一下，学学猪的简单快乐也不错哦！"
  },
  {
    id: "pig",
    name: "猪",
    emoji: "🐷",
    description: "普通小猪",
    analysis: "你性格温和，喜欢简单的生活，容易满足。在别人眼中可能有些慵懒，但你知道如何享受生活的美好。"
  },
  {
    id: "black-pig",
    name: "小黑猪",
    emoji: "🐖",
    description: "小黑猪，卤出猪脚了",
    analysis: "你有着独特的魅力，外表低调但内心丰富。黑色象征着神秘和深度，你的性格也像一本值得细细品味的书。"
  },
  {
    id: "wild-boar",
    name: "野猪",
    emoji: "🐗",
    description: "你是一只勇猛的野猪！",
    analysis: "你性格刚强，充满活力和冒险精神。遇到困难从不轻易退缩，有着坚韧不拔的意志和强大的生存能力。"
  },
  {
    id: "zhuge-liang",
    name: "猪葛亮",
    emoji: "🐷🧠",
    description: "猪里最聪明的一个",
    analysis: "你聪明绝顶，机智过人，有着非凡的智慧和谋略。在关键时刻总能想出解决问题的办法，是大家眼中的智多星。"
  },
  {
    id: "pig-stamp",
    name: "猪圆章",
    emoji: "🐷🔴",
    description: "《猪圈那些事》",
    analysis: "你做事认真负责，注重细节，有着强烈的责任感。你的存在让周围的一切都变得更加有序和可靠。"
  },
  {
    id: "zombie-pig",
    name: "僵尸猪",
    emoji: "🧟🐷",
    description: "喜欢的食物是猪脑",
    analysis: "你有着独特的个性和思维方式，常常让人捉摸不透。你的创造力和想象力丰富，总能带来意想不到的惊喜。"
  },
  {
    id: "skeleton-pig",
    name: "骷髅猪",
    emoji: "💀🐷",
    description: "资深不死族",
    analysis: "你外表看起来有些冷酷，但内心温暖。你有着独特的审美和品味，喜欢追求个性和与众不同。"
  },
  {
    id: "pig-human",
    name: "猪人",
    emoji: "🐷👤",
    description: "你是猪还是人？",
    analysis: "你兼具猪的可爱和人的智慧，能够在不同的环境中灵活适应。你有着丰富的情感和复杂的内心世界。"
  },
  {
    id: "demon-pig",
    name: "恶魔猪",
    emoji: "😈🐷",
    description: "满肚子坏心眼",
    analysis: "你活泼好动，喜欢恶作剧，充满了恶作剧的精神。虽然有时候会让人头疼，但你的活力和幽默感也给周围带来了很多欢乐。"
  },
  {
    id: "heaven-pig",
    name: "天堂猪",
    emoji: "😇🐷",
    description: "似了喵~",
    analysis: "你性格善良，心灵纯洁，总是愿意帮助他人。你的存在就像阳光一样温暖，给周围的人带来希望和力量。"
  },
  {
    id: "explosive-pig",
    name: "爆破小猪",
    emoji: "💣🐷",
    description: "我跟你爆了！",
    analysis: "你精力充沛，热情似火，有着强烈的感染力。你的出现总能点燃周围的气氛，让一切变得更加活跃和有趣。"
  },
  {
    id: "black-white-pig",
    name: "黑白猪",
    emoji: "⚫⚪🐷",
    description: "串子",
    analysis: "你有着矛盾而统一的性格，既有着严肃认真的一面，也有着活泼可爱的一面。你追求平衡和和谐，善于在不同的场合展现不同的自己。"
  },
  {
    id: "pork-skewer",
    name: "猪肉串",
    emoji: "🍢",
    description: "真正的串子",
    analysis: "你性格开朗，善于与人交往，有着很强的亲和力。你就像美食一样，能够带给人满足和快乐，是大家都喜欢的对象。"
  },
  {
    id: "magic-pig",
    name: "魔法少猪",
    emoji: "🪄🐷",
    description: "马猪烧酒",
    analysis: "你有着丰富的想象力和创造力，总是能够带给人惊喜和新鲜感。你的想法独特而有趣，常常能够启发他人的思维。"
  },
  {
    id: "mechanical-pig",
    name: "机械猪",
    emoji: "🤖🐷",
    description: "人机",
    analysis: "你思维逻辑清晰，做事有条理，有着很强的分析和解决问题的能力。你喜欢追求效率和完美，是一个可靠的合作伙伴。"
  },
  {
    id: "pig-ball",
    name: "猪猪球",
    emoji: "🏀🐷",
    description: "滚了",
    analysis: "你性格活泼好动，充满了青春活力，喜欢运动和挑战。你有着很强的适应能力，能够在不同的环境中保持积极向上的态度。"
  },
  {
    id: "doll-pig",
    name: "玩偶猪",
    emoji: "🧸🐷",
    description: "fufu小猪",
    analysis: "你外表可爱，性格温柔，让人忍不住想要亲近和保护。你有着很强的治愈能力，能够带给人安慰和温暖。"
  },
  {
    id: "soul-pig",
    name: "灵魂猪",
    emoji: "👻🐷",
    description: "从冥界归来的猪",
    analysis: "你有着丰富的内心世界和深刻的思想，喜欢思考人生的意义和价值。你追求精神上的满足和成长，是一个有深度的人。"
  },
  {
    id: "crystal-pig",
    name: "水晶猪",
    emoji: "💎🐷",
    description: "珍贵又脆弱的小猪",
    analysis: "你有着纯洁透明的心灵和高雅的气质，就像水晶一样美丽而珍贵。你追求真善美，有着很高的道德标准和审美情趣。"
  },
  {
    id: "snow-pig",
    name: "雪猪",
    emoji: "❄️🐷",
    description: "洁白的雪猪",
    analysis: "你性格纯真，心灵洁净，就像雪一样洁白无瑕。你有着独特的魅力和气质，让人忍不住想要接近和了解。"
  },
  {
    id: "pig-cat",
    name: "猪咪",
    emoji: "🐷🐱",
    description: "你是一只可爱的猪咪！",
    analysis: "你兼具猪的可爱和猫的优雅，有着独特的魅力和个性。你既喜欢享受生活的美好，也有着自己的独立思想和主张。"
  }
];

// 根据QQ号和日期生成固定的猪猪索引
const createPigIndex = id => {
  let str = `${id}${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}_pig`
  let md = md5(str)
  let index = parseInt(md.substring(0, 8), 16) % pigResults.length
  return index
}

// 今日猪猪主函数
const jrzz = (qq, callback, userInfo) => {
  let target = qq
  console.log(`jrzz target ===> ${target}`)
  
  // 如果没有 userInfo，使用默认值
  if(!userInfo) {
    userInfo = { nid: 'unknown' }
  }
  console.log(`====== jrzz =======`)
  console.log(userInfo)
  
  let output = path.join(IMAGE_DATA, 'rp_pig', `${target}_jrzz.png`)
  
  // 确保输出目录存在
  fs.ensureDirSync(path.join(IMAGE_DATA, 'rp_pig'))

  render(target, userInfo, output, callback)
}

const render = (target, userInfo, output, callback) => {
  let pigIndex = createPigIndex(target)
  let pigResult = pigResults[pigIndex]
  console.log(`猪猪索引: ${pigIndex}, 猪猪类型: ${pigResult.name}`)

  // 读取图片并转换为base64
  let pigImagePath = path.join(__dirname, 'image', `${pigResult.id}.png`)
  let pigImageBase64 = ''
  try {
    let imageBuffer = fs.readFileSync(pigImagePath)
    pigImageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`
  } catch (e) {
    // 如果找不到对应图片，使用默认猪图片
    let defaultImagePath = path.join(__dirname, 'image', 'pig.png')
    let imageBuffer = fs.readFileSync(defaultImagePath)
    pigImageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`
  }

  nodeHtmlToImage({
    output,
    html: `
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <title>今日猪猪</title>
    <style>
      * {
        border: 0;
        padding: 0;
        margin: 0;
        box-sizing: border-box;
      }
      @font-face {
        font-family: 'Corp_Bold';
        src: url(${Corp_Bold}) format('opentype');
      }
      body {
        width: 500px;
        min-height: 20px;
        font-family: Corp_Bold, 'Microsoft YaHei', sans-serif;
        overflow: hidden;
        background: linear-gradient(135deg, #FFE4E9 0%, #FFF5F7 50%, #FFE8EC 100%);
      }
      .main-container {
        padding: 30px;
        position: relative;
      }
      .header {
        text-align: center;
        margin-bottom: 20px;
      }
      .header h1 {
        font-size: 32px;
        color: #FF69B4;
        text-shadow: 2px 2px 4px rgba(255, 105, 180, 0.3);
        margin-bottom: 8px;
      }
      .user-info {
        font-size: 18px;
        color: #666;
        background: rgba(255, 255, 255, 0.7);
        padding: 8px 16px;
        border-radius: 20px;
        display: inline-block;
      }
      .result-card {
        background: white;
        border-radius: 24px;
        padding: 30px;
        box-shadow: 0 8px 32px rgba(255, 105, 180, 0.2);
        text-align: center;
      }
      .pig-image-container {
        width: 140px;
        height: 140px;
        margin: 0 auto 20px;
        background: linear-gradient(135deg, #FFB6C1 0%, #FFC0CB 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 16px rgba(255, 105, 180, 0.3);
      }
      .pig-image {
        width: 100px;
        height: 100px;
        object-fit: contain;
      }
      .pig-name {
        font-size: 36px;
        font-weight: bold;
        color: #FF69B4;
        margin-bottom: 12px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
      }
      .pig-emoji {
        font-size: 28px;
        margin-bottom: 16px;
      }
      .pig-description {
        font-size: 20px;
        color: #888;
        margin-bottom: 20px;
        padding: 12px 20px;
        background: linear-gradient(135deg, #FFF0F5 0%, #FFE4E9 100%);
        border-radius: 16px;
        display: inline-block;
      }
      .pig-analysis {
        font-size: 16px;
        color: #666;
        line-height: 1.8;
        text-align: left;
        padding: 16px;
        background: #FAFAFA;
        border-radius: 12px;
        border-left: 4px solid #FFB6C1;
      }
      .footer {
        text-align: center;
        margin-top: 20px;
        font-size: 14px;
        color: #AAA;
      }
      .footer span {
        color: #FFB6C1;
      }
    </style>
  </head>
  <body>
    <div class="main-container">
      <div class="header">
        <h1>🐷 今日猪猪 🐷</h1>
        <div class="user-info">${userInfo.nid} 的今日猪猪</div>
      </div>
      
      <div class="result-card">
        <div class="pig-image-container">
          <img class="pig-image" src="${pigImageBase64}" alt="${pigResult.name}">
        </div>
        <div class="pig-name">${pigResult.name}</div>
        <div class="pig-emoji">${pigResult.emoji}</div>
        <div class="pig-description">${pigResult.description}</div>
        <div class="pig-analysis">${pigResult.analysis}</div>
      </div>
      
      <div class="footer">
        <p>每日结果固定，明天再来看看吧~ <span>🐽</span></p>
      </div>
    </div>
  </body>
</html>
`
  })
    .then(() => {
      console.log(`保存${target}_jrzz.png成功！`)
      let imgMsg = `[CQ:image,file=${path.join('send', 'rp_pig', `${target}_jrzz.png`)}]`
      callback(imgMsg)
    })
    .catch(err => {
      console.error('生成今日猪猪图片失败:', err)
    })
}

module.exports = {
  jrzz
}

