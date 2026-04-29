const https = require('https');
const http = require('http');
const { IMAGE_DATA } = require('../../baibaiConfigs');
const path = require('path');
const fs = require('fs');

let API_KEY = '';
let PUBLIC_ENDPOINT = '';
try {
  const secretPath = path.join(__dirname, '.secret.json');
  if (fs.existsSync(secretPath)) {
    const secret = JSON.parse(fs.readFileSync(secretPath, 'utf8'));
    API_KEY = secret.apiKey || '';
    PUBLIC_ENDPOINT = secret.endpoint || '';
  }
} catch (e) {
  console.log('读取.secret.json文件失败:', e.message);
}

let PRESETS_CONFIG = null;
try {
  const presetsPath = path.join(__dirname, 'presets.json');
  if (fs.existsSync(presetsPath)) {
    PRESETS_CONFIG = JSON.parse(fs.readFileSync(presetsPath, 'utf8'));
  }
} catch (e) {
  console.log('读取presets.json文件失败:', e.message);
}

function checkPermission(from, groupid) {
  const allowedGroups = [577587780, 648050368];
  const allowedUsers = [799018865, 2408709050, 540540678];
  const fromId = parseInt(from, 10);
  const groupId = parseInt(groupid, 10);
  return allowedGroups.includes(groupId) || allowedUsers.includes(fromId);
}

function applyPresetPrompt(userPrompt) {
  if (!PRESETS_CONFIG) {
    return { prompt: userPrompt, isPreset: false };
  }

  const userPromptLower = userPrompt.toLowerCase().trim();
  for (const presetKey in PRESETS_CONFIG) {
    if (userPromptLower === presetKey.toLowerCase()) {
      return {
        prompt: PRESETS_CONFIG[presetKey],
        isPreset: true,
        presetName: presetKey
      };
    }
  }

  return { prompt: userPrompt, isPreset: false };
}

function parseUserInput(content) {
  let input = content;
  let replyMessageId = null;

  const replyRegex = /\[CQ:reply,id=(-?\d+)\]/;
  const replyMatch = content.match(replyRegex);

  if (replyMatch && replyMatch[1]) {
    replyMessageId = replyMatch[1];
    const lowerContent = content.toLowerCase();
    const gpiIndex = lowerContent.indexOf('gpi');
    if (gpiIndex !== -1) {
      input = content.substring(gpiIndex);
    } else {
      input = content.replace(replyRegex, '').replace(/\[CQ:at[^\]]*\]/g, '').trim();
    }
  }

  input = input.replace(/^gpi\s*/i, '').trim();

  if (!input) {
    return {
      error: '请提供图片生成提示词\n用法: gpi [提示词] [图片URL(可选)]\n或回复图片消息: gpi [提示词]'
    };
  }

  let prompt = input;
  let imgUrl = null;

  const cqImageRegex = /\[CQ:image[^\]]*url=([^,\]]+)[^\]]*\]/g;
  const cqMatches = input.match(cqImageRegex);

  if (cqMatches && cqMatches.length > 0) {
    const urls = [];
    cqMatches.forEach((cqCode) => {
      const urlMatch = cqCode.match(/url=([^,\]]+)/);
      if (urlMatch && urlMatch[1]) {
        let url = urlMatch[1];
        url = url.replace(/&amp;/g, '&').replace(/&#44;/g, ',');
        urls.push(url);
      }
    });
    if (urls.length > 0) {
      imgUrl = urls;
      prompt = input.replace(cqImageRegex, '').trim();
    }
  } else {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = input.match(urlRegex);
    if (urls && urls.length > 0) {
      prompt = input.replace(urlRegex, '').trim();
      imgUrl = urls;
    }
  }

  if (!prompt) {
    return { error: '请提供有效的图片生成提示词' };
  }

  return { prompt, imgUrl, replyMessageId };
}

function requestJson(options, requestBody = null, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`解析API响应失败: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => reject(new Error(`网络请求失败: ${error.message}`)));
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    if (requestBody) {
      req.write(requestBody);
    }
    req.end();
  });
}

function collectImageUrlsFromObject(obj, result = []) {
  if (!obj) return result;

  if (typeof obj === 'string') {
    if (obj.startsWith('http://') || obj.startsWith('https://')) result.push(obj);
    return result;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item) => collectImageUrlsFromObject(item, result));
    return result;
  }

  if (typeof obj === 'object') {
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      const lowerKey = key.toLowerCase();
      if (
        typeof value === 'string' &&
        (lowerKey.includes('url') ||
          lowerKey.includes('image') ||
          lowerKey.includes('result') ||
          lowerKey.includes('output')) &&
        (value.startsWith('http://') || value.startsWith('https://'))
      ) {
        result.push(value);
      } else {
        collectImageUrlsFromObject(value, result);
      }
    });
  }

  return result;
}

function extractImageUrlsFromAsyncResponse(response) {
  const candidates = collectImageUrlsFromObject(response, []);
  const unique = [...new Set(candidates)];
  const imageExtRegex = /\.(png|jpg|jpeg|webp|gif|bmp|avif)(\?|$)/i;
  const imageUrls = unique.filter((url) => imageExtRegex.test(url) || url.includes('image'));
  return imageUrls.length > 0 ? imageUrls : unique;
}

async function getAsyncTaskDetail(taskId, pollInterval = 3000, maxRetries = 60) {
  const options = {
    hostname: 'api.wuyinkeji.com',
    port: 443,
    path: `/api/async/detail?id=${encodeURIComponent(taskId)}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      'Authorization': API_KEY
    }
  };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await requestJson(options, null, 10000);
    const status = response && response.data ? Number(response.data.status) : NaN;

    if (response.code !== 200) throw new Error(response.msg || '查询任务结果失败');
    if (status === 2) return response;
    if (status === 3) throw new Error(response.data.message || response.msg || '图片生成失败');

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error('查询任务结果超时，已达到最大重试次数');
}

async function downloadImage(imageUrl, imageId) {
  const fileName = `gptImage2_${imageId}_${Date.now()}.jpg`;
  const localPath = path.join(IMAGE_DATA, 'gptImage2', fileName);
  const relativePath = path.join('send', 'gptImage2', fileName);

  const dir = path.dirname(localPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const protocol = imageUrl.startsWith('https:') ? https : http;
  return new Promise((resolve, reject) => {
    const req = protocol.get(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        const redirectUrl = res.headers.location;
        if (!redirectUrl) return reject(new Error('重定向失败，无重定向地址'));
        return downloadImage(redirectUrl, imageId).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`下载失败，HTTP状态码: ${res.statusCode}`));
      }

      const fileStream = fs.createWriteStream(localPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        const stats = fs.existsSync(localPath) ? fs.statSync(localPath) : null;
        if (!stats || stats.size <= 0) return reject(new Error('下载的文件为空'));
        resolve(relativePath);
      });
      fileStream.on('error', (error) => reject(new Error(`文件写入失败: ${error.message}`)));
    });

    req.on('error', (error) => reject(new Error(`下载请求失败: ${error.message}`)));
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('下载超时（30秒）'));
    });
  });
}

function fixImageUrl(url) {
  if (url.includes('multimedia.nt.qq.com.cn')) {
    return { url, isPrivate: true };
  }
  return { url, isPrivate: false };
}

async function downloadAndHostPrivateImage(privateUrl, userId = 'unknown') {
  if (!PUBLIC_ENDPOINT) {
    throw new Error('未配置公网访问端点，请在.secret.json中添加endpoint字段');
  }

  const tempDir = path.join(__dirname, '../../public/temp_banana_images');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const fileName = `temp_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}.jpg`;
  const localPath = path.join(tempDir, fileName);

  return new Promise((resolve, reject) => {
    const protocol = privateUrl.startsWith('https:') ? https : http;
    const req = protocol.get(privateUrl, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        const redirectUrl = res.headers.location;
        if (!redirectUrl) return reject(new Error('重定向失败，无重定向地址'));
        return downloadAndHostPrivateImage(redirectUrl, userId).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`下载失败，HTTP状态码: ${res.statusCode}`));

      const fileStream = fs.createWriteStream(localPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        const stats = fs.existsSync(localPath) ? fs.statSync(localPath) : null;
        if (!stats || stats.size <= 0) return reject(new Error('下载的文件为空'));
        resolve({
          publicUrl: `${PUBLIC_ENDPOINT}/temp_banana_images/${fileName}`,
          localPath
        });
      });
      fileStream.on('error', (error) => reject(new Error(`文件写入失败: ${error.message}`)));
    });

    req.on('error', (error) => reject(new Error(`下载请求失败: ${error.message}`)));
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('下载超时（30秒）'));
    });
  });
}

function deleteTempImage(localPath) {
  try {
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  } catch (error) {
    console.error(`删除临时图片失败: ${error.message}`);
  }
}

function cleanupOldTempImages() {
  const tempDir = path.join(__dirname, '../../public/temp_banana_images');
  if (!fs.existsSync(tempDir)) return;

  try {
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    files.forEach((file) => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > oneHour) fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error(`清理临时图片目录失败: ${error.message}`);
  }
}

setInterval(cleanupOldTempImages, 30 * 60 * 1000);

async function processImageUrls(urls, userId) {
  const urlArray = Array.isArray(urls) ? urls : [urls];
  const processedUrls = [];
  const tempPaths = [];

  for (let i = 0; i < urlArray.length; i++) {
    const urlInfo = fixImageUrl(urlArray[i]);
    if (urlInfo.isPrivate) {
      const result = await downloadAndHostPrivateImage(urlInfo.url, userId);
      processedUrls.push(result.publicUrl);
      tempPaths.push(result.localPath);
    } else {
      processedUrls.push(urlInfo.url);
    }
  }

  return { processedUrls, tempPaths };
}

async function getMessageDetail(messageId, botName) {
  const { createAction } = require('../../reverseWsUtils/manager/actionManager');
  return createAction(
    {
      action: 'get_msg',
      params: { message_id: messageId }
    },
    botName
  );
}

function extractImageUrlsFromMessage(messageDetail) {
  if (!messageDetail || !messageDetail.message) return null;
  const urls = [];
  const message = messageDetail.message;

  if (Array.isArray(message)) {
    message.forEach((segment) => {
      if (segment.type === 'image' && segment.data && segment.data.url) {
        urls.push(segment.data.url.replace(/&amp;/g, '&').replace(/&#44;/g, ','));
      }
    });
  } else if (typeof message === 'string') {
    const cqImageRegex = /\[CQ:image[^\]]*url=([^,\]]+)[^\]]*\]/g;
    let match;
    while ((match = cqImageRegex.exec(message)) !== null) {
      if (match[1]) urls.push(match[1].replace(/&amp;/g, '&').replace(/&#44;/g, ','));
    }
  }

  return urls.length > 0 ? urls : null;
}

async function callGPTImage2API(prompt, urls = null, size = 'auto') {
  if (!API_KEY) {
    throw new Error('错误：未配置API密钥，请在ai/banana/.secret.json中添加配置');
  }

  const body = { prompt, size };
  if (urls && Array.isArray(urls) && urls.length > 0) {
    body.urls = urls;
  }

  const postData = JSON.stringify(body);
  const createOptions = {
    hostname: 'api.wuyinkeji.com',
    port: 443,
    path: '/api/async/image_gpt',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      'Authorization': API_KEY,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const createResponse = await requestJson(createOptions, postData, 15000);
  if (!(createResponse.code === 200 && createResponse.data && createResponse.data.id)) {
    throw new Error(createResponse.msg || 'GPT-Image-2 提交任务失败');
  }

  const detailResponse = await getAsyncTaskDetail(createResponse.data.id);
  const imageUrls = extractImageUrlsFromAsyncResponse(detailResponse);
  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('任务已完成，但未找到可下载的图片URL');
  }

  const localPath = await downloadImage(imageUrls[0], createResponse.data.id);
  return `[CQ:image,file=${localPath}]`;
}

async function gptImageReply(content, from, name, groupid, callback, groupName, nickname, message_type, port, context) {
  if (!checkPermission(from, groupid)) return;

  const parseResult = parseUserInput(content);
  if (parseResult.error) {
    callback(parseResult.error);
    return;
  }

  const presetResult = applyPresetPrompt(parseResult.prompt);
  const finalPrompt = presetResult.prompt;
  let finalImgUrl = parseResult.imgUrl;
  let allTempPaths = [];

  if (finalImgUrl) {
    const result = await processImageUrls(finalImgUrl, from);
    finalImgUrl = result.processedUrls;
    allTempPaths.push(...result.tempPaths);
  }

  if (parseResult.replyMessageId && port) {
    const messageDetail = await getMessageDetail(parseResult.replyMessageId, port);
    const replyImageUrls = extractImageUrlsFromMessage(messageDetail);
    if (replyImageUrls && replyImageUrls.length > 0) {
      const result = await processImageUrls(replyImageUrls, from);
      const processedReplyUrls = result.processedUrls;
      allTempPaths.push(...result.tempPaths);
      finalImgUrl = finalImgUrl ? [...finalImgUrl, ...processedReplyUrls] : processedReplyUrls;
    } else if (!finalImgUrl) {
      callback('❌ 回复的消息中没有图片，无法生成图片。');
      return;
    }
  }

  if (allTempPaths.length > 0 && context) {
    context._tempImagePaths = allTempPaths;
  }

  let statusMessage = '🎨 正在使用 GPT-Image-2';
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

  try {
    const result = await callGPTImage2API(finalPrompt, finalImgUrl, 'auto');
    callback(result);
  } catch (error) {
    callback(`图片生成失败: ${error.message}`);
  } finally {
    if (context && context._tempImagePaths && context._tempImagePaths.length > 0) {
      context._tempImagePaths.forEach((tempPath) => deleteTempImage(tempPath));
      delete context._tempImagePaths;
    }
  }
}

function getGptImagePresets(callback) {
  if (!PRESETS_CONFIG || Object.keys(PRESETS_CONFIG).length === 0) {
    callback('❌ 暂无可用的预置效果');
    return;
  }

  const presetKeys = Object.keys(PRESETS_CONFIG);
  let message = `🎨 GPT-Image-2 内置词条列表\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `共 ${presetKeys.length} 个预置效果\n\n`;
  message += presetKeys.join(' | ');
  message += `\n\n━━━━━━━━━━━━━━━━━━\n`;
  message += `使用方法：\n`;
  message += `gpi [词条名]\n`;
  message += `例如：gpi 手办化\n\n`;
  message += `查看帮助：gpi help`;
  callback(message);
}

function getGptImageHelp(callback, from = null, groupid = null) {
  let helpText = `🖼️ GPT-Image-2 图片生成帮助

用法（支持 gpi 指令）：
gpi [提示词] - 根据提示词生成图片
gpi [提示词] [图片URL] - 基于参考图片和提示词生成图片
gpi [提示词] [发送图片] - 基于发送的图片和提示词生成图片
回复图片消息 + gpi [提示词] - 基于回复的图片生成新图片

查看功能：
gpi 词条 / gpi 内置 / gpi 内置词条 - 查看所有预置效果
gpi help / gpi - 查看帮助信息

示例：
gpi 一只可爱的小猫咪
gpi 美丽的风景画 https://example.com/image.jpg
gpi 动漫风格 [发送一张图片]
[回复一张图片] gpi 转换成油画风格`;

  if (from !== null && groupid !== null) {
    if (checkPermission(from, groupid)) {
      helpText += `\n\n✅ 权限状态：您有权限使用此功能`;
    } else {
      helpText += `\n\n❌ 权限状态：您暂无权限使用此功能\n此功能仅限特定群组和用户使用`;
    }
  }

  helpText += `\n\n配置：\n请在 ai/banana/.secret.json 中配置API密钥`;
  callback(helpText);
}

module.exports = {
  gptImageReply,
  getGptImageHelp,
  getGptImagePresets
};
