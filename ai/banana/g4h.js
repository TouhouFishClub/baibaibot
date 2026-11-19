const https = require('https');
const http = require('http');
const { IMAGE_DATA } = require('../../baibaiConfigs');
const path = require('path');
const fs = require('fs');

/**
 * Gemini 4 Hydrogen 图片生成插件
 * 命令：g4h
 * 使用 LinkAPI Gemini Native：POST /v1beta/models/[次]gemini-4-hydrogen:generateContent?key=
 * 仅支持图片修改模式（图片+文字转图片）
 */

// LinkAPI 与小豆包不是同一个站，密钥放在 .secret.json 的 "linkapi.ai" 下
let API_KEY = '';
try {
  const secretPath = path.join(__dirname, '.secret.json');
  if (fs.existsSync(secretPath)) {
    const secret = JSON.parse(fs.readFileSync(secretPath, 'utf8'));
    const linkapi = secret['linkapi.ai'] || {};
    API_KEY = linkapi.apiKey || '';
    if (API_KEY) {
      console.log(`✅ [G4H] 已加载 LinkAPI 密钥`);
    } else {
      console.log('⚠️ [G4H] 未配置 linkapi.ai.apiKey，请在.secret.json中添加');
    }
  } else {
    console.log('[G4H] 未找到.secret.json文件');
  }
} catch (e) {
  console.log('[G4H] 读取.secret.json文件失败:', e.message);
}

// 加载预置prompt配置
let PRESETS_CONFIG = null;
try {
  const presetsPath = path.join(__dirname, 'presets.json');
  if (fs.existsSync(presetsPath)) {
    PRESETS_CONFIG = JSON.parse(fs.readFileSync(presetsPath, 'utf8'));
    const presetsCount = Object.keys(PRESETS_CONFIG).length;
    console.log(`[G4H] 加载预置prompt配置成功，共 ${presetsCount} 个预设`);
  }
} catch (e) {
  console.log('[G4H] 读取presets.json文件失败:', e.message);
}

// 按 LinkAPI 示例：模型名带 [次] 前缀，密钥放在 query key
const API_HOST = 'linkapi.ai';
const MODEL_NAME = '[次]gemini-4-hydrogen';

/**
 * 下载图片并转换为Base64
 * @param {string} imageUrl - 图片URL
 * @returns {Promise<{base64: string, mimeType: string}>}
 */
async function downloadImageAsBase64(imageUrl) {
  return new Promise((resolve, reject) => {
    const protocol = imageUrl.startsWith('https:') ? https : http;
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    const req = protocol.get(imageUrl, options, (res) => {
      // 处理重定向
      if (res.statusCode === 302 || res.statusCode === 301) {
        const redirectUrl = res.headers.location;
        console.log(`[G4H] 重定向到: ${redirectUrl}`);
        downloadImageAsBase64(redirectUrl).then(resolve).catch(reject);
        return;
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`下载图片失败，HTTP状态码: ${res.statusCode}`));
        return;
      }
      
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        
        // 根据Content-Type确定MIME类型
        let mimeType = res.headers['content-type'] || 'image/jpeg';
        // 确保只取主MIME类型
        if (mimeType.includes(';')) {
          mimeType = mimeType.split(';')[0].trim();
        }
        
        console.log(`[G4H] 图片下载完成: ${buffer.length} 字节, 类型: ${mimeType}`);
        resolve({ base64, mimeType });
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`下载图片请求失败: ${error.message}`));
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('下载图片超时（30秒）'));
    });
  });
}

/**
 * 调用Gemini API生成图片
 * @param {string} prompt - 生成图片的提示词
 * @param {Array<{base64: string, mimeType: string}>} images - 输入图片数组
 * @returns {Promise<string>} 返回图片CQ码
 */
async function callGeminiAPI(prompt, images) {
  if (!API_KEY) {
    throw new Error('错误：未配置 linkapi.ai.apiKey，请在ai/banana/.secret.json中添加配置');
  }

  console.log(`========== [G4H] 准备调用Gemini API ==========`);
  console.log('模型:', MODEL_NAME);
  console.log('Prompt:', prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''));
  console.log('图片数量:', images.length);

  // 构建请求体 - 遵循Google Gemini API格式
  const parts = [];
  
  // 添加文本部分
  parts.push({ text: prompt });
  
  // 添加图片部分
  for (const img of images) {
    parts.push({
      inline_data: {
        mime_type: img.mimeType,
        data: img.base64
      }
    });
  }

  // 构建请求体 - 完全遵循 Gemini 官方API格式
  // 注意：模型名已在URL路径中指定，请求体中不需要 model 字段
  const requestBody = {
    contents: [
      {
        parts: parts
      }
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"]
    }
  };

  const postData = JSON.stringify(requestBody);
  
  console.log('POST数据长度:', postData.length, '字节');
  console.log('========================================');

  const requestPath = `/v1beta/models/${encodeURIComponent(MODEL_NAME)}:generateContent?key=${encodeURIComponent(API_KEY)}`;

  const options = {
    hostname: API_HOST,
    port: 443,
    path: requestPath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
          console.log('[G4H] API响应状态码:', res.statusCode);
          
          const response = JSON.parse(data);
          
          // 检查是否有错误
          if (response.error) {
            console.error('[G4H] API错误:', response.error);
            reject(new Error(`API错误: ${response.error.message || JSON.stringify(response.error)}`));
            return;
          }
          
          // 解析Gemini API响应格式
          console.log('[G4H] ========== 开始解析API响应 ==========');
          console.log('[G4H] 响应结构检查:');
          console.log('[G4H] - response对象存在:', !!response);
          console.log('[G4H] - candidates存在:', !!response.candidates);
          console.log('[G4H] - candidates长度:', response.candidates ? response.candidates.length : 0);
          
          if (response.candidates && response.candidates[0]) {
            const candidate = response.candidates[0];
            console.log('[G4H] - candidates[0]存在:', !!candidate);
            console.log('[G4H] - candidates[0].content存在:', !!candidate.content);
            console.log('[G4H] - finishReason:', candidate.finishReason || '未提供');
            
            if (candidate.content) {
              console.log('[G4H] - content.parts存在:', !!candidate.content.parts);
              console.log('[G4H] - content.parts长度:', candidate.content.parts ? candidate.content.parts.length : 0);
            }
            
            // 检查是否有安全过滤或其他阻止原因
            if (candidate.finishReason && candidate.finishReason !== 'STOP') {
              console.error('[G4H] ⚠️ API返回非正常结束原因:', candidate.finishReason);
            }
          }
          
          // 检查promptFeedback（可能包含被阻止的原因）
          if (response.promptFeedback) {
            console.log('[G4H] - promptFeedback:', JSON.stringify(response.promptFeedback, null, 2));
          }
          
          if (response.candidates && response.candidates[0] && response.candidates[0].content) {
            const candidate = response.candidates[0];
            const content = candidate.content;
            let resultText = '';
            let imageBase64 = null;
            let imageMimeType = null;
            
            // 检查content.parts是否存在且有内容
            if (!content.parts || content.parts.length === 0) {
              console.error('[G4H] ❌ content.parts为空或不存在');
              console.error('[G4H] finishReason:', candidate.finishReason || '未提供');
              console.error('[G4H] 完整candidate对象:', JSON.stringify(candidate, null, 2));
              console.error('[G4H] 完整响应对象:', JSON.stringify(response, null, 2));
              
              // 构建更有意义的错误信息
              let errorMsg = 'API响应中没有图片数据';
              if (candidate.finishReason && candidate.finishReason !== 'STOP') {
                errorMsg = `图片生成被阻止，原因: ${candidate.finishReason}`;
              }
              reject(new Error(errorMsg));
              return;
            }
            
            console.log('[G4H] 开始遍历content.parts...');
            for (let i = 0; i < content.parts.length; i++) {
              const part = content.parts[i];
              console.log(`[G4H] - Part ${i}:`, JSON.stringify(Object.keys(part)));
              
              if (part.text) {
                resultText = part.text;
                console.log('[G4H] 响应文本:', resultText.substring(0, 100));
              }
              if (part.inline_data || part.inlineData) {
                const inlineData = part.inline_data || part.inlineData;
                imageBase64 = inlineData.data;
                imageMimeType = inlineData.mime_type || inlineData.mimeType || 'image/png';
                const dataLength = imageBase64 ? imageBase64.length : 0;
                console.log('[G4H] ✅ 收到图片数据, 类型:', imageMimeType, ', 数据长度:', dataLength);
              }
            }
            
            if (imageBase64) {
              // 保存图片到本地
              try {
                const localPath = await saveBase64Image(imageBase64, imageMimeType);
                resolve(`[CQ:image,file=${localPath}]`);
              } catch (saveError) {
                console.error('[G4H] 保存图片失败:', saveError);
                reject(new Error(`图片生成成功，但保存失败: ${saveError.message}`));
              }
            } else if (resultText) {
              // 只有文本响应，没有图片
              console.error('[G4H] ❌ API返回了文本但没有图片');
              console.error('[G4H] 完整响应文本:', resultText);
              console.error('[G4H] 完整响应对象:', JSON.stringify(response, null, 2));
              reject(new Error(`API未返回图片。响应: ${resultText}`));
            } else {
              console.error('[G4H] ❌ API响应中没有图片数据也没有文本');
              console.error('[G4H] 完整content对象:', JSON.stringify(content, null, 2));
              console.error('[G4H] 完整响应对象:', JSON.stringify(response, null, 2));
              reject(new Error('API响应中没有图片数据'));
            }
          } else {
            console.error('[G4H] ❌ 意外的响应格式');
            console.error('[G4H] 完整响应对象:', JSON.stringify(response, null, 2));
            
            // 尝试提取有用的错误信息
            let errorMsg = 'API响应格式异常';
            if (response.candidates && response.candidates[0]) {
              const candidate = response.candidates[0];
              if (candidate.finishReason) {
                errorMsg = `API响应异常，原因: ${candidate.finishReason}`;
              }
            }
            if (response.promptFeedback && response.promptFeedback.blockReason) {
              errorMsg = `请求被阻止，原因: ${response.promptFeedback.blockReason}`;
            }
            reject(new Error(errorMsg));
          }
        } catch (error) {
          console.error('[G4H] 解析API响应失败:', error);
          console.error('[G4H] 原始响应:', data.substring(0, 1000));
          reject(new Error('API响应解析失败，请稍后重试'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('[G4H] API请求失败:', error);
      reject(new Error('网络请求失败，请稍后重试'));
    });

    req.setTimeout(360000, () => {
      req.destroy();
      console.error('[G4H] API请求超时');
      reject(new Error('API请求超时（360秒）'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 保存Base64图片到本地
 * @param {string} base64Data - Base64编码的图片数据
 * @param {string} mimeType - MIME类型
 * @returns {Promise<string>} 返回相对路径
 */
async function saveBase64Image(base64Data, mimeType) {
  // 根据MIME类型确定扩展名
  let ext = 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
    ext = 'jpg';
  } else if (mimeType.includes('gif')) {
    ext = 'gif';
  } else if (mimeType.includes('webp')) {
    ext = 'webp';
  }
  
  const fileName = `g4h_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const localPath = path.join(IMAGE_DATA, 'nanoBanana', fileName);
  const relativePath = path.join('send', 'nanoBanana', fileName);

  // 确保目录存在
  const dir = path.dirname(localPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[G4H] 创建目录成功: ${dir}`);
  }

  // 写入文件
  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(localPath, buffer);
  
  console.log(`[G4H] 图片保存成功: ${localPath} (${buffer.length} 字节)`);
  return relativePath;
}

/**
 * 检查并应用预置prompt
 * @param {string} userPrompt - 用户输入的提示词
 * @returns {Object} {prompt: 最终使用的prompt, isPreset: 是否使用了预设, presetName: 预设名称}
 */
function applyPresetPrompt(userPrompt) {
  if (!PRESETS_CONFIG) {
    return { prompt: userPrompt, isPreset: false };
  }

  const userPromptLower = userPrompt.toLowerCase().trim();
  
  for (const presetKey in PRESETS_CONFIG) {
    const presetKeyLower = presetKey.toLowerCase();
    if (userPromptLower === presetKeyLower) {
      console.log(`[G4H] ✅ 匹配到预置prompt: "${presetKey}"`);
      return {
        prompt: PRESETS_CONFIG[presetKey],
        isPreset: true,
        presetName: presetKey
      };
    }
  }
  
  console.log(`[G4H] 未匹配到预置prompt，使用原始提示词`);
  return { prompt: userPrompt, isPreset: false };
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
    console.log(`[G4H] 检测到回复消息，消息ID: ${replyMessageId}`);
    
    // 找到 g4h 关键词的位置
    const lowerContent = content.toLowerCase();
    const g4hIndex = lowerContent.indexOf('g4h');
    
    if (g4hIndex !== -1) {
      input = content.substring(g4hIndex);
    } else {
      input = content
        .replace(replyRegex, '')
        .replace(/\[CQ:at[^\]]*\]/g, '')
        .trim();
    }
  }

  // 移除"g4h"前缀
  input = input.replace(/^g4h\s*/i, '').trim();
  
  if (!input) {
    return {
      error: '请提供图片修改提示词\n用法: g4h [提示词] + [回复图片/发送图片]\n例如: 回复一张图片并输入 g4h 手办化'
    };
  }

  let prompt = input;
  let imgUrl = null;

  // 检查是否包含CQ图片码
  const cqImageRegex = /\[CQ:image[^\]]*url=([^,\]]+)[^\]]*\]/g;
  const cqMatches = input.match(cqImageRegex);
  
  if (cqMatches && cqMatches.length > 0) {
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
      prompt = input.replace(cqImageRegex, '').trim();
    }
  } else {
    // 检查是否包含普通的图片URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = input.match(urlRegex);
    
    if (urls && urls.length > 0) {
      prompt = input.replace(urlRegex, '').trim();
      imgUrl = urls;
    }
  }

  if (!prompt) {
    return {
      error: '请提供有效的图片修改提示词'
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
    
    console.log(`[G4H] 正在获取消息详情，消息ID: ${messageId}, bot: ${botName}`);
    
    const messageDetail = await createAction({
      "action": "get_msg",
      "params": {
        "message_id": messageId
      }
    }, botName);
    
    return messageDetail;
  } catch (error) {
    console.error('[G4H] 获取消息详情失败:', error);
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

  if (Array.isArray(message)) {
    message.forEach((segment) => {
      if (segment.type === 'image' && segment.data && segment.data.url) {
        let url = segment.data.url;
        url = url.replace(/&amp;/g, '&');
        url = url.replace(/&#44;/g, ',');
        urls.push(url);
      }
    });
  } else if (typeof message === 'string') {
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
 * 检查用户是否有权限
 * @param {string} from - 用户ID
 * @param {string} groupid - 群组ID
 * @returns {boolean} 是否有权限
 */
function checkPermission(from, groupid) {
  const allowedGroups = [577587780, 648050368];
  const allowedUsers = [799018865, 2408709050, 540540678];
  
  const fromId = parseInt(from);
  const groupId = parseInt(groupid);
  
  if (allowedGroups.includes(groupId)) {
    return true;
  }
  
  if (allowedUsers.includes(fromId)) {
    return true;
  }
  
  return false;
}

/**
 * G4H主处理函数
 * @param {string} content - 用户输入内容
 * @param {string} from - 用户ID
 * @param {string} name - 用户名称
 * @param {string} groupid - 群组ID
 * @param {Function} callback - 回调函数
 * @param {string} groupName - 群组名称
 * @param {string} nickname - 用户昵称
 * @param {string} message_type - 消息类型
 * @param {string} port - 端口/bot名称
 * @param {Object} context - 消息上下文
 */
async function g4hReply(content, from, name, groupid, callback, groupName, nickname, message_type, port, context) {
  console.log(`[G4H] 请求 - 用户: ${name}(${from}), 群组: ${groupid}, 内容: ${content}`);
  
  // 检查权限
  if (!checkPermission(from, groupid)) {
    console.log(`[G4H] 用户 ${name}(${from}) 无权限使用G4H功能`);
    return;
  }
  
  const parseResult = parseUserInput(content);
  
  if (parseResult.error) {
    callback(parseResult.error);
    return;
  }

  // 应用预置prompt
  const presetResult = applyPresetPrompt(parseResult.prompt);
  const finalPrompt = presetResult.prompt;
  
  if (presetResult.isPreset) {
    console.log(`[G4H] 使用预置prompt: ${presetResult.presetName}`);
  }

  let finalImgUrl = parseResult.imgUrl ? [].concat(parseResult.imgUrl) : [];

  // 如果有回复消息ID，获取被回复的消息详情
  if (parseResult.replyMessageId && port) {
    try {
      const messageDetail = await getMessageDetail(parseResult.replyMessageId, port);
      const replyImageUrls = extractImageUrlsFromMessage(messageDetail);
      
      if (replyImageUrls && replyImageUrls.length > 0) {
        console.log(`[G4H] ✅ 从回复消息中提取到 ${replyImageUrls.length} 张图片`);
        finalImgUrl = finalImgUrl.concat(replyImageUrls);
      } else if (finalImgUrl.length === 0) {
        callback('❌ 回复的消息中没有图片。\nG4H仅支持图片修改模式，请回复包含图片的消息或直接发送图片。');
        return;
      }
    } catch (error) {
      if (finalImgUrl.length === 0) {
        callback(`❌ 获取回复消息失败: ${error.message}\n请直接发送图片或提供图片URL。`);
        return;
      }
    }
  }

  // G4H仅支持图片修改模式，必须有图片输入
  if (finalImgUrl.length === 0) {
    callback('❌ G4H仅支持图片修改模式（图片+文字转图片）\n请回复图片消息或在命令中附带图片。\n用法: g4h [提示词] + [回复图片/发送图片]');
    return;
  }

  // 显示处理中的消息
  let statusMessage = '🎨 [G4H] 正在使用 Gemini 4 Hydrogen';
  if (presetResult.isPreset) {
    statusMessage += `[${presetResult.presetName}]`;
  }
  const imageCount = finalImgUrl.length;
  statusMessage += `基于 ${imageCount} 张图片生成中，请稍候...`;
  callback(statusMessage);

  console.log('[G4H] ========== 即将调用API ==========');
  console.log('[G4H] 最终Prompt:', finalPrompt.substring(0, 200));
  console.log('[G4H] 图片URL数量:', finalImgUrl.length);

  try {
    // 下载所有图片并转换为Base64
    const images = [];
    for (const url of finalImgUrl) {
      try {
        const imgData = await downloadImageAsBase64(url);
        images.push(imgData);
      } catch (error) {
        console.error(`[G4H] 下载图片失败: ${url}`, error);
        throw new Error(`下载图片失败: ${error.message}`);
      }
    }
    
    // 调用API
    const result = await callGeminiAPI(finalPrompt, images);
    callback(result);
  } catch (error) {
    console.error('[G4H] 生成失败:', error);
    callback(`❌ 图片生成失败: ${error.message}`);
  }
}

/**
 * 获取帮助信息
 * @param {Function} callback - 回调函数
 * @param {string} from - 用户ID
 * @param {string} groupid - 群组ID
 */
function getG4hHelp(callback, from = null, groupid = null) {
  let helpText = `🎨 G4H (Gemini 4 Hydrogen) 帮助

模型：[次]gemini-4-hydrogen
接口：https://linkapi.ai/v1beta/models/[次]gemini-4-hydrogen:generateContent

⚠️ 仅支持图片修改模式（图片+文字转图片）

用法：
g4h [提示词] + [回复图片/发送图片]

示例：
[回复一张图片] g4h 手办化
g4h 转换成油画风格 [发送一张图片]
g4h Q版化 [图片URL]

预置效果（部分）：`;

  if (PRESETS_CONFIG) {
    const presetKeys = Object.keys(PRESETS_CONFIG);
    if (presetKeys.length > 0) {
      const displayKeys = presetKeys.slice(0, 10);
      displayKeys.forEach(key => {
        helpText += `\n- ${key}`;
      });
      if (presetKeys.length > 10) {
        helpText += `\n... 等共 ${presetKeys.length} 个效果`;
        helpText += `\n\n查看完整列表：g4h 词条`;
      }
    }
  }

  helpText += `

注意：
- G4H必须有图片输入，不支持纯文字生成图片
- 生成时间较长（可能需要1-3分钟），请耐心等待
- 使用与banana/nb/nbp相同的预置词条`;

  if (from !== null && groupid !== null) {
    if (checkPermission(from, groupid)) {
      helpText += `\n\n✅ 权限状态：您有权限使用此功能`;
    } else {
      helpText += `\n\n❌ 权限状态：您暂无权限使用此功能`;
    }
  }

  callback(helpText);
}

/**
 * 获取预置词条列表
 * @param {Function} callback - 回调函数
 */
function getG4hPresets(callback) {
  if (!PRESETS_CONFIG || Object.keys(PRESETS_CONFIG).length === 0) {
    callback('❌ 暂无可用的预置效果');
    return;
  }

  const presetKeys = Object.keys(PRESETS_CONFIG);
  const total = presetKeys.length;
  
  let message = `🎨 G4H 内置词条列表\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `共 ${total} 个预置效果\n\n`;
  
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
  message += `回复图片 + g4h [词条名]\n`;
  message += `例如：g4h 手办化\n\n`;
  message += `查看帮助：g4h help`;
  
  callback(message);
}

module.exports = {
  g4hReply,
  getG4hHelp,
  getG4hPresets
};

