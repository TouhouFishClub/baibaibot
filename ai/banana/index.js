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
          console.log('API响应成功:', response);
          
          // 尝试多个可能的图片URL格式
          const possibleUrls = [
            `https://api.wuyinkeji.com/api/img/get/${response.data.id}`,
            `https://api.wuyinkeji.com/img/${response.data.id}`,
            `https://api.wuyinkeji.com/api/img/${response.data.id}`,
          ];
          
          // 如果响应中直接包含图片URL，优先使用
          if (response.data.url) {
            possibleUrls.unshift(response.data.url);
          }
          
          console.log(`尝试下载图片，可能的URL:`, possibleUrls);
          
          // 尝试下载图片
          tryDownloadImage(possibleUrls, response.data.id, 0, (localPath, error) => {
            if (localPath) {
              callback(`[CQ:image,file=${localPath}]`);
            } else {
              // 提供更详细的错误信息和备用方案
              let errorMsg = `图片生成成功，但下载失败。图片ID: ${response.data.id}`;
              if (error) {
                errorMsg += `\n错误详情: ${error}`;
              }
              errorMsg += `\n尝试的链接: ${possibleUrls.join(', ')}`;
              callback(errorMsg);
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
 * 尝试从多个URL下载图片
 * @param {Array} urls - 图片URL数组
 * @param {string} imageId - 图片ID
 * @param {number} index - 当前尝试的URL索引
 * @param {Function} callback - 回调函数
 */
function tryDownloadImage(urls, imageId, index, callback) {
  if (index >= urls.length) {
    callback(null, '所有URL都尝试失败');
    return;
  }
  
  const currentUrl = urls[index];
  console.log(`尝试URL ${index + 1}/${urls.length}: ${currentUrl}`);
  
  downloadImage(currentUrl, imageId, (localPath, error) => {
    if (localPath) {
      callback(localPath);
    } else {
      console.log(`URL ${index + 1} 失败: ${error}`);
      // 尝试下一个URL
      tryDownloadImage(urls, imageId, index + 1, callback);
    }
  });
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

  console.log(`准备下载图片到: ${localPath}`);

  // 确保目录存在
  const dir = path.dirname(localPath);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`创建目录成功: ${dir}`);
    } catch (error) {
      console.error('创建目录失败:', error);
      callback(null, `创建目录失败: ${error.message}`);
      return;
    }
  }

  const protocol = imageUrl.startsWith('https:') ? https : http;
  
  // 构建请求选项，包含可能需要的认证头
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Authorization': API_KEY // 尝试使用API密钥
    }
  };
  
  const req = protocol.get(imageUrl, options, (res) => {
    console.log(`HTTP响应状态码: ${res.statusCode}`);
    console.log(`响应头:`, res.headers);
    
    if (res.statusCode === 200) {
      const fileStream = fs.createWriteStream(localPath);
      let downloadedBytes = 0;
      
      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
      });
      
      res.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`图片下载完成: ${downloadedBytes} 字节`);
        
        // 验证文件是否存在且有内容
        if (fs.existsSync(localPath)) {
          const stats = fs.statSync(localPath);
          if (stats.size > 0) {
            console.log(`文件保存成功: ${localPath} (${stats.size} 字节)`);
            callback(relativePath);
          } else {
            console.error('下载的文件大小为0');
            callback(null, '下载的文件大小为0');
          }
        } else {
          console.error('文件保存失败，文件不存在');
          callback(null, '文件保存失败');
        }
      });
      
      fileStream.on('error', (error) => {
        console.error('文件写入失败:', error);
        callback(null, `文件写入失败: ${error.message}`);
      });
    } else if (res.statusCode === 302 || res.statusCode === 301) {
      // 处理重定向
      const redirectUrl = res.headers.location;
      console.log(`重定向到: ${redirectUrl}`);
      if (redirectUrl) {
        downloadImage(redirectUrl, imageId, callback);
      } else {
        callback(null, `重定向失败，无重定向地址`);
      }
    } else {
      console.error('图片下载失败，状态码:', res.statusCode);
      let errorBody = '';
      res.on('data', (chunk) => {
        errorBody += chunk;
      });
      res.on('end', () => {
        console.error('错误响应内容:', errorBody);
        callback(null, `HTTP错误 ${res.statusCode}: ${errorBody.substring(0, 200)}`);
      });
    }
  });

  req.on('error', (error) => {
    console.error('图片下载请求失败:', error);
    callback(null, `网络请求失败: ${error.message}`);
  });

  req.setTimeout(30000, () => {
    req.destroy();
    console.error('图片下载超时');
    callback(null, '下载超时（30秒）');
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
