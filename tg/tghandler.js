// 安装依赖: npm install node-telegram-bot-api https-proxy-agent

const TelegramBot = require('node-telegram-bot-api');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
// ========== 配置区域 ==========
const TOKEN = '8666855963:AAGpSdOiHwnlXUtR7gaoaFSjHhaVynzuNQU';

// 代理配置
const PROXY_CONFIG = {
  enabled: true,  // 是否启用代理
  url: 'http://192.168.17.236:2346',  // 代理地址
  // 带认证示例: 'http://username:password@proxy-server:port'
};

// ========== 创建代理 Agent ==========
let proxyAgent = null;
let bot = null;
let telegramDisabled = false;
const botConfig = {
  polling: {
    interval: 1000,
    autoStart: false,
    params: {
      timeout: 10
    }
  }
};

function disableTelegram(reason) {
  if (telegramDisabled) return;
  telegramDisabled = true;
  console.error('❌ Telegram 功能已禁用，不影响其他功能:', reason);
  console.error('请检查: 1) Token 是否正确 2) 代理是否可用 3) 网络连接');
  if (bot && typeof bot.stopPolling === 'function') {
    Promise.resolve(bot.stopPolling({ cancel: true })).catch(() => {});
  }
}

try {
  if (PROXY_CONFIG.enabled && PROXY_CONFIG.url) {
    console.log(`✓ 启用代理: ${PROXY_CONFIG.url}`);
    proxyAgent = new HttpsProxyAgent(PROXY_CONFIG.url);
    botConfig.request = {
      agent: proxyAgent,
      timeout: 30000
    };
  } else {
    console.log('✓ 直连模式（未启用代理）');
  }

  bot = new TelegramBot(TOKEN, botConfig);

  bot.getMe()
    .then(me => {
      if (telegramDisabled) return;
      console.log('✅ Bot 连接成功！');
      console.log(`Bot 名称: ${me.first_name} (@${me.username})`);
      console.log('等待消息中...\n');
      return bot.startPolling();
    })
    .catch(err => {
      disableTelegram(err && err.message ? err.message : String(err));
    });
} catch (err) {
  disableTelegram(err && err.message ? err.message : String(err));
  bot = null;
}

if (!bot) {
  console.warn('⚠️ Telegram 功能未启动，主程序继续运行');
} else {


function parseCQMessage(msg) {
  const result = [];
  const regex = /\[CQ:image,file=([^\]]+)\]|([^\[]+)/g;
  let match;

  while ((match = regex.exec(msg))) {
    result.push(match[1] || match[2]);
  }
  return result;
}

// ========== 1. 基本消息接收和发送（支持私聊和群聊）==========
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text || '';
  const userName = msg.from.first_name;
  const chatType = msg.chat.type; // 'private', 'group', 'supergroup', 'channel'
  const chatTitle = msg.chat.title || '私聊';
  console.log(msg);
  // 判断消息来源
  if (chatType === 'private') {
    console.log(`[私聊] ${userName} (${chatId}): ${messageText}`);
  } else if (chatType === 'group' || chatType === 'supergroup') {
    console.log(`[群聊: ${chatTitle}] ${userName}: ${messageText}`);
  }

  // 如果是命令，跳过这里的处理（让命令处理器处理）
  if (messageText.startsWith('/')) {
    return;
  }

  // 私聊和群聊都正常回复
  if (chatType === 'private') {
    // 私聊：直接回复
    bot.sendMessage(chatId, `${userName}, 你发送了: ${messageText}`)
      .catch(err => console.error('发送消息失败:', err.message));
  } else if (chatType === 'group' || chatType === 'supergroup') {
    const { handle_msg_D2 } = require('../baibai2');
    var groupid=userName
    if(chatTitle=='拉包尔钻石VIP会员群'){
      groupid=835339290;
    }
    handle_msg_D2(messageText, userName, userName, groupid,rmsg => {
      console.log('tg send:'+rmsg);
      var rra = parseCQMessage(rmsg);
      for(var i=0;i<rra.length;i++){
        var rd = rra[i];
        if(rd.startsWith('send/')){
          //如果要发送本地图片:
          bot.sendPhoto(chatId, fs.createReadStream('/home/flan/baibai/coolq-data/cq/data/image/'+rd));
        }else{
          bot.sendMessage(chatId, rmsg)
            .catch(err => console.error('群聊回复失败:', err.message));
        }
      }
    }, chatTitle, userName, 'group', 19334, {} )

    // 群聊：也正常回复（不需要@）

  }
});

// ========== 2. /start 命令 ==========
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeText = `
🤖 欢迎使用 Telegram Bot！

📋 可用命令:
/help - 显示帮助
/chatid - 获取当前 Chat ID
/chatinfo - 获取聊天详细信息
/photo - 发送图片
/file - 发送文件
/location - 发送位置
/menu - 显示按钮菜单
/keyboard - 显示自定义键盘
/album - 发送相册
/echo <文本> - 回显文本
/pin <回复消息> - 置顶消息（仅群聊）
/poll - 创建投票（群聊可用）
/members - 获取群成员数（仅群聊）

💡 所有 API 请求都通过代理服务器！
✨ 支持私聊和群聊！
  `;

  bot.sendMessage(chatId, welcomeText)
    .catch(err => console.error('发送欢迎消息失败:', err.message));
});

// ========== 3. /help 命令 ==========
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpText = `
📖 使用帮助

这是一个功能齐全的 Telegram Bot 示例，所有请求都通过 HTTP 代理发送。

🔧 功能特性:
• 文本消息收发
• 图片、文件发送
• 位置分享
• 内联按钮（Inline Keyboard）
• 自定义键盘（Reply Keyboard）
• 回调查询处理
• 多媒体组（相册）

🌐 代理状态: ${PROXY_CONFIG.enabled ? '已启用' : '未启用'}
  `;

  bot.sendMessage(chatId, helpText)
    .catch(err => console.error('发送帮助失败:', err.message));
});

// ========== 4. /chatid 命令 - 获取 Chat ID ==========
bot.onText(/\/chatid/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const chatType = msg.chat.type;

  let info = `
📱 聊天信息:
• Chat ID: ${chatId}
• User ID: ${userId}
• 聊天类型: ${chatType}
• 用户名: ${msg.from.first_name}
${msg.from.username ? `• Username: @${msg.from.username}` : ''}
  `;

  if (chatType === 'group' || chatType === 'supergroup') {
    info += `• 群组名称: ${msg.chat.title}\n`;
    if (msg.chat.username) {
      info += `• 群组链接: t.me/${msg.chat.username}\n`;
    }
  }

  bot.sendMessage(chatId, info)
    .catch(err => console.error('发送 Chat ID 失败:', err.message));
});

// ========== 新增: /chatinfo 命令 - 获取详细聊天信息 ==========
bot.onText(/\/chatinfo/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const chat = await bot.getChat(chatId);

    let info = `
📊 详细聊天信息:
• ID: ${chat.id}
• 类型: ${chat.type}
• 标题: ${chat.title || '私聊'}
`;

    if (chat.username) {
      info += `• 用户名: @${chat.username}\n`;
    }

    if (chat.description) {
      info += `• 描述: ${chat.description}\n`;
    }

    if (chat.type === 'supergroup' || chat.type === 'group') {
      const memberCount = await bot.getChatMembersCount(chatId);
      info += `• 成员数: ${memberCount}\n`;
    }

    if (chat.pinned_message) {
      info += `• 有置顶消息\n`;
    }

    bot.sendMessage(chatId, info);
  } catch (err) {
    console.error('获取聊天信息失败:', err.message);
    bot.sendMessage(chatId, '❌ 获取聊天信息失败');
  }
});

// ========== 5. /echo 命令 - 回显文本 ==========
bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];

  bot.sendMessage(chatId, text)
    .catch(err => console.error('回显失败:', err.message));
});

// ========== 6. /photo 命令 - 发送图片 ==========
bot.onText(/\/photo/, (msg) => {
  const chatId = msg.chat.id;

  // 发送网络图片（通过代理）
  bot.sendPhoto(chatId, 'https://picsum.photos/800/600', {
    caption: '📸 这是一张随机图片（通过代理获取）'
  })
    .then(() => console.log('图片发送成功'))
    .catch(err => console.error('发送图片失败:', err.message));

  // 如果要发送本地图片:
  // const fs = require('fs');
  // bot.sendPhoto(chatId, fs.createReadStream('./image.jpg'));
});

// ========== 7. /file 命令 - 发送文件 ==========
bot.onText(/\/file/, (msg) => {
  const chatId = msg.chat.id;

  // 创建一个临时文本文件并发送
  const fileContent = Buffer.from('这是通过代理发送的测试文件\n生成时间: ' + new Date().toLocaleString());

  bot.sendDocument(chatId, fileContent, {
    filename: 'test.txt',
    caption: '📄 测试文件'
  }, {
    contentType: 'text/plain'
  })
    .then(() => console.log('文件发送成功'))
    .catch(err => console.error('发送文件失败:', err.message));
});

// ========== 8. /location 命令 - 发送位置 ==========
bot.onText(/\/location/, (msg) => {
  const chatId = msg.chat.id;

  // 发送东京塔的位置
  bot.sendLocation(chatId, 35.6586, 139.7454, {
    horizontal_accuracy: 50
  })
    .then(() => {
      bot.sendMessage(chatId, '📍 这是东京塔的位置');
    })
    .catch(err => console.error('发送位置失败:', err.message));
});

// ========== 9. /menu 命令 - 内联按钮 ==========
bot.onText(/\/menu/, (msg) => {
  const chatId = msg.chat.id;

  const opts = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ 选项 1', callback_data: 'option1' },
          { text: '❌ 选项 2', callback_data: 'option2' }
        ],
        [
          { text: '⭐ 选项 3', callback_data: 'option3' }
        ],
        [
          { text: '🔗 访问 Telegram', url: 'https://telegram.org' }
        ]
      ]
    }
  };

  bot.sendMessage(chatId, '🎛️ 请选择一个选项:', opts)
    .catch(err => console.error('发送菜单失败:', err.message));
});

// 处理内联按钮回调
bot.on('callback_query', (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const data = callbackQuery.data;

  console.log(`[回调] ${chatId} 点击了: ${data}`);

  // 显示点击通知
  bot.answerCallbackQuery(callbackQuery.id, {
    text: `你选择了: ${data}`,
    show_alert: false
  })
    .catch(err => console.error('回调响应失败:', err.message));

  // 编辑原消息
  bot.editMessageText(`✓ 你点击了: ${data}`, {
    chat_id: chatId,
    message_id: messageId
  })
    .catch(err => console.error('编辑消息失败:', err.message));

  // 发送新消息
  bot.sendMessage(chatId, `已处理选项: ${data}`)
    .catch(err => console.error('发送确认消息失败:', err.message));
});

// ========== 10. /keyboard 命令 - 自定义键盘 ==========
bot.onText(/\/keyboard/, (msg) => {
  const chatId = msg.chat.id;

  const opts = {
    reply_markup: {
      keyboard: [
        ['🔥 热门', '⭐ 推荐'],
        ['📊 统计', '⚙️ 设置'],
        ['❌ 关闭键盘']
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  };

  bot.sendMessage(chatId, '⌨️ 自定义键盘已显示:', opts)
    .catch(err => console.error('发送键盘失败:', err.message));
});

// 处理自定义键盘按钮
bot.onText(/❌ 关闭键盘/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, '键盘已关闭', {
    reply_markup: {
      remove_keyboard: true
    }
  })
    .catch(err => console.error('关闭键盘失败:', err.message));
});

// ========== 11. /album 命令 - 发送相册 ==========
bot.onText(/\/album/, (msg) => {
  const chatId = msg.chat.id;

  const media = [
    {
      type: 'photo',
      media: 'https://picsum.photos/800/600?random=1'
    },
    {
      type: 'photo',
      media: 'https://picsum.photos/800/600?random=2'
    },
    {
      type: 'photo',
      media: 'https://picsum.photos/800/600?random=3',
      caption: '📷 这是一个照片组（共3张）'
    }
  ];

  bot.sendMediaGroup(chatId, media)
    .then(() => console.log('相册发送成功'))
    .catch(err => console.error('发送相册失败:', err.message));
});

// ========== 12. 接收照片 ==========
bot.on('photo', (msg) => {
  const chatId = msg.chat.id;
  const photo = msg.photo[msg.photo.length - 1]; // 最高清版本

  console.log(`[照片] 收到照片 File ID: ${photo.file_id}`);

  bot.sendMessage(chatId, `✓ 收到照片！\n文件大小: ${photo.file_size} bytes`)
    .then(() => {
      // 可以重新发送收到的照片
      return bot.sendPhoto(chatId, photo.file_id, {
        caption: '这是你刚发送的照片'
      });
    })
    .catch(err => console.error('处理照片失败:', err.message));
});

// ========== 13. 接收文档/文件 ==========
bot.on('document', (msg) => {
  const chatId = msg.chat.id;
  const doc = msg.document;

  console.log(`[文件] 收到文件: ${doc.file_name}`);

  bot.sendMessage(chatId, `✓ 收到文件: ${doc.file_name}\n大小: ${doc.file_size} bytes`)
    .catch(err => console.error('处理文件失败:', err.message));
});

// ========== 14. 接收位置 ==========
bot.on('location', (msg) => {
  const chatId = msg.chat.id;
  const location = msg.location;

  console.log(`[位置] 纬度: ${location.latitude}, 经度: ${location.longitude}`);

  bot.sendMessage(chatId,
    `✓ 收到位置信息:\n纬度: ${location.latitude}\n经度: ${location.longitude}`
  )
    .catch(err => console.error('处理位置失败:', err.message));
});

// ========== 15. 错误处理 ==========
bot.on('polling_error', (error) => {
  const message = (error && error.message) || String(error);
  const unauthorized = (error && error.statusCode === 401) || /401|Unauthorized/i.test(message);
  if (unauthorized) {
    disableTelegram(message);
    return;
  }
  if (telegramDisabled) return;
  console.error('❌ 轮询错误:', message);
});

bot.on('error', (error) => {
  const message = (error && error.message) || String(error);
  if (telegramDisabled) return;
  console.error('❌ Bot 错误:', message);
});

// ========== 16. 主动发送消息示例 ==========
// 定时发送消息（需要知道 chat_id）
function sendScheduledMessage(chatId, text) {
  bot.sendMessage(chatId, text)
    .then(() => {
      console.log(`✓ 定时消息已发送到: ${chatId}`);
    })
    .catch((error) => {
      console.error('✗ 发送定时消息失败:', error.message);
    });
}

// 示例: 每小时发送一次消息（取消注释使用）
// setInterval(() => {
//   sendScheduledMessage('YOUR_CHAT_ID', '⏰ 这是每小时的定时消息');
// }, 3600000);

// ========== 17. 批量发送消息 ==========
async function broadcastMessage(chatIds, text) {
  console.log(`开始群发消息给 ${chatIds.length} 个用户...`);

  for (const chatId of chatIds) {
    try {
      await bot.sendMessage(chatId, text);
      console.log(`✓ 已发送给: ${chatId}`);
      // 延迟避免触发速率限制
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`✗ 发送失败 ${chatId}:`, error.message);
    }
  }

  console.log('群发完成！');
}

// 使用示例:
// broadcastMessage(['chat_id_1', 'chat_id_2'], '📢 群发消息内容');

// ========== 18. 群聊专属功能 ==========

// /pin 命令 - 置顶消息（需要管理员权限）
bot.onText(/\/pin/, async (msg) => {
  const chatId = msg.chat.id;
  const chatType = msg.chat.type;

  // 只在群聊中有效
  if (chatType !== 'group' && chatType !== 'supergroup') {
    bot.sendMessage(chatId, '❌ 此命令只能在群组中使用');
    return;
  }

  // 检查是否回复了某条消息
  if (!msg.reply_to_message) {
    bot.sendMessage(chatId, '❌ 请回复要置顶的消息，然后使用 /pin');
    return;
  }

  try {
    await bot.pinChatMessage(chatId, msg.reply_to_message.message_id, {
      disable_notification: false
    });
    bot.sendMessage(chatId, '✅ 消息已置顶');
  } catch (err) {
    console.error('置顶失败:', err.message);
    bot.sendMessage(chatId, '❌ 置顶失败，Bot 可能没有管理员权限');
  }
});

// /unpin 命令 - 取消置顶
bot.onText(/\/unpin/, async (msg) => {
  const chatId = msg.chat.id;
  const chatType = msg.chat.type;

  if (chatType !== 'group' && chatType !== 'supergroup') {
    bot.sendMessage(chatId, '❌ 此命令只能在群组中使用');
    return;
  }

  try {
    if (msg.reply_to_message) {
      // 取消特定消息的置顶
      await bot.unpinChatMessage(chatId, {
        message_id: msg.reply_to_message.message_id
      });
    } else {
      // 取消所有置顶
      await bot.unpinAllChatMessages(chatId);
    }
    bot.sendMessage(chatId, '✅ 已取消置顶');
  } catch (err) {
    console.error('取消置顶失败:', err.message);
    bot.sendMessage(chatId, '❌ 操作失败');
  }
});

// /members 命令 - 获取群成员数
bot.onText(/\/members/, async (msg) => {
  const chatId = msg.chat.id;
  const chatType = msg.chat.type;

  if (chatType !== 'group' && chatType !== 'supergroup') {
    bot.sendMessage(chatId, '❌ 此命令只能在群组中使用');
    return;
  }

  try {
    const count = await bot.getChatMembersCount(chatId);
    bot.sendMessage(chatId, `👥 当前群组成员数: ${count}`);
  } catch (err) {
    console.error('获取成员数失败:', err.message);
    bot.sendMessage(chatId, '❌ 获取失败');
  }
});

// /poll 命令 - 创建投票
bot.onText(/\/poll/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendPoll(chatId, '📊 投票示例', [
    '选项 1',
    '选项 2',
    '选项 3',
    '选项 4'
  ], {
    is_anonymous: true,
    allows_multiple_answers: false
  })
    .then(() => console.log('投票发送成功'))
    .catch(err => console.error('发送投票失败:', err.message));
});

// 监听投票结果
bot.on('poll_answer', (pollAnswer) => {
  console.log(`[投票] 用户 ${pollAnswer.user.id} 投票了:`, pollAnswer.option_ids);
});

// ========== 19. 群聊事件监听 ==========

// 新成员加入
bot.on('new_chat_members', (msg) => {
  const chatId = msg.chat.id;
  const newMembers = msg.new_chat_members;

  newMembers.forEach(member => {
    const welcomeMsg = `👋 欢迎 ${member.first_name} 加入群组！`;
    bot.sendMessage(chatId, welcomeMsg)
      .catch(err => console.error('发送欢迎消息失败:', err.message));
  });
});

// 成员离开
bot.on('left_chat_member', (msg) => {
  const chatId = msg.chat.id;
  const leftMember = msg.left_chat_member;

  const goodbyeMsg = `👋 ${leftMember.first_name} 离开了群组`;
  bot.sendMessage(chatId, goodbyeMsg)
    .catch(err => console.error('发送离开消息失败:', err.message));
});

// 群组标题更改
bot.on('new_chat_title', (msg) => {
  const chatId = msg.chat.id;
  const newTitle = msg.new_chat_title;

  bot.sendMessage(chatId, `📝 群组名称已更改为: ${newTitle}`)
    .catch(err => console.error('发送标题更改通知失败:', err.message));
});

// 群组照片更改
bot.on('new_chat_photo', (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, '📷 群组头像已更新')
    .catch(err => console.error('发送头像更改通知失败:', err.message));
});

// ========== 20. 群组消息监听（调试用）==========
// 这个监听器会在其他处理器之前触发，用于调试
bot.on('message', (msg) => {
  // 只记录日志，不做处理
  const chatType = msg.chat.type;
  if (chatType === 'group' || chatType === 'supergroup') {
    console.log('=== 群聊消息详情 ===');
    console.log('Chat ID:', msg.chat.id);
    console.log('Chat Title:', msg.chat.title);
    console.log('User:', msg.from.first_name);
    console.log('Text:', msg.text);
    console.log('====================');
  }
});

// ========== 21. @提及检测（可选功能）==========
bot.on('message', (msg) => {
  if (!msg.text) return;

  const chatId = msg.chat.id;
  const chatType = msg.chat.type;

  // 只在群聊中检测 @提及
  if (chatType === 'group' || chatType === 'supergroup') {
    // 检测是否有 @mentions
    if (msg.entities) {
      const mentions = msg.entities.filter(entity => entity.type === 'mention');

      if (mentions.length > 0) {
        console.log(`[群聊提及] 在 ${msg.chat.title} 中检测到 @提及`);

        // 检查是否提及了 bot
        bot.getMe().then(botInfo => {
          const botUsername = '@' + botInfo.username;
          if (msg.text.includes(botUsername)) {
            console.log('✓ Bot 被提及了！');
            bot.sendMessage(chatId, `✋ 你提到我了！`, {
              reply_to_message_id: msg.message_id
            });
          }
        }).catch(err => console.error('获取 Bot 信息失败:', err.message));
      }
    }
  }
});

// ========== 22. 群组消息统计（示例）==========
const messageStats = new Map(); // 存储消息统计

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const chatType = msg.chat.type;

  if (chatType === 'group' || chatType === 'supergroup') {
    if (!messageStats.has(chatId)) {
      messageStats.set(chatId, {
        total: 0,
        users: new Map()
      });
    }

    const stats = messageStats.get(chatId);
    stats.total++;

    const userId = msg.from.id;
    const userName = msg.from.first_name;
    stats.users.set(userId, {
      name: userName,
      count: (stats.users.get(userId)?.count || 0) + 1
  });
  }
});

// /stats 命令 - 显示群组统计
bot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  const chatType = msg.chat.type;

  if (chatType !== 'group' && chatType !== 'supergroup') {
    bot.sendMessage(chatId, '❌ 此命令只能在群组中使用');
    return;
  }

  const stats = messageStats.get(chatId);

  if (!stats || stats.total === 0) {
    bot.sendMessage(chatId, '📊 暂无统计数据');
    return;
  }

  let statsMsg = `📊 群组消息统计:\n\n`;
  statsMsg += `总消息数: ${stats.total}\n`;
  statsMsg += `活跃用户数: ${stats.users.size}\n\n`;
  statsMsg += `最活跃用户 TOP 5:\n`;

  const topUsers = Array.from(stats.users.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  topUsers.forEach(([userId, userData], index) => {
    statsMsg += `${index + 1}. ${userData.name}: ${userData.count} 条消息\n`;
  });

  bot.sendMessage(chatId, statsMsg)
    .catch(err => console.error('发送统计失败:', err.message));
});

// ========== 启动完成 ==========
console.log('\n' + '='.repeat(50));
console.log('🤖 Telegram 模块已加载（连接成功后才会开始收消息）');
console.log('🌐 代理状态:', PROXY_CONFIG.enabled ? '已启用' : '未启用');
if (PROXY_CONFIG.enabled) {
  console.log('🔗 代理地址:', PROXY_CONFIG.url);
}
console.log('='.repeat(50) + '\n');
}