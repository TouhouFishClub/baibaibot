const https = require('https');
const http = require('http');
const { IMAGE_DATA } = require('../../baibaiConfigs');
const path = require('path');
const fs = require('fs');

/**
 * NanoBanana AI图片生成插件
 * 基于速创API的NanoBanana模型
 */

// 从.secret.json文件中获取API密钥
let API_KEY = '';
try {
  const secretPath = path.join(__dirname, '.secret.json');
  if (fs.existsSync(secretPath)) {
    const secret = JSON.parse(fs.readFileSync(secretPath, 'utf8'));
    API_KEY = secret.apiKey || '';
  } else {
    console.log('未找到.secret.json文件，请在ai/banana/.secret.json中配置API密钥');
  }
} catch (e) {
  console.log('读取.secret.json文件失败:', e.message);
}

const API_URL = 'https://api.wuyinkeji.com/api/img/nanoBanana';

/**
 * 调用NanoBanana API生成图片
 * @param {string} prompt - 生成图片的提示词
 * @param {string|Array} imgUrl - 参考图片URL（可选）
 * @param {Function} callback - 回调函数
 */
function callNanoBananaAPI(prompt, imgUrl, callback) {
  if (!API_KEY) {
    callback('错误：未配置NanoBanana API密钥，请在ai/banana/.secret.json中添加配置');
    return;
  }

  const postData = JSON.stringify({
    model: 'nano-banana',
    prompt: prompt,
    img_url: imgUrl || undefined
  });

  const options = {
    hostname: 'api.wuyinkeji.com',
    port: 443,
    path: '/api/img/nanoBanana',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      'Authorization': API_KEY,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        
        if (response.code === 200 && response.data && response.data.id) {
          // API成功返回，生成图片链接
          const imageUrl = `https://api.wuyinkeji.com/api/img/get/${response.data.id}`;
          
          // 下载图片到本地
          downloadImage(imageUrl, response.data.id, (localPath) => {
            if (localPath) {
              callback(`[CQ:image,file=${localPath}]`);
            } else {
              callback(`图片生成成功，但下载失败。图片ID: ${response.data.id}`);
            }
          });
        } else {
          callback(`API调用失败: ${response.msg || '未知错误'}`);
        }
      } catch (error) {
        console.error('解析API响应失败:', error);
        callback('API响应解析失败，请稍后重试');
      }
    });
  });

  req.on('error', (error) => {
    console.error('API请求失败:', error);
    callback('网络请求失败，请稍后重试');
  });

  req.write(postData);
  req.end();
}

/**
 * 下载图片到本地
 * @param {string} imageUrl - 图片URL
 * @param {string} imageId - 图片ID
 * @param {Function} callback - 回调函数
 */
function downloadImage(imageUrl, imageId, callback) {
  const fileName = `nanoBanana_${imageId}_${Date.now()}.jpg`;
  const localPath = path.join(IMAGE_DATA, 'nanoBanana', fileName);
  const relativePath = path.join('send', 'nanoBanana', fileName);

  // 确保目录存在
  const dir = path.dirname(localPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const protocol = imageUrl.startsWith('https:') ? https : http;
  
  const req = protocol.get(imageUrl, (res) => {
    if (res.statusCode === 200) {
      const fileStream = fs.createWriteStream(localPath);
      
      res.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        callback(relativePath);
      });
      
      fileStream.on('error', (error) => {
        console.error('文件写入失败:', error);
        callback(null);
      });
    } else {
      console.error('图片下载失败，状态码:', res.statusCode);
      callback(null);
    }
  });

  req.on('error', (error) => {
    console.error('图片下载请求失败:', error);
    callback(null);
  });

  req.setTimeout(30000, () => {
    req.abort();
    console.error('图片下载超时');
    callback(null);
  });
}

/**
 * 解析用户输入，提取提示词和图片URL
 * @param {string} content - 用户输入内容
 * @returns {Object} 解析结果
 */
function parseUserInput(content) {
  // 移除"banana"前缀
  let input = content.replace(/^banana\s*/i, '').trim();

  // 调试日志（可选）
  // console.log('解析输入:', content)
  
  if (!input) {
    return {
      error: '请提供图片生成提示词\n用法: banana [提示词] [图片URL(可选)]'
    };
  }

  let prompt = input;
  let imgUrl = null;

  // 检查是否包含CQ图片码
  const cqImageRegex = /\[CQ:image[^\]]*url=([^,\]]+)[^\]]*\]/g;
  const cqMatches = input.match(cqImageRegex);
  
  if (cqMatches && cqMatches.length > 0) {
    // 提取CQ码中的URL
    const urls = [];
    cqMatches.forEach(cqCode => {
      const urlMatch = cqCode.match(/url=([^,\]]+)/);
      if (urlMatch && urlMatch[1]) {
        // 对URL进行反转义处理
        let url = urlMatch[1];
        url = url.replace(/&amp;/g, '&');
        url = url.replace(/&#44;/g, ',');
        urls.push(url);
      }
    });
    
    if (urls.length > 0) {
      imgUrl = urls;
      // 移除CQ码，剩余部分作为提示词
      prompt = input.replace(cqImageRegex, '').trim();
    }
  } else {
    // 检查是否包含普通的图片URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = input.match(urlRegex);
    
    if (urls && urls.length > 0) {
      // 移除URL，剩余部分作为提示词
      prompt = input.replace(urlRegex, '').trim();
      imgUrl = urls;
    }
  }

  if (!prompt) {
    return {
      error: '请提供有效的图片生成提示词'
    };
  }

  // 调试日志（可选）
  // console.log('解析结果 - 提示词:', prompt, '图片URL:', imgUrl)

  return {
    prompt: prompt,
    imgUrl: imgUrl
  };
}

/**
 * NanoBanana主处理函数
 * @param {string} content - 用户输入内容
 * @param {string} from - 用户ID
 * @param {string} name - 用户名称
 * @param {string} groupid - 群组ID
 * @param {Function} callback - 回调函数
 */
function nanoBananaReply(content, from, name, groupid, callback) {
  console.log(`NanoBanana请求 - 用户: ${name}(${from}), 群组: ${groupid}, 内容: ${content}`);
  
  const parseResult = parseUserInput(content);
  
  if (parseResult.error) {
    callback(parseResult.error);
    return;
  }

  // 显示处理中的消息
  callback('🎨 正在使用NanoBanana生成图片，请稍候...');

  // 调用API生成图片
  callNanoBananaAPI(parseResult.prompt, parseResult.imgUrl, (result) => {
    callback(result);
  });
}

/**
 * 获取帮助信息
 * @param {Function} callback - 回调函数
 */
function getNanoBananaHelp(callback) {
  const helpText = `🍌 NanoBanana AI图片生成帮助

用法：
banana [提示词] - 根据提示词生成图片
banana [提示词] [图片URL] - 基于参考图片和提示词生成图片
banana [提示词] [发送图片] - 基于发送的图片和提示词生成图片

示例：
banana 一只可爱的小猫咪
banana 美丽的风景画 https://example.com/image.jpg
banana 动漫风格 [发送一张图片]

注意：
- 提示词建议使用中文或英文
- 支持直接发送图片或提供图片URL链接
- 图片URL需要是公网可访问的链接
- 生成过程需要一些时间，请耐心等待

配置：
请在 ai/banana/.secret.json 中配置API密钥`;

  callback(helpText);
}

module.exports = {
  nanoBananaReply,
  getNanoBananaHelp
};
