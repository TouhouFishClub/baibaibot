const https = require('https');
const http = require('http');
const { IMAGE_DATA, myip } = require('../../baibaiConfigs');
const path = require('path');
const fs = require('fs');

/**
 * NanoBanana AI图片生成插件
 * 基于速创API的NanoBanana模型
 */

// 从.secret.json文件中获取API密钥和公网域名
let API_KEY = '';
let PUBLIC_ENDPOINT = '';
try {
  const secretPath = path.join(__dirname, '.secret.json');
  if (fs.existsSync(secretPath)) {
    const secret = JSON.parse(fs.readFileSync(secretPath, 'utf8'));
    API_KEY = secret.apiKey || '';
    PUBLIC_ENDPOINT = secret.endpoint || '';
    if (PUBLIC_ENDPOINT) {
      console.log(`✅ 已加载公网访问端点: ${PUBLIC_ENDPOINT}`);
    } else {
      console.log('⚠️ 未配置公网访问端点，请在.secret.json中添加endpoint字段');
    }
  } else {
    console.log('未找到.secret.json文件，请在ai/banana/.secret.json中配置API密钥');
  }
} catch (e) {
  console.log('读取.secret.json文件失败:', e.message);
}

// 加载预置prompt配置
let PRESETS_CONFIG = null;
try {
  const presetsPath = path.join(__dirname, 'presets.json');
  if (fs.existsSync(presetsPath)) {
    PRESETS_CONFIG = JSON.parse(fs.readFileSync(presetsPath, 'utf8'));
    const presetsCount = Object.keys(PRESETS_CONFIG).length;
    console.log(`加载预置prompt配置成功，共 ${presetsCount} 个预设`);
  } else {
    console.log('未找到presets.json文件，预置prompt功能将不可用');
  }
} catch (e) {
  console.log('读取presets.json文件失败:', e.message);
}

const API_URL = 'https://api.wuyinkeji.com/api/img/nanoBanana';
const API_URL_PRO = 'https://api.wuyinkeji.com/api/img/nanoBanana-pro';

/**
 * 调用NanoBanana API生成图片（Promise版本）
 * @param {string} prompt - 生成图片的提示词
 * @param {string|Array} imgUrl - 参考图片URL（可选）
 * @param {boolean} isPro - 是否使用Pro版本（默认false）
 * @returns {Promise<string>} 返回Promise，resolve时传递图片路径
 */
async function callNanoBananaAPI(prompt, imgUrl, isPro = false) {
  if (!API_KEY) {
    throw new Error('错误：未配置NanoBanana API密钥，请在ai/banana/.secret.json中添加配置');
  }

  const apiPath = isPro ? '/api/img/nanoBanana-pro' : '/api/img/nanoBanana';
  const modelName = isPro ? 'nano-banana-pro' : 'nano-banana';
  const versionText = isPro ? 'Pro' : '标准';

  // 调试日志：打印即将发送的参数
  console.log(`========== 准备调用NanoBanana API (${versionText}版) ==========`);
  console.log('Prompt:', prompt);
  console.log('Image URL:', imgUrl);
  console.log('Image URL 类型:', Array.isArray(imgUrl) ? '数组' : typeof imgUrl);
  if (Array.isArray(imgUrl)) {
    console.log('Image URL 数量:', imgUrl.length);
    imgUrl.forEach((url, index) => {
      console.log(`  [${index}]:`, url.substring(0, 100) + (url.length > 100 ? '...' : ''));
      console.log(`  [${index}] 完整URL:`, url);
    });
  } else if (imgUrl) {
    console.log('完整URL:', imgUrl);
  }

  // 构建请求体
  // 注意：Pro版本不需要model参数，标准版需要model参数
  const requestBody = isPro ? { prompt: prompt } : { model: modelName, prompt: prompt };
  
  // 只在imgUrl有效时才添加img_url字段
  if (imgUrl) {
    requestBody.img_url = imgUrl;
  }
  
  const postData = JSON.stringify(requestBody);
  
  console.log('POST数据长度:', postData.length, '字节');
  console.log('JSON对象:', JSON.stringify(requestBody, null, 2).substring(0, 500));
  console.log('========================================');

  const options = {
    hostname: 'api.wuyinkeji.com',
    port: 443,
    path: apiPath,
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
              const imageUrl = await getImageDetail(response.data.id, isPro);
              console.log(`获取到图片URL: ${imageUrl}`);
              
              // 下载图片到本地
              try {
                const localPath = await downloadImage(imageUrl, response.data.id, 'nanoBanana');
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
 * @param {boolean} isPro - 是否为Pro版本（Pro版本轮询间隔更长）
 * @returns {Promise<string>} 返回Promise，resolve时传递图片URL
 */
async function getImageDetail(imageId, isPro = false) {
  if (!API_KEY) {
    throw new Error('未配置API密钥');
  }

  // Pro版本：5秒轮询一次，最大等待5分钟（60次）
  // 标准版本：2秒轮询一次，最大等待1分钟（30次）
  const pollInterval = isPro ? 5000 : 2000;
  const maxRetries = isPro ? 60 : 30;
  const versionText = isPro ? 'Pro' : '标准';

  const detailUrl = `https://api.wuyinkeji.com/api/img/drawDetail?id=${imageId}`;
  console.log(`查询图片详情 (${versionText}版): ${detailUrl}`);
  console.log(`轮询策略: 每${pollInterval/1000}秒查询一次，最多等待${maxRetries * pollInterval / 1000}秒`);

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

      // console.log('图片详情API响应:', response);
      
      if (response.code === 200 && response.data) {
        // 检查图片状态
        if (response.data.status === 2 && response.data.image_url) {
          // 状态2表示成功，返回图片URL
          return response.data.image_url;
        } else if (response.data.status === 3) {
          // 状态3表示失败，立即抛出错误，不再重试
          const failReason = response.data.fail_reason || '未知原因';
          console.error(`❌ 图片生成失败: ${failReason}`);
          throw new Error(`图片生成失败: ${failReason}`);
        } else if (response.data.status === 0 || response.data.status === 1) {
          // 状态0:排队中，状态1:生成中，需要等待
          console.log(`图片还在处理中，状态: ${response.data.status}，等待${pollInterval/1000}秒后重试 (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, pollInterval)); // 等待指定时间
          continue; // 继续下一次循环
        } else {
          throw new Error(`未知状态: ${response.data.status}`);
        }
      } else {
        throw new Error(`获取图片详情失败: ${response.msg || '未知错误'}`);
      }
    } catch (error) {
      // 如果错误消息包含"图片生成失败"，说明是status===3的失败，不应该重试
      if (error.message && error.message.includes('图片生成失败')) {
        throw error; // 立即抛出，不重试
      }
      
      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries - 1) {
        throw error;
      }
      // 否则继续重试（仅针对网络错误等临时性错误）
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
async function downloadImage(imageUrl, imageId, modelFolder = 'nanoBanana') {
  const fileName = `${modelFolder}_${imageId}_${Date.now()}.jpg`;
  const localPath = path.join(IMAGE_DATA, modelFolder, fileName);
  const relativePath = path.join('send', modelFolder, fileName);

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
 * 检查并应用预置prompt
 * @param {string} userPrompt - 用户输入的提示词
 * @returns {Object} {prompt: 最终使用的prompt, isPreset: 是否使用了预设, presetName: 预设名称}
 */
function applyPresetPrompt(userPrompt) {
  // 如果没有加载配置，直接返回原始prompt
  if (!PRESETS_CONFIG) {
    console.log('⚠️ 预置配置未加载');
    return { prompt: userPrompt, isPreset: false };
  }

  // 不区分大小写进行匹配
  const userPromptLower = userPrompt.toLowerCase().trim();
  
  console.log(`🔍 尝试匹配预置prompt: "${userPrompt}" (标准化后: "${userPromptLower}")`);
  
  // 遍历所有预设 key
  for (const presetKey in PRESETS_CONFIG) {
    const presetKeyLower = presetKey.toLowerCase();
    
    // 调试：显示比较过程
    // console.log(`   比较: "${userPromptLower}" === "${presetKeyLower}" ? ${userPromptLower === presetKeyLower}`);
    
    // 完全匹配
    if (userPromptLower === presetKeyLower) {
      console.log(`✅ 匹配到预置prompt: "${presetKey}"`);
      return {
        prompt: PRESETS_CONFIG[presetKey],
        isPreset: true,
        presetName: presetKey
      };
    }
  }
  
  // 没有匹配到任何预设，返回原始prompt
  console.log(`❌ 未匹配到预置prompt，使用原始提示词`);
  return { prompt: userPrompt, isPreset: false };
}

/**
 * 解析用户输入，提取提示词和图片URL
 * @param {string} content - 用户输入内容
 * @param {boolean} isPro - 是否是Pro版本（用于识别nbp）
 * @returns {Object} 解析结果 {prompt, imgUrl, replyMessageId}
 */
function parseUserInput(content, isPro = false) {
  let input = content;
  let replyMessageId = null;

  // 检查是否包含回复CQ码 [CQ:reply,id=xxx]
  const replyRegex = /\[CQ:reply,id=(-?\d+)\]/;
  const replyMatch = content.match(replyRegex);
  
  if (replyMatch && replyMatch[1]) {
    replyMessageId = replyMatch[1];
    console.log(`检测到回复消息，消息ID: ${replyMessageId}`);
    
    // 在回复模式下，找到 banana、nbp 或 nb 关键词的位置
    const lowerContent = content.toLowerCase();
    const bananaIndex = lowerContent.indexOf('banana');
    const nbpIndex = lowerContent.indexOf('nbp');
    const nbIndex = lowerContent.indexOf('nb');
    
    // 使用最早出现的关键词位置
    let keywordIndex = -1;
    const indices = [];
    if (bananaIndex !== -1) indices.push(bananaIndex);
    if (nbpIndex !== -1) indices.push(nbpIndex);
    if (nbIndex !== -1) indices.push(nbIndex);
    
    if (indices.length > 0) {
      keywordIndex = Math.min(...indices);
    }
    
    if (keywordIndex !== -1) {
      // 只保留关键词及其后面的内容，忽略前面所有内容（包括 CQ码、@等）
      input = content.substring(keywordIndex);
    } else {
      // 如果没有找到关键词（理论上不应该发生），保留原有逻辑
      input = content
        .replace(replyRegex, '')
        .replace(/\[CQ:at[^\]]*\]/g, '')
        .trim();
    }
  }

  // 移除"banana"、"nbp"或"nb"前缀（注意顺序：先匹配长的）
  if (isPro) {
    input = input.replace(/^(banana|nbp)\s*/i, '').trim();
  } else {
    input = input.replace(/^(banana|nb)\s*/i, '').trim();
  }

  // 调试日志（可选）
  // console.log('解析输入:', content)
  
  if (!input) {
    return {
      error: '请提供图片生成提示词\n用法: banana/nb/nbp [提示词] [图片URL(可选)]\n或回复图片消息: banana/nb/nbp [提示词]\n注：nbp为Pro增强版'
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
  
  const tempDir = path.join(__dirname, '../../public/temp_banana_images');
  
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
            const publicUrl = `${PUBLIC_ENDPOINT}/temp_banana_images/${fileName}`;
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
  const tempDir = path.join(__dirname, '../../public/temp_banana_images');
  
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
console.log('✅ NanoBanana临时图片定期清理任务已启动（每30分钟执行一次）');

/**
 * 处理URL数组，检查并转换私有域名图片为公网可访问URL
 * @param {Array|string} urls - URL数组或单个URL
 * @param {string} userId - 用户ID（用于文件名唯一性）
 * @returns {Promise<Object>} {processedUrls: 处理后的URL数组, tempPaths: 临时文件路径数组}
 */
async function processImageUrls(urls, userId) {
  // 统一转为数组处理
  const urlArray = Array.isArray(urls) ? urls : [urls];
  const processedUrls = [];
  const tempPaths = [];
  
  console.log(`🔍 开始处理 ${urlArray.length} 个图片URL...`);
  
  // 按顺序处理每个URL（保持顺序很重要！）
  for (let i = 0; i < urlArray.length; i++) {
    const url = urlArray[i];
    const urlInfo = fixImageUrl(url);
    
    console.log(`   [${i + 1}/${urlArray.length}] 处理URL: ${urlInfo.url.substring(0, 80)}...`);
    
    if (urlInfo.isPrivate) {
      console.log(`      ⚠️ 检测到私有域名 (multimedia.nt.qq.com.cn)，需要下载并临时发布`);
      try {
        const result = await downloadAndHostPrivateImage(urlInfo.url, userId);
        processedUrls.push(result.publicUrl);
        tempPaths.push(result.localPath);
        console.log(`      ✅ 转换完成: ${result.publicUrl}`);
      } catch (error) {
        console.error(`      ❌ 处理失败: ${error.message}`);
        throw new Error(`处理第 ${i + 1} 张图片失败: ${error.message}`);
      }
    } else {
      console.log(`      ✅ 公网URL，直接使用`);
      processedUrls.push(urlInfo.url);
    }
  }
  
  console.log(`✅ 所有图片URL处理完成，共 ${processedUrls.length} 个`);
  
  return {
    processedUrls: processedUrls,
    tempPaths: tempPaths
  };
}

/**
 * 从消息中提取图片URL
 * @param {Object} messageDetail - 消息详情
 * @returns {Array|null} 图片URL数组
 */
function extractImageUrlsFromMessage(messageDetail) {
  // console.log('========== 开始提取图片URL ==========');
  // console.log('消息详情完整内容:', JSON.stringify(messageDetail, null, 2));
  
  if (!messageDetail || !messageDetail.message) {
    console.log('❌ 消息详情为空或没有message字段');
    return null;
  }

  const urls = [];
  const message = messageDetail.message;
  
  // console.log('消息类型:', Array.isArray(message) ? '数组' : typeof message);
  // console.log('消息内容:', JSON.stringify(message, null, 2));

  // 消息格式可能是数组或字符串
  if (Array.isArray(message)) {
    // 数组格式
    // console.log(`消息段数量: ${message.length}`);
    message.forEach((segment, index) => {
      // console.log(`消息段 ${index}:`, JSON.stringify(segment));
      if (segment.type === 'image' && segment.data && segment.data.url) {
        let url = segment.data.url;
        // 反转义处理
        url = url.replace(/&amp;/g, '&');
        url = url.replace(/&#44;/g, ',');
        console.log(`✅ 找到图片URL (消息段 ${index}):`, url.substring(0, 100) + (url.length > 100 ? '...' : ''));
        urls.push(url);
      }
    });
  } else if (typeof message === 'string') {
    // 字符串格式，提取CQ码
    // console.log('尝试从字符串中提取CQ图片码...');
    const cqImageRegex = /\[CQ:image[^\]]*url=([^,\]]+)[^\]]*\]/g;
    let match;
    // let matchCount = 0;
    while ((match = cqImageRegex.exec(message)) !== null) {
      // matchCount++;
      // console.log(`CQ图片码匹配 ${matchCount}:`, match[0]);
      if (match[1]) {
        let url = match[1];
        url = url.replace(/&amp;/g, '&');
        url = url.replace(/&#44;/g, ',');
        console.log(`✅ 提取到图片URL:`, url.substring(0, 100) + (url.length > 100 ? '...' : ''));
        urls.push(url);
      }
    }
    // if (matchCount === 0) {
    //   console.log('⚠️ 未找到任何CQ图片码匹配');
    // }
  }

  console.log(`提取完成，共找到 ${urls.length} 个图片URL`);
  // if (urls.length > 0) {
  //   console.log('提取到的所有图片URL:', urls);
  // } else {
  //   console.log('❌ 未提取到任何图片URL');
  // }
  
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
  const allowedGroups = [577587780, 648050368];
  
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
 * @param {boolean} isPro - 是否使用Pro版本（可选，默认false）
 */
async function nanoBananaReply(content, from, name, groupid, callback, groupName, nickname, message_type, port, context, isPro = false) {
  const versionText = isPro ? 'Pro' : '标准';
  console.log(`NanoBanana请求 (${versionText}版) - 用户: ${name}(${from}), 群组: ${groupid}, 内容: ${content}`);
  
  // 检查权限（无权限时静默返回，不回复提示）
  if (!checkPermission(from, groupid)) {
    console.log(`用户 ${name}(${from}) 无权限使用NanoBanana功能`);
    return;
  }
  
  const parseResult = parseUserInput(content, isPro);
  
  if (parseResult.error) {
    callback(parseResult.error);
    return;
  }

  // 应用预置prompt
  const presetResult = applyPresetPrompt(parseResult.prompt);
  const finalPrompt = presetResult.prompt;
  
  if (presetResult.isPreset) {
    console.log(`使用预置prompt: ${presetResult.presetName}`);
  }

  let finalImgUrl = parseResult.imgUrl;
  let allTempPaths = []; // 收集所有需要清理的临时文件路径

  // 第一步：处理命令中的图片URL（如果有）
  if (finalImgUrl) {
    try {
      console.log(`📷 检测到命令中包含图片，开始检查并处理...`);
      const result = await processImageUrls(finalImgUrl, from);
      finalImgUrl = result.processedUrls;
      allTempPaths.push(...result.tempPaths);
      console.log(`✅ 命令中的图片处理完成`);
    } catch (error) {
      console.error(`❌ 处理命令中的图片失败:`, error.message);
      callback(`❌ 处理图片失败: ${error.message}`);
      // 清理已下载的临时文件
      for (const tempPath of allTempPaths) {
        deleteTempImage(tempPath);
      }
      return;
    }
  }

  // 第二步：如果有回复消息ID，获取被回复的消息详情
  if (parseResult.replyMessageId && port) {
    try {
      console.log(`检测到回复消息 [ID: ${parseResult.replyMessageId}]，正在获取消息详情...`);
      
      const messageDetail = await getMessageDetail(parseResult.replyMessageId, port);
      
      // 从被回复的消息中提取图片URL
      const replyImageUrls = extractImageUrlsFromMessage(messageDetail);
      
      if (replyImageUrls && replyImageUrls.length > 0) {
        console.log(`✅ 从回复消息中成功提取到 ${replyImageUrls.length} 张图片`);
        
        try {
          // 处理回复消息中的图片URL
          const result = await processImageUrls(replyImageUrls, from);
          const processedReplyUrls = result.processedUrls;
          allTempPaths.push(...result.tempPaths);
          
          // 合并命令中的图片和回复消息中的图片
          if (!finalImgUrl) {
            finalImgUrl = processedReplyUrls;
          } else {
            console.log(`合并命令中的图片和回复消息中的图片`);
            // finalImgUrl 已经是数组（经过 processImageUrls 处理）
            finalImgUrl = [...finalImgUrl, ...processedReplyUrls];
          }
          
          console.log(`✅ 回复消息中的图片处理完成`);
        } catch (error) {
          console.error(`❌ 处理回复消息中的图片失败:`, error.message);
          callback(`❌ 处理图片失败: ${error.message}`);
          // 清理已下载的临时文件
          for (const tempPath of allTempPaths) {
            deleteTempImage(tempPath);
          }
          return;
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
        // 清理已下载的临时文件
        for (const tempPath of allTempPaths) {
          deleteTempImage(tempPath);
        }
        return;
      }
      callback(`⚠️ 获取回复消息失败，将使用命令中提供的图片继续生成...`);
    }
  }

  // 存储临时文件路径到context，用于finally块清理
  if (allTempPaths.length > 0) {
    context._tempImagePaths = allTempPaths;
  }

  // 显示处理中的消息
  let statusMessage = isPro ? '🎨 正在使用NanoBanana Pro' : '🎨 正在使用NanoBanana';
  if (presetResult.isPreset) {
    statusMessage += `[${presetResult.presetName}]`;
  }
  if (finalImgUrl) {
    const imageCount = Array.isArray(finalImgUrl) ? finalImgUrl.length : 1;
    statusMessage += `基于 ${imageCount} 张参考图生成图片，请稍候...`;
  } else {
    statusMessage += '生成图片，请稍候...';
  }
  callback(statusMessage);

  // 调试日志：确认最终参数
  console.log('========== 即将调用API ==========');
  console.log('版本:', isPro ? 'Pro' : '标准');
  console.log('最终Prompt:', finalPrompt.substring(0, 200) + (finalPrompt.length > 200 ? '...' : ''));
  console.log('最终Image URL:', finalImgUrl ? (Array.isArray(finalImgUrl) ? `数组(${finalImgUrl.length}个)` : '单个URL') : '无');
  if (finalImgUrl) {
    console.log('详细URL信息:', JSON.stringify(finalImgUrl).substring(0, 300));
  }
  console.log('===================================');

  // 调用API生成图片（使用 Promise 版本，使用最终的prompt）
  try {
    const result = await callNanoBananaAPI(finalPrompt, finalImgUrl, isPro);
    callback(result);
  } catch (error) {
    console.error('NanoBanana生成失败:', error);
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
 * 获取预置词条列表
 * @param {Function} callback - 回调函数
 */
function getNanoBananaPresets(callback) {
  if (!PRESETS_CONFIG || Object.keys(PRESETS_CONFIG).length === 0) {
    callback('❌ 暂无可用的预置效果');
    return;
  }

  const presetKeys = Object.keys(PRESETS_CONFIG);
  const total = presetKeys.length;
  
  let message = `🎨 NanoBanana 内置词条列表\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `共 ${total} 个预置效果\n\n`;
  
  // 简单列出所有词条，每行5个
  const columns = 5;
  for (let i = 0; i < presetKeys.length; i++) {
    if (i % columns === 0 && i > 0) {
      message += `\n`;
    }
    message += `${presetKeys[i]}`;
    if ((i + 1) % columns !== 0 && i !== presetKeys.length - 1) {
      message += ` | `;
    }
  }
  
  message += `\n\n━━━━━━━━━━━━━━━━━━\n`;
  message += `使用方法：\n`;
  message += `回复图片 + banana/nb/nbp [词条名]\n`;
  message += `例如：banana 手办化 或 nb 手办化 或 nbp 手办化\n`;
  message += `注：nbp为Pro增强版\n\n`;
  message += `查看帮助：banana help 或 nb help 或 nbp help`;
  
  callback(message);
}

/**
 * 获取帮助信息
 * @param {Function} callback - 回调函数
 * @param {string} from - 用户ID（可选，用于权限检查）
 * @param {string} groupid - 群组ID（可选，用于权限检查）
 */
function getNanoBananaHelp(callback, from = null, groupid = null) {
  let helpText = `🍌 NanoBanana AI图片生成帮助

用法（支持 banana / nb / nbp 指令）：
banana/nb/nbp [提示词] - 根据提示词生成图片
banana/nb/nbp [提示词] [图片URL] - 基于参考图片和提示词生成图片
banana/nb/nbp [提示词] [发送图片] - 基于发送的图片和提示词生成图片
回复图片消息 + banana/nb/nbp [提示词] - 基于回复的图片生成新图片

注：nbp 为 Pro 增强版，效果更好

查看功能：
banana/nb/nbp 词条 / banana/nb/nbp 内置 / banana/nb/nbp 内置词条 - 查看所有预置效果
banana/nb/nbp help / banana/nb/nbp - 查看帮助信息

示例：
banana 一只可爱的小猫咪
nb 美丽的风景画 https://example.com/image.jpg
nbp 动漫风格 [发送一张图片]
[回复一张图片] nbp 转换成油画风格

预置效果（部分）：`;

  // 添加预置prompt列表（只显示部分）
  if (PRESETS_CONFIG) {
    const presetKeys = Object.keys(PRESETS_CONFIG);
    if (presetKeys.length > 0) {
      // 只显示前10个作为示例
      const displayKeys = presetKeys.slice(0, 10);
      displayKeys.forEach(key => {
        helpText += `\n- ${key}`;
      });
      if (presetKeys.length > 10) {
        helpText += `\n... 等共 ${presetKeys.length} 个效果`;
        helpText += `\n\n查看完整列表：banana 词条`;
      }
    } else {
      helpText += '\n（暂无可用预置效果）';
    }
  } else {
    helpText += '\n（预置效果功能未启用）';
  }

  helpText += `

注意：
- 提示词建议使用中文或英文
- 支持直接发送图片或提供图片URL链接
- 支持回复消息功能，回复图片消息时会使用该图片作为参考图
- 如果回复的消息中没有图片，将拒绝生成以节省API用量
- 图片URL需要是公网可访问的链接
- 生成过程需要一些时间，请耐心等待
- 预置效果可在 presets.json 中配置`;

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
  getNanoBananaHelp,
  getNanoBananaPresets
};
