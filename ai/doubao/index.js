const https = require('https');
const http = require('http');
const { IMAGE_DATA } = require('../../baibaiConfigs');
const path = require('path');
const fs = require('fs');

/**
 * 豆包 AI 图片生成插件
 * 基于火山引擎豆包模型
 */

// 从同文件夹下的.secret.json文件中获取API密钥和公网域名
let API_KEY = '';
let PUBLIC_ENDPOINT = '';
try {
  const secretPath = path.join(__dirname, '.secret.json');
  if (fs.existsSync(secretPath)) {
    const secret = JSON.parse(fs.readFileSync(secretPath, 'utf8'));
    API_KEY = secret.apiKey || '';
    PUBLIC_ENDPOINT = secret.endpoint || '';
    if (API_KEY) {
      console.log('✅ 已加载豆包 API 密钥');
    } else {
      console.log('⚠️ 未配置豆包 API 密钥，请在ai/doubao/.secret.json中添加apiKey字段');
    }
    if (PUBLIC_ENDPOINT) {
      console.log(`✅ 已加载公网访问端点: ${PUBLIC_ENDPOINT}`);
    } else {
      console.log('⚠️ 未配置公网访问端点，请在.secret.json中添加endpoint字段');
    }
  } else {
    console.log('未找到.secret.json文件，请在ai/doubao/.secret.json中配置API密钥');
  }
} catch (e) {
  console.log('读取.secret.json文件失败:', e.message);
}

const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const API_HOST = 'ark.cn-beijing.volces.com';
const API_PATH = '/api/v3/images/generations';

/**
 * 调用豆包 API 生成图片（Promise版本）
 * @param {string} prompt - 生成图片的提示词
 * @param {string|Array} imgUrl - 参考图片URL（可选）
 * @param {Object} options - 其他配置选项
 * @returns {Promise<string>} 返回Promise，resolve时传递图片路径
 */
async function callDoubaoAPI(prompt, imgUrl, options = {}) {
  if (!API_KEY) {
    throw new Error('错误：未配置豆包 API 密钥，请在ai/doubao/.secret.json中添加apiKey字段');
  }

  // 调试日志
  console.log('========== 准备调用豆包 API ==========');
  console.log('Prompt:', prompt);
  console.log('Image URL:', imgUrl);
  console.log('Options:', options);

  // 构建请求体
  const requestBody = {
    model: options.model || 'doubao-seedream-4-0-250828',
    prompt: prompt,
    response_format: options.response_format || 'url',
    size: options.size || '2K',
    stream: false, // 暂时使用非流式模式简化处理
    watermark: options.watermark !== undefined ? options.watermark : true
  };

  // 如果有参考图片，添加到请求体
  if (imgUrl) {
    if (Array.isArray(imgUrl)) {
      requestBody.image = imgUrl;
    } else {
      requestBody.image = [imgUrl];
    }
  }

  // 添加连续生成选项（如果指定）
  if (options.sequential_image_generation) {
    requestBody.sequential_image_generation = options.sequential_image_generation;
    if (options.max_images) {
      requestBody.sequential_image_generation_options = {
        max_images: options.max_images
      };
    }
  }
  
  const postData = JSON.stringify(requestBody);
  
  console.log('请求体:', JSON.stringify(requestBody, null, 2));
  console.log('========================================');

  const requestOptions = {
    hostname: API_HOST,
    port: 443,
    path: API_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', async () => {
        try {
          console.log('API 原始响应:', data);
          const response = JSON.parse(data);
          
          // 检查是否有错误
          if (response.error) {
            reject(new Error(`豆包 API 错误: ${response.error.message || JSON.stringify(response.error)}`));
            return;
          }

          // 检查是否有生成的图片
          if (response.data && response.data.length > 0) {
            console.log(`成功生成 ${response.data.length} 张图片`);
            
            // 下载所有图片
            const downloadPromises = response.data.map((item, index) => {
              if (item.url) {
                return downloadImage(item.url, `${response.created}_${index}`);
              }
              return null;
            });
            
            try {
              const localPaths = await Promise.all(downloadPromises);
              // 过滤掉 null 值
              const validPaths = localPaths.filter(p => p !== null);
              
              if (validPaths.length === 0) {
                reject(new Error('图片生成成功，但下载失败'));
                return;
              }
              
              // 返回CQ码格式的图片
              if (validPaths.length === 1) {
                resolve(`[CQ:image,file=${validPaths[0]}]`);
              } else {
                const cqCodes = validPaths.map(p => `[CQ:image,file=${p}]`).join('');
                resolve(cqCodes);
              }
            } catch (downloadError) {
              reject(new Error(`图片下载失败: ${downloadError.message}`));
            }
          } else {
            reject(new Error('API 返回成功，但没有生成图片数据'));
          }
        } catch (error) {
          console.error('解析API响应失败:', error);
          console.error('原始响应:', data);
          reject(new Error(`API响应解析失败: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('API请求失败:', error);
      reject(new Error(`网络请求失败: ${error.message}`));
    });

    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('请求超时（60秒）'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 下载图片到本地（Promise版本）
 * @param {string} imageUrl - 图片URL
 * @param {string} imageId - 图片ID
 * @returns {Promise<string>} 返回Promise，resolve时传递图片相对路径
 */
async function downloadImage(imageUrl, imageId) {
  const fileName = `doubao_${imageId}_${Date.now()}.jpg`;
  const localPath = path.join(IMAGE_DATA, 'doubao', fileName);
  const relativePath = path.join('send', 'doubao', fileName);

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
  
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = protocol.get(imageUrl, options, (res) => {
      console.log(`HTTP响应状态码: ${res.statusCode}`);
      
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
          reject(new Error(`HTTP错误 ${res.statusCode}`));
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
    
    // 在回复模式下，找到 doubao 关键词的位置
    const doubaoIndex = content.toLowerCase().indexOf('doubao');
    if (doubaoIndex !== -1) {
      // 只保留 doubao 及其后面的内容，忽略前面所有内容（包括 CQ码、@等）
      input = content.substring(doubaoIndex);
    } else {
      // 如果没有找到 doubao（理论上不应该发生），保留原有逻辑
      input = content
        .replace(replyRegex, '')
        .replace(/\[CQ:at[^\]]*\]/g, '')
        .trim();
    }
  }

  // 移除"doubao"前缀
  input = input.replace(/^doubao\s*/i, '').trim();
  
  if (!input) {
    return {
      error: '请提供图片生成提示词\n用法: doubao [提示词] [图片URL(可选)]\n或回复图片消息: doubao [提示词]'
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
 * 检查和修复图片URL
 * @param {string} url - 原始URL
 * @returns {Object} {url: 修复后的URL, isPrivate: 是否是私有域名}
 */
function fixImageUrl(url) {
  // 如果是 multimedia.nt.qq.com.cn 的URL，这种URL需要QQ认证
  // API无法直接访问，需要特殊处理
  if (url.includes('multimedia.nt.qq.com.cn')) {
    console.log('⚠️ 检测到 multimedia.nt.qq.com.cn 域名的URL，该域名需要QQ认证');
    return { url: url, isPrivate: true };
  }
  
  return { url: url, isPrivate: false };
}

/**
 * 下载私有域名图片到本地临时目录，并返回公网可访问的URL
 * @param {string} privateUrl - 私有域名的图片URL
 * @param {string} userId - 用户ID（用于文件名唯一性）
 * @returns {Promise<Object>} {publicUrl: 公网URL, localPath: 本地路径}
 */
async function downloadAndHostPrivateImage(privateUrl, userId = 'unknown') {
  if (!PUBLIC_ENDPOINT) {
    throw new Error('未配置公网访问端点，请在.secret.json中添加endpoint字段');
  }
  
  const tempDir = path.join(__dirname, '../../public/temp_doubao_images');
  
  // 确保临时目录存在
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`📁 创建临时图片目录: ${tempDir}`);
  }
  
  // 生成唯一的文件名（包含用户ID、时间戳、随机字符串和进程ID）
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10); // 8位随机字符
  const processId = process.pid; // 进程ID，防止多进程冲突
  const uniqueId = `${userId}_${timestamp}_${processId}_${randomStr}`;
  const fileName = `temp_${uniqueId}.jpg`;
  const localPath = path.join(tempDir, fileName);
  
  console.log(`📥 开始下载私有域名图片到本地...`);
  console.log(`   用户ID: ${userId}`);
  console.log(`   唯一标识: ${uniqueId}`);
  console.log(`   源URL: ${privateUrl.substring(0, 100)}...`);
  console.log(`   目标路径: ${localPath}`);
  
  return new Promise((resolve, reject) => {
    const protocol = privateUrl.startsWith('https:') ? https : http;
    
    const req = protocol.get(privateUrl, (res) => {
      // 处理重定向
      if (res.statusCode === 302 || res.statusCode === 301) {
        const redirectUrl = res.headers.location;
        console.log(`🔄 重定向到: ${redirectUrl}`);
        // 重定向时传递userId
        downloadAndHostPrivateImage(redirectUrl, userId).then(resolve).catch(reject);
        return;
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`下载失败，HTTP状态码: ${res.statusCode}`));
        return;
      }
      
      const fileStream = fs.createWriteStream(localPath);
      let downloadedBytes = 0;
      
      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
      });
      
      res.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        
        // 验证文件是否成功下载
        if (fs.existsSync(localPath)) {
          const stats = fs.statSync(localPath);
          if (stats.size > 0) {
            // 使用配置的公网域名生成URL
            const publicUrl = `${PUBLIC_ENDPOINT}/temp_doubao_images/${fileName}`;
            console.log(`✅ 图片下载成功: ${stats.size} 字节`);
            console.log(`🌐 公网URL: ${publicUrl}`);
            
            resolve({ 
              publicUrl: publicUrl, 
              localPath: localPath,
              fileName: fileName
            });
          } else {
            reject(new Error('下载的文件大小为0'));
          }
        } else {
          reject(new Error('文件保存失败'));
        }
      });
      
      fileStream.on('error', (error) => {
        reject(new Error(`文件写入失败: ${error.message}`));
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`下载请求失败: ${error.message}`));
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('下载超时（30秒）'));
    });
  });
}

/**
 * 删除临时托管的图片文件
 * @param {string} localPath - 本地文件路径
 */
function deleteTempImage(localPath) {
  try {
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      console.log(`🗑️ 已删除临时图片: ${localPath}`);
    }
  } catch (error) {
    console.error(`⚠️ 删除临时图片失败: ${error.message}`);
  }
}

/**
 * 清理过期的临时图片文件（超过1小时的文件）
 */
function cleanupOldTempImages() {
  const tempDir = path.join(__dirname, '../../public/temp_doubao_images');
  
  if (!fs.existsSync(tempDir)) {
    return;
  }
  
  try {
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1小时
    
    let deletedCount = 0;
    
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtimeMs;
      
      // 删除超过1小时的文件
      if (fileAge > oneHour) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });
    
    if (deletedCount > 0) {
      console.log(`🧹 定期清理：删除了 ${deletedCount} 个过期的临时图片文件`);
    }
  } catch (error) {
    console.error(`⚠️ 清理临时图片目录失败: ${error.message}`);
  }
}

// 启动定期清理任务（每30分钟执行一次）
setInterval(cleanupOldTempImages, 30 * 60 * 1000);
console.log('✅ 豆包临时图片定期清理任务已启动（每30分钟执行一次）');

/**
 * 从消息中提取图片URL
 * @param {Object} messageDetail - 消息详情
 * @returns {Array|null} 图片URL数组（包含 isPrivate 标志）
 */
function extractImageUrlsFromMessage(messageDetail) {
  if (!messageDetail || !messageDetail.message) {
    console.log('❌ 消息详情为空或没有message字段');
    return null;
  }

  const urls = [];
  const message = messageDetail.message;

  // 消息格式可能是数组或字符串
  if (Array.isArray(message)) {
    message.forEach((segment, index) => {
      if (segment.type === 'image' && segment.data && segment.data.url) {
        let url = segment.data.url;
        // 反转义处理
        url = url.replace(/&amp;/g, '&');
        url = url.replace(/&#44;/g, ',');
        // 检查URL
        const urlInfo = fixImageUrl(url);
        if (urlInfo.isPrivate) {
          console.log(`⚠️ 找到私有域名图片URL (消息段 ${index}):`, urlInfo.url.substring(0, 100));
        } else {
          console.log(`✅ 找到图片URL (消息段 ${index}):`, urlInfo.url);
        }
        urls.push({ url: urlInfo.url, isPrivate: urlInfo.isPrivate });
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
        // 检查URL
        const urlInfo = fixImageUrl(url);
        if (urlInfo.isPrivate) {
          console.log(`⚠️ 提取到私有域名图片URL:`, urlInfo.url.substring(0, 100));
        } else {
          console.log(`✅ 提取到图片URL:`, urlInfo.url);
        }
        urls.push({ url: urlInfo.url, isPrivate: urlInfo.isPrivate });
      }
    }
  }

  console.log(`提取完成，共找到 ${urls.length} 个图片URL`);
  return urls.length > 0 ? urls : null;
}

/**
 * 检查用户是否有权限使用豆包功能
 * @param {string} from - 用户ID
 * @param {string} groupid - 群组ID
 * @returns {boolean} 是否有权限
 */
function checkPermission(from, groupid) {
  // 白名单群组
  const allowedGroups = [577587780];
  
  // 白名单用户
  const allowedUsers = [799018865, 2408709050, 540540678];
  
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
 * 豆包主处理函数（异步版本）
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
async function doubaoReply(content, from, name, groupid, callback, groupName, nickname, message_type, port, context) {
  console.log(`豆包请求 - 用户: ${name}(${from}), 群组: ${groupid}, 内容: ${content}`);
  
  // 检查权限
  if (!checkPermission(from, groupid)) {
    callback('抱歉，您暂无权限使用豆包图片生成功能。');
    return;
  }
  
  const parseResult = parseUserInput(content);
  
  if (parseResult.error) {
    callback(parseResult.error);
    return;
  }

  const finalPrompt = parseResult.prompt;
  let finalImgUrl = parseResult.imgUrl;

  // 如果有回复消息ID，获取被回复的消息详情
  if (parseResult.replyMessageId && port) {
    try {
      console.log(`检测到回复消息 [ID: ${parseResult.replyMessageId}]，正在获取消息详情...`);
      
      const messageDetail = await getMessageDetail(parseResult.replyMessageId, port);
      
      // 从被回复的消息中提取图片URL
      const replyImageUrls = extractImageUrlsFromMessage(messageDetail);
      
      if (replyImageUrls && replyImageUrls.length > 0) {
        console.log(`✅ 从回复消息中成功提取到 ${replyImageUrls.length} 张图片`);
        
        // 检查是否有私有域名的URL
        const hasPrivateUrl = replyImageUrls.some(item => item.isPrivate);
        if (hasPrivateUrl) {
          console.log(`🔧 检测到私有域名URL，正在下载并托管到本地服务器...`);
          
          try {
            // 下载所有私有域名的图片，并记录本地路径以便后续清理
            const tempImagePaths = [];
            const processedUrls = [];
            
            for (const item of replyImageUrls) {
              if (item.isPrivate) {
                // 传递用户ID以确保文件名唯一性
                const result = await downloadAndHostPrivateImage(item.url, from);
                processedUrls.push(result.publicUrl);
                tempImagePaths.push(result.localPath);
              } else {
                processedUrls.push(item.url);
              }
            }
            
            console.log(`✅ 所有图片处理完成，共 ${processedUrls.length} 张`);
            
            // 存储临时文件路径，用于后续清理
            context._tempImagePaths = tempImagePaths;
            
            // 如果命令中没有图片，使用处理后的URL
            if (!finalImgUrl) {
              finalImgUrl = processedUrls;
            } else {
              console.log(`合并命令中的图片和回复消息中的图片`);
              if (Array.isArray(finalImgUrl)) {
                finalImgUrl = [...finalImgUrl, ...processedUrls];
              } else {
                finalImgUrl = [finalImgUrl, ...processedUrls];
              }
            }
          } catch (error) {
            console.error(`❌ 下载私有域名图片失败:`, error.message);
            callback(`❌ 下载图片失败: ${error.message}\n\n💡 建议：请直接发送图片（不要使用回复功能），格式如下：\ndoubao 提示词 [发送图片]`);
            return;
          }
        } else {
          // 没有私有域名，直接使用原始URL
          const cleanUrls = replyImageUrls.map(item => item.url);
          
          if (!finalImgUrl) {
            finalImgUrl = cleanUrls;
          } else {
            console.log(`合并命令中的图片和回复消息中的图片`);
            if (Array.isArray(finalImgUrl)) {
              finalImgUrl = [...finalImgUrl, ...cleanUrls];
            } else {
              finalImgUrl = [finalImgUrl, ...cleanUrls];
            }
          }
        }
      } else {
        console.log(`⚠️ 回复的消息中未找到图片`);
        // 回复的消息中没有图片
        if (!finalImgUrl) {
          callback('❌ 回复的消息中没有图片，无法生成图片。\n提示：请回复包含图片的消息，或直接在命令中附带图片。');
          return;
        }
      }
    } catch (error) {
      console.error('❌ 获取回复消息失败:', error.message);
      // 如果获取失败但有其他图片URL，继续执行
      if (!finalImgUrl) {
        callback(`❌ 获取回复消息失败: ${error.message}\n如果想使用参考图片，请直接发送图片或提供图片URL。`);
        return;
      }
      callback(`⚠️ 获取回复消息失败，将使用命令中提供的图片继续生成...`);
    }
  }

  // 显示处理中的消息
  let statusMessage = '🎨 正在使用豆包生成图片';
  if (finalImgUrl) {
    const imageCount = Array.isArray(finalImgUrl) ? finalImgUrl.length : 1;
    statusMessage += `（基于 ${imageCount} 张参考图）`;
  }
  statusMessage += '，请稍候...';
  callback(statusMessage);

  // 调试日志
  console.log('========== 即将调用豆包 API ==========');
  console.log('最终Prompt:', finalPrompt);
  console.log('最终Image URL:', finalImgUrl);
  console.log('===================================');

  // 调用API生成图片
  try {
    const result = await callDoubaoAPI(finalPrompt, finalImgUrl);
    callback(result);
  } catch (error) {
    console.error('豆包生成失败:', error);
    callback(`图片生成失败: ${error.message}`);
  } finally {
    // 清理临时文件
    if (context && context._tempImagePaths && context._tempImagePaths.length > 0) {
      console.log(`🧹 开始清理 ${context._tempImagePaths.length} 个临时文件...`);
      for (const tempPath of context._tempImagePaths) {
        deleteTempImage(tempPath);
      }
      delete context._tempImagePaths;
    }
  }
}

/**
 * 获取帮助信息
 * @param {Function} callback - 回调函数
 * @param {string} from - 用户ID（可选，用于权限检查）
 * @param {string} groupid - 群组ID（可选，用于权限检查）
 */
function getDoubaoHelp(callback, from = null, groupid = null) {
  let helpText = `🎨 豆包 AI 图片生成帮助

用法：
doubao [提示词] - 根据提示词生成图片
doubao [提示词] [图片URL] - 基于参考图片和提示词生成图片
doubao [提示词] [发送图片] - 基于发送的图片和提示词生成图片

示例：
doubao 一只可爱的小猫咪
doubao 美丽的风景画 https://example.com/image.jpg
doubao 动漫风格 [发送一张图片]

注意：
- 提示词建议使用中文或英文
- 支持直接发送图片或提供图片URL链接
- 图片URL需要是公网可访问的链接
- 生成过程需要一些时间，请耐心等待
- 默认生成 2K 分辨率图片
- 自动添加水印`;

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
请在 ai/doubao/.secret.json 中配置豆包API密钥`;

  callback(helpText);
}

module.exports = {
  doubaoReply,
  getDoubaoHelp
};

