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
 * 调用NanoBanana API生成图片（Promise版本）
 * @param {string} prompt - 生成图片的提示词
 * @param {string|Array} imgUrl - 参考图片URL（可选）
 * @returns {Promise<string>} 返回Promise，resolve时传递图片路径
 */
async function callNanoBananaAPI(prompt, imgUrl) {
  if (!API_KEY) {
    throw new Error('错误：未配置NanoBanana API密钥，请在ai/banana/.secret.json中添加配置');
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

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', async () => {
        try {
          const response = JSON.parse(data);
          
          if (response.code === 200 && response.data && response.data.id) {
            console.log('图片生成API响应成功:', response);
            
            // 使用图片详情查询接口获取真正的图片URL
            try {
              const imageUrl = await getImageDetail(response.data.id);
              console.log(`获取到图片URL: ${imageUrl}`);
              
              // 下载图片到本地
              try {
                const localPath = await downloadImage(imageUrl, response.data.id);
                resolve(`[CQ:image,file=${localPath}]`);
              } catch (downloadError) {
                let errorMsg = `图片生成成功，但下载失败。图片ID: ${response.data.id}`;
                errorMsg += `\n下载错误: ${downloadError}`;
                errorMsg += `\n图片URL: ${imageUrl}`;
                reject(new Error(errorMsg));
              }
            } catch (error) {
              let errorMsg = `图片生成成功，但获取图片URL失败。图片ID: ${response.data.id}`;
              errorMsg += `\n错误详情: ${error.message}`;
              reject(new Error(errorMsg));
            }
          } else {
            reject(new Error(`API调用失败: ${response.msg || '未知错误'}`));
          }
        } catch (error) {
          console.error('解析API响应失败:', error);
          reject(new Error('API响应解析失败，请稍后重试'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('API请求失败:', error);
      reject(new Error('网络请求失败，请稍后重试'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 获取图片详情，包含真正的图片下载URL（Promise版本）
 * @param {string} imageId - 图片ID
 * @param {number} maxRetries - 最大重试次数，默认30次（60秒）
 * @returns {Promise<string>} 返回Promise，resolve时传递图片URL
 */
async function getImageDetail(imageId, maxRetries = 30) {
  if (!API_KEY) {
    throw new Error('未配置API密钥');
  }

  const detailUrl = `https://api.wuyinkeji.com/api/img/drawDetail?id=${imageId}`;
  console.log(`查询图片详情: ${detailUrl}`);

  const options = {
    hostname: 'api.wuyinkeji.com',
    port: 443,
    path: `/api/img/drawDetail?id=${imageId}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      'Authorization': API_KEY
    }
  };

  // 使用循环和 Promise 替代递归回调
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              resolve(response);
            } catch (error) {
              reject(new Error(`解析响应失败: ${error.message}`));
            }
          });
        });

        req.on('error', (error) => {
          reject(new Error(`网络请求失败: ${error.message}`));
        });

        req.setTimeout(10000, () => {
          req.destroy();
          reject(new Error('请求超时'));
        });

        req.end();
      });

      console.log('图片详情API响应:', response);
      
      if (response.code === 200 && response.data) {
        // 检查图片状态
        if (response.data.status === 2 && response.data.image_url) {
          // 状态2表示成功，返回图片URL
          return response.data.image_url;
        } else if (response.data.status === 0 || response.data.status === 1) {
          // 状态0:排队中，状态1:生成中，需要等待
          console.log(`图片还在处理中，状态: ${response.data.status}，等待2秒后重试 (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
          continue; // 继续下一次循环
        } else if (response.data.status === 3) {
          // 状态3表示失败
          throw new Error('图片生成失败');
        } else {
          throw new Error(`未知状态: ${response.data.status}`);
        }
      } else {
        throw new Error(`获取图片详情失败: ${response.msg || '未知错误'}`);
      }
    } catch (error) {
      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries - 1) {
        throw error;
      }
      // 否则继续重试
      console.error('图片详情请求失败，重试中:', error.message);
    }
  }

  throw new Error('获取图片详情超时，已达到最大重试次数');
}


/**
 * 下载图片到本地（Promise版本）
 * @param {string} imageUrl - 图片URL
 * @param {string} imageId - 图片ID
 * @returns {Promise<string>} 返回Promise，resolve时传递图片相对路径
 */
async function downloadImage(imageUrl, imageId) {
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
      throw new Error(`创建目录失败: ${error.message}`);
    }
  }

  const protocol = imageUrl.startsWith('https:') ? https : http;
  
  // 构建请求选项
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  };
  
  return new Promise((resolve, reject) => {
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
              resolve(relativePath);
            } else {
              console.error('下载的文件大小为0');
              reject(new Error('下载的文件大小为0'));
            }
          } else {
            console.error('文件保存失败，文件不存在');
            reject(new Error('文件保存失败'));
          }
        });
        
        fileStream.on('error', (error) => {
          console.error('文件写入失败:', error);
          reject(new Error(`文件写入失败: ${error.message}`));
        });
      } else if (res.statusCode === 302 || res.statusCode === 301) {
        // 处理重定向
        const redirectUrl = res.headers.location;
        console.log(`重定向到: ${redirectUrl}`);
        if (redirectUrl) {
          // 递归下载重定向后的URL
          downloadImage(redirectUrl, imageId).then(resolve).catch(reject);
        } else {
          reject(new Error('重定向失败，无重定向地址'));
        }
      } else {
        console.error('图片下载失败，状态码:', res.statusCode);
        let errorBody = '';
        res.on('data', (chunk) => {
          errorBody += chunk;
        });
        res.on('end', () => {
          console.error('错误响应内容:', errorBody);
          reject(new Error(`HTTP错误 ${res.statusCode}: ${errorBody.substring(0, 200)}`));
        });
      }
    });

    req.on('error', (error) => {
      console.error('图片下载请求失败:', error);
      reject(new Error(`网络请求失败: ${error.message}`));
    });

    req.setTimeout(30000, () => {
      req.destroy();
      console.error('图片下载超时');
      reject(new Error('下载超时（30秒）'));
    });
  });
}

/**
 * 解析用户输入，提取提示词和图片URL
 * @param {string} content - 用户输入内容
 * @returns {Object} 解析结果 {prompt, imgUrl, replyMessageId}
 */
function parseUserInput(content) {
  let input = content;
  let replyMessageId = null;

  // 检查是否包含回复CQ码 [CQ:reply,id=xxx]
  const replyRegex = /\[CQ:reply,id=(-?\d+)\]/;
  const replyMatch = content.match(replyRegex);
  
  if (replyMatch && replyMatch[1]) {
    replyMessageId = replyMatch[1];
    console.log(`检测到回复消息，消息ID: ${replyMessageId}`);
    
    // 在回复模式下，找到 banana 关键词的位置
    const bananaIndex = content.toLowerCase().indexOf('banana');
    if (bananaIndex !== -1) {
      // 只保留 banana 及其后面的内容，忽略前面所有内容（包括 CQ码、@等）
      input = content.substring(bananaIndex);
    } else {
      // 如果没有找到 banana（理论上不应该发生），保留原有逻辑
      input = content
        .replace(replyRegex, '')
        .replace(/\[CQ:at[^\]]*\]/g, '')
        .trim();
    }
  }

  // 移除"banana"前缀
  input = input.replace(/^banana\s*/i, '').trim();

  // 调试日志（可选）
  // console.log('解析输入:', content)
  
  if (!input) {
    return {
      error: '请提供图片生成提示词\n用法: banana [提示词] [图片URL(可选)]\n或回复图片消息: banana [提示词]'
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
  // console.log('解析结果 - 提示词:', prompt, '图片URL:', imgUrl, '回复消息ID:', replyMessageId)

  return {
    prompt: prompt,
    imgUrl: imgUrl,
    replyMessageId: replyMessageId
  };
}

/**
 * 获取消息详情
 * @param {string} messageId - 消息ID
 * @param {string} botName - bot名称
 * @returns {Promise<Object>} 消息详情
 */
async function getMessageDetail(messageId, botName) {
  try {
    // 动态导入 createAction 以避免循环依赖
    // 路径: ai/banana/index.js -> reverseWsUtils/manager/actionManager.js
    const { createAction } = require('../../reverseWsUtils/manager/actionManager');
    
    console.log(`正在获取消息详情，消息ID: ${messageId}, bot: ${botName}`);
    
    const messageDetail = await createAction({
      "action": "get_msg",
      "params": {
        "message_id": messageId
      }
    }, botName);
    
    console.log('获取到消息详情:', JSON.stringify(messageDetail));
    return messageDetail;
  } catch (error) {
    console.error('获取消息详情失败:', error);
    throw new Error(`获取消息详情失败: ${error.message}`);
  }
}

/**
 * 从消息中提取图片URL
 * @param {Object} messageDetail - 消息详情
 * @returns {Array|null} 图片URL数组
 */
function extractImageUrlsFromMessage(messageDetail) {
  if (!messageDetail || !messageDetail.message) {
    return null;
  }

  const urls = [];
  const message = messageDetail.message;

  // 消息格式可能是数组或字符串
  if (Array.isArray(message)) {
    // 数组格式
    message.forEach(segment => {
      if (segment.type === 'image' && segment.data && segment.data.url) {
        let url = segment.data.url;
        // 反转义处理
        url = url.replace(/&amp;/g, '&');
        url = url.replace(/&#44;/g, ',');
        urls.push(url);
      }
    });
  } else if (typeof message === 'string') {
    // 字符串格式，提取CQ码
    const cqImageRegex = /\[CQ:image[^\]]*url=([^,\]]+)[^\]]*\]/g;
    let match;
    while ((match = cqImageRegex.exec(message)) !== null) {
      if (match[1]) {
        let url = match[1];
        url = url.replace(/&amp;/g, '&');
        url = url.replace(/&#44;/g, ',');
        urls.push(url);
      }
    }
  }

  return urls.length > 0 ? urls : null;
}

/**
 * 检查用户是否有权限使用NanoBanana功能
 * @param {string} from - 用户ID
 * @param {string} groupid - 群组ID
 * @returns {boolean} 是否有权限
 */
function checkPermission(from, groupid) {
  // 白名单群组
  const allowedGroups = [577587780];
  
  // 白名单用户
  const allowedUsers = [799018865, 2408709050];
  
  // 转换为数字进行比较
  const fromId = parseInt(from);
  const groupId = parseInt(groupid);
  
  // 检查是否在白名单群组中
  if (allowedGroups.includes(groupId)) {
    return true;
  }
  
  // 检查是否是白名单用户
  if (allowedUsers.includes(fromId)) {
    return true;
  }
  
  return false;
}

/**
 * NanoBanana主处理函数（异步版本）
 * @param {string} content - 用户输入内容
 * @param {string} from - 用户ID
 * @param {string} name - 用户名称
 * @param {string} groupid - 群组ID
 * @param {Function} callback - 回调函数
 * @param {string} groupName - 群组名称（可选）
 * @param {string} nickname - 用户昵称（可选）
 * @param {string} message_type - 消息类型（可选）
 * @param {string} port - 端口/bot名称（可选）
 * @param {Object} context - 消息上下文（可选）
 */
async function nanoBananaReply(content, from, name, groupid, callback, groupName, nickname, message_type, port, context) {
  console.log(`NanoBanana请求 - 用户: ${name}(${from}), 群组: ${groupid}, 内容: ${content}`);
  
  // 检查权限
  if (!checkPermission(from, groupid)) {
    callback('抱歉，您暂无权限使用NanoBanana图片生成功能。');
    return;
  }
  
  const parseResult = parseUserInput(content);
  
  if (parseResult.error) {
    callback(parseResult.error);
    return;
  }

  let finalImgUrl = parseResult.imgUrl;

  // 如果有回复消息ID，获取被回复的消息详情
  if (parseResult.replyMessageId && port) {
    try {
      console.log(`检测到回复消息，尝试获取消息详情...`);
      const messageDetail = await getMessageDetail(parseResult.replyMessageId, port);
      
      // 从被回复的消息中提取图片URL
      const replyImageUrls = extractImageUrlsFromMessage(messageDetail);
      
      if (replyImageUrls && replyImageUrls.length > 0) {
        console.log(`从回复消息中提取到 ${replyImageUrls.length} 张图片`);
        // 如果命令中没有图片，使用回复消息中的图片
        if (!finalImgUrl) {
          finalImgUrl = replyImageUrls;
        } else {
          // 如果命令中有图片，合并两者
          if (Array.isArray(finalImgUrl)) {
            finalImgUrl = [...finalImgUrl, ...replyImageUrls];
          } else {
            finalImgUrl = [finalImgUrl, ...replyImageUrls];
          }
        }
      } else {
        // 回复的消息中没有图片
        if (!finalImgUrl) {
          callback('❌ 回复的消息中没有图片，无法生成图片。\n提示：请回复包含图片的消息，或直接在命令中附带图片。');
          return;
        }
      }
    } catch (error) {
      console.error('获取回复消息失败:', error);
      // 如果获取失败但有其他图片URL，继续执行
      if (!finalImgUrl) {
        callback(`❌ 获取回复消息失败: ${error.message}\n如果想使用参考图片，请直接发送图片或提供图片URL。`);
        return;
      }
      callback(`⚠️ 获取回复消息失败，将使用命令中提供的图片继续生成...`);
    }
  }

  // 显示处理中的消息
  if (finalImgUrl) {
    const imageCount = Array.isArray(finalImgUrl) ? finalImgUrl.length : 1;
    callback(`🎨 正在使用NanoBanana基于 ${imageCount} 张参考图生成图片，请稍候...`);
  } else {
    callback('🎨 正在使用NanoBanana生成图片，请稍候...');
  }

  // 调用API生成图片（使用 Promise 版本）
  try {
    const result = await callNanoBananaAPI(parseResult.prompt, finalImgUrl);
    callback(result);
  } catch (error) {
    console.error('NanoBanana生成失败:', error);
    callback(`图片生成失败: ${error.message}`);
  }
}

/**
 * 获取帮助信息
 * @param {Function} callback - 回调函数
 * @param {string} from - 用户ID（可选，用于权限检查）
 * @param {string} groupid - 群组ID（可选，用于权限检查）
 */
function getNanoBananaHelp(callback, from = null, groupid = null) {
  let helpText = `🍌 NanoBanana AI图片生成帮助

用法：
banana [提示词] - 根据提示词生成图片
banana [提示词] [图片URL] - 基于参考图片和提示词生成图片
banana [提示词] [发送图片] - 基于发送的图片和提示词生成图片
回复图片消息 + banana [提示词] - 基于回复的图片生成新图片

示例：
banana 一只可爱的小猫咪
banana 美丽的风景画 https://example.com/image.jpg
banana 动漫风格 [发送一张图片]
[回复一张图片] banana 转换成油画风格

注意：
- 提示词建议使用中文或英文
- 支持直接发送图片或提供图片URL链接
- 支持回复消息功能，回复图片消息时会使用该图片作为参考图
- 如果回复的消息中没有图片，将拒绝生成以节省API用量
- 图片URL需要是公网可访问的链接
- 生成过程需要一些时间，请耐心等待`;

  // 如果提供了用户信息，检查权限并添加相应说明
  if (from !== null && groupid !== null) {
    if (checkPermission(from, groupid)) {
      helpText += `

✅ 权限状态：您有权限使用此功能`;
    } else {
      helpText += `

❌ 权限状态：您暂无权限使用此功能
此功能仅限特定群组和用户使用`;
    }
  } else {
    helpText += `

权限说明：
此功能仅限特定群组和用户使用`;
  }

  helpText += `

配置：
请在 ai/banana/.secret.json 中配置API密钥`;

  callback(helpText);
}

module.exports = {
  nanoBananaReply,
  getNanoBananaHelp
};
