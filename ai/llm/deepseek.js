const request = require('request');
const fs = require('fs-extra');
const path = require('path');

// 从当前目录的.secret.json文件中获取密钥配置
const secretConfig = fs.readJsonSync(path.join(__dirname, '.secret.json'));

// DeepSeek API配置
const DEEPSEEK_API_KEY = secretConfig.deepseek_api_key || ''; // 从.secret.json配置中获取API密钥
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1/chat/completions';

// 群组限制配置
let groupLimit = {};

// 保存会话历史
let conversationHistory = {};

/**
 * 检查用户是否有权限使用
 * @param {string} qq - 用户QQ号
 * @param {string} gid - 群组ID
 * @returns {boolean} - 是否有权限
 */
function checkPermission(qq, gid) {
  // 这里可以根据需要设置权限控制
  // 目前允许所有用户使用
  return true;
}

/**
 * 检查群组使用限制
 * @param {string} gid - 群组ID
 * @returns {Object} - 包含是否允许和剩余时间的对象
 */
function checkGroupLimit(gid) {
  const now = new Date().getTime();
  
  if (!groupLimit[gid]) {
    groupLimit[gid] = { count: 1, resetTime: now + 60 * 60 * 1000 }; // 1小时重置
    return { allowed: true };
  }
  
  // 检查是否需要重置计数
  if (groupLimit[gid].resetTime < now) {
    groupLimit[gid] = { count: 1, resetTime: now + 60 * 60 * 1000 };
    return { allowed: true };
  }
  
  // 检查是否超过限制（每小时最多50次）
  if (groupLimit[gid].count > 50) {
    const remainingTime = Math.round((groupLimit[gid].resetTime - now) / 60000);
    return { 
      allowed: false, 
      message: `群组调用次数已达上限，请等待 ${remainingTime} 分钟后再试` 
    };
  }
  
  groupLimit[gid].count++;
  return { allowed: true };
}

/**
 * 管理会话历史
 * @param {string} gid - 群组ID
 * @param {string} qq - 用户QQ号
 * @param {string} role - 角色（user/assistant）
 * @param {string} content - 内容
 */
function addToHistory(gid, qq, role, content) {
  const key = `${gid}_${qq}`;
  const now = new Date().getTime();
  
  if (!conversationHistory[key]) {
    conversationHistory[key] = [];
  }
  
  conversationHistory[key].push({
    role,
    content,
    timestamp: now
  });
  
  // 保持最近的10轮对话
  if (conversationHistory[key].length > 20) {
    conversationHistory[key] = conversationHistory[key].slice(-20);
  }
  
  // 清理超过30分钟的对话历史
  conversationHistory[key] = conversationHistory[key].filter(
    msg => now - msg.timestamp < 30 * 60 * 1000
  );
}

/**
 * 获取会话历史
 * @param {string} gid - 群组ID
 * @param {string} qq - 用户QQ号
 * @returns {Array} - 会话历史数组
 */
function getHistory(gid, qq) {
  const key = `${gid}_${qq}`;
  if (!conversationHistory[key]) {
    return [];
  }
  
  return conversationHistory[key]
    .filter(msg => msg.role && msg.content)
    .map(msg => ({ role: msg.role, content: msg.content }));
}

/**
 * 调用DeepSeek API
 * @param {string} content - 用户输入内容
 * @param {string} gid - 群组ID
 * @param {string} qq - 用户QQ号
 * @param {Function} callback - 回调函数
 */
function getDeepSeekReply(content, gid, qq, callback) {
  // 检查权限
  if (!checkPermission(qq, gid)) {
    callback('抱歉，您没有使用此功能的权限');
    return;
  }
  
  // 检查群组限制
  const limitCheck = checkGroupLimit(gid);
  if (!limitCheck.allowed) {
    callback(limitCheck.message);
    return;
  }
  
  // 检查API密钥
  if (!DEEPSEEK_API_KEY) {
    callback('DeepSeek API密钥未配置，请联系管理员');
    return;
  }
  
  // 获取历史对话
  const history = getHistory(gid, qq);
  
  // 构建消息数组
  const messages = [
    {
      role: "system",
      content: "你是一个有用的AI助手。请用中文回答问题，保持友善和有帮助的态度。"
    },
    ...history,
    {
      role: "user",
      content: content
    }
  ];
  
  const requestBody = {
    model: "deepseek-chat",
    messages: messages,
    temperature: 0.7,
    max_tokens: 1000,
    stream: false
  };
  
  console.log('=== DeepSeek API Request ===');
  console.log('Messages:', JSON.stringify(messages, null, 2));
  
  request({
    url: DEEPSEEK_BASE_URL,
    method: "POST",
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify(requestBody),
    timeout: 30000
  }, function (error, response, body) {
    if (error) {
      console.log('DeepSeek API请求错误:', error);
      callback('网络请求失败，请稍后重试');
      return;
    }
    
    try {
      const data = JSON.parse(body);
      
      if (data.error) {
        console.log('DeepSeek API错误:', data.error);
        callback(`API错误: ${data.error.message || '未知错误'}`);
        return;
      }
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const reply = data.choices[0].message.content.trim();
        
        // 保存到会话历史
        addToHistory(gid, qq, 'user', content);
        addToHistory(gid, qq, 'assistant', reply);
        
        console.log('=== DeepSeek API Response ===');
        console.log('Reply:', reply);
        
        callback(reply);
      } else {
        console.log('DeepSeek API响应格式异常:', data);
        callback('API响应格式异常，请稍后重试');
      }
    } catch (parseError) {
      console.log('解析DeepSeek API响应失败:', parseError);
      console.log('原始响应:', body);
      callback('解析API响应失败，请稍后重试');
    }
  });
}

/**
 * 清除会话历史
 * @param {string} gid - 群组ID
 * @param {string} qq - 用户QQ号
 * @param {Function} callback - 回调函数
 */
function clearHistory(gid, qq, callback) {
  const key = `${gid}_${qq}`;
  delete conversationHistory[key];
  callback('会话历史已清除');
}

/**
 * 主要的DeepSeek处理函数
 * @param {string} content - 用户输入内容
 * @param {string} gid - 群组ID
 * @param {string} qq - 用户QQ号
 * @param {Function} callback - 回调函数
 */
function handleDeepSeekChat(content, gid, qq, callback) {
  // 移除触发词
  let processedContent = content;
  
  // 支持多种触发词
  const triggers = ['ds ', 'deepseek ', 'DS ', 'DeepSeek ', 'Ds ', 'dS '];
  for (const trigger of triggers) {
    if (processedContent.startsWith(trigger)) {
      processedContent = processedContent.substring(trigger.length).trim();
      break;
    }
  }
  
  // 特殊命令处理
  if (processedContent === '清除历史' || processedContent === 'clear' || processedContent === '重置') {
    clearHistory(gid, qq, callback);
    return;
  }
  
  if (processedContent === '帮助' || processedContent === 'help') {
    const helpText = `DeepSeek AI对话助手使用说明：
• 发送 "ds 你的问题" 开始对话
• 发送 "ds 清除历史" 清除会话记录
• 支持上下文对话，会记住最近的对话内容
• 每小时限制50次调用
• 会话历史保持30分钟

示例：
ds 你好
ds 什么是人工智能？
ds 清除历史`;
    callback(helpText);
    return;
  }
  
  if (!processedContent.trim()) {
    callback('请输入要对话的内容，例如：ds 你好');
    return;
  }
  
  // 调用DeepSeek API
  getDeepSeekReply(processedContent, gid, qq, callback);
}

module.exports = {
  handleDeepSeekChat,
  getDeepSeekReply,
  clearHistory
}; 