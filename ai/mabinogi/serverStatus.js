const net = require('net');
const fs = require('fs');
const path = require('path');
const nodeHtmlToImage = require('node-html-to-image');
const font2base64 = require('node-font2base64');
const { IMAGE_DATA } = require(path.join(__dirname, '..', '..', 'baibaiConfigs.js'));

// 确保输出目录存在
const outputDir = path.join(IMAGE_DATA, 'mabi_other');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 字体加载
const Corp_Bold = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', 'font', 'Corp-Bold.otf'));
const MalbergTrial = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', 'font', 'MalbergTrial-Heavy.ttf'));

// 服务器配置
const SERVERS = [
  {
    id: "yiluxia",
    name: "伊鲁夏",
    ipPrefix: "211.147.76",
    channels: [
      { id: 1, name: "频道1", ip: "211.147.76.31", port: 11020 },
      { id: 2, name: "频道2", ip: "211.147.76.32", port: 11020 },
      { id: 3, name: "频道3", ip: "211.147.76.33", port: 11020 },
      { id: 4, name: "频道4", ip: "211.147.76.34", port: 11020 },
      { id: 5, name: "频道5", ip: "211.147.76.36", port: 11020 },
      { id: 6, name: "频道6", ip: "211.147.76.31", port: 11021 },
      { id: 7, name: "频道7", ip: "211.147.76.32", port: 11021 },
      { id: 8, name: "频道8", ip: "211.147.76.33", port: 11021 },
      { id: 9, name: "频道9", ip: "211.147.76.34", port: 11021 },
      { id: 10, name: "频道10", ip: "211.147.76.36", port: 11021 }
    ]
  },
  {
    id: "yate",
    name: "亚特",
    ipPrefix: "61.164.61",
    channels: [
      { id: 11, name: "频道1", ip: "61.164.61.10", port: 11020 },
      { id: 12, name: "频道2", ip: "61.164.61.11", port: 11020 },
      { id: 13, name: "频道3", ip: "61.164.61.12", port: 11020 },
      { id: 14, name: "频道4", ip: "61.164.61.13", port: 11020 },
      { id: 15, name: "频道5", ip: "61.164.61.14", port: 11020 },
      { id: 16, name: "频道6", ip: "61.164.61.10", port: 11021 },
      { id: 17, name: "频道7", ip: "61.164.61.11", port: 11021 },
      { id: 18, name: "频道8", ip: "61.164.61.12", port: 11021 },
      { id: 19, name: "频道9", ip: "61.164.61.13", port: 11021 },
      { id: 20, name: "频道10", ip: "61.164.61.14", port: 11021 }
    ]
  }
];

// 测试单个服务器连接
const testConnection = (ip, port, timeout = 3000) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      const latency = Date.now() - startTime;
      socket.destroy();
      resolve({ status: 'online', latency });
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ status: 'timeout', latency: -1 });
    });
    
    socket.on('error', (err) => {
      socket.destroy();
      // 连接被拒绝通常意味着服务器在线但端口关闭，或防火墙
      if (err.code === 'ECONNREFUSED') {
        resolve({ status: 'refused', latency: Date.now() - startTime });
      } else {
        resolve({ status: 'error', latency: -1 });
      }
    });
    
    socket.connect(port, ip);
  });
};

// 测试所有服务器
const testAllServers = async () => {
  const results = [];
  
  for (const server of SERVERS) {
    const serverResult = {
      id: server.id,
      name: server.name,
      channels: []
    };
    
    // 并行测试所有频道
    const channelPromises = server.channels.map(async (channel) => {
      const result = await testConnection(channel.ip, channel.port);
      return {
        ...channel,
        ...result
      };
    });
    
    serverResult.channels = await Promise.all(channelPromises);
    results.push(serverResult);
  }
  
  return results;
};

// 获取状态对应的颜色和图标
const getStatusStyle = (status, latency) => {
  if (status === 'online') {
    if (latency < 50) {
      return { color: '#00FF88', bg: 'rgba(0, 255, 136, 0.15)', icon: '●', text: '极佳' };
    } else if (latency < 100) {
      return { color: '#7CFF00', bg: 'rgba(124, 255, 0, 0.15)', icon: '●', text: '良好' };
    } else if (latency < 200) {
      return { color: '#FFD700', bg: 'rgba(255, 215, 0, 0.15)', icon: '●', text: '一般' };
    } else {
      return { color: '#FF8C00', bg: 'rgba(255, 140, 0, 0.15)', icon: '●', text: '较慢' };
    }
  } else if (status === 'refused') {
    return { color: '#FF6B6B', bg: 'rgba(255, 107, 107, 0.15)', icon: '◐', text: '拒绝' };
  } else if (status === 'timeout') {
    return { color: '#888888', bg: 'rgba(136, 136, 136, 0.15)', icon: '○', text: '超时' };
  } else {
    return { color: '#FF4444', bg: 'rgba(255, 68, 68, 0.15)', icon: '✕', text: '离线' };
  }
};

// 渲染状态图片
const renderStatusImage = async (results, callback) => {
  const output = path.join(IMAGE_DATA, 'mabi_other', 'server_status.png');
  const updateTime = new Date().toLocaleString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @font-face {
      font-family: 'Corp_Bold';
      src: url(${Corp_Bold}) format('opentype');
    }
    @font-face {
      font-family: 'MalbergTrial';
      src: url(${MalbergTrial}) format('truetype');
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: 520px;
      font-family: 'Microsoft YaHei', sans-serif;
    }
    .container {
      padding: 24px;
      background: linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      border-radius: 16px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 2px solid rgba(255, 255, 255, 0.1);
    }
    .title {
      font-size: 28px;
      font-weight: bold;
      background: linear-gradient(90deg, #00d4ff, #00ff88);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: 4px;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      font-family: 'Corp_Bold';
    }
    .server-section {
      margin-bottom: 20px;
    }
    .server-section:last-child {
      margin-bottom: 0;
    }
    .server-header {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
    }
    .server-name {
      font-size: 20px;
      font-weight: bold;
      color: #fff;
      margin-right: 12px;
    }
    .server-badge {
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-family: 'Corp_Bold';
    }
    .badge-online {
      background: rgba(0, 255, 136, 0.2);
      color: #00ff88;
      border: 1px solid rgba(0, 255, 136, 0.4);
    }
    .badge-partial {
      background: rgba(255, 215, 0, 0.2);
      color: #FFD700;
      border: 1px solid rgba(255, 215, 0, 0.4);
    }
    .badge-offline {
      background: rgba(255, 68, 68, 0.2);
      color: #FF4444;
      border: 1px solid rgba(255, 68, 68, 0.4);
    }
    .channels-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
    }
    .channel-card {
      padding: 10px 8px;
      border-radius: 8px;
      text-align: center;
      transition: all 0.2s;
    }
    .channel-name {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 4px;
      font-weight: 500;
    }
    .channel-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .status-icon {
      font-size: 10px;
    }
    .channel-latency {
      font-size: 12px;
      font-family: 'Corp_Bold';
    }
    .channel-text {
      font-size: 10px;
      margin-top: 2px;
      opacity: 0.8;
    }
    .footer {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .update-time {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
    }
    .legend {
      display: flex;
      gap: 12px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.5);
    }
    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">洛奇服务器状态</div>
      <div class="subtitle">MABINOGI SERVER STATUS</div>
    </div>
    
    ${results.map(server => {
      const onlineCount = server.channels.filter(c => c.status === 'online').length;
      const totalCount = server.channels.length;
      let badgeClass = 'badge-online';
      let badgeText = '全部在线';
      if (onlineCount === 0) {
        badgeClass = 'badge-offline';
        badgeText = '全部离线';
      } else if (onlineCount < totalCount) {
        badgeClass = 'badge-partial';
        badgeText = `${onlineCount}/${totalCount} 在线`;
      }
      
      return `
        <div class="server-section">
          <div class="server-header">
            <span class="server-name">${server.name}</span>
            <span class="server-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="channels-grid">
            ${server.channels.map(channel => {
              const style = getStatusStyle(channel.status, channel.latency);
              const latencyText = channel.latency >= 0 ? `${channel.latency}ms` : '--';
              return `
                <div class="channel-card" style="background: ${style.bg}; border: 1px solid ${style.color}33;">
                  <div class="channel-name">${channel.name}</div>
                  <div class="channel-status">
                    <span class="status-icon" style="color: ${style.color};">${style.icon}</span>
                    <span class="channel-latency" style="color: ${style.color};">${latencyText}</span>
                  </div>
                  <div class="channel-text" style="color: ${style.color};">${style.text}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('')}
    
    <div class="footer">
      <div class="update-time">更新时间: ${updateTime}</div>
      <div class="legend">
        <div class="legend-item"><div class="legend-dot" style="background: #00FF88;"></div>&lt;50ms</div>
        <div class="legend-item"><div class="legend-dot" style="background: #7CFF00;"></div>&lt;100ms</div>
        <div class="legend-item"><div class="legend-dot" style="background: #FFD700;"></div>&lt;200ms</div>
        <div class="legend-item"><div class="legend-dot" style="background: #FF8C00;"></div>&gt;200ms</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    await nodeHtmlToImage({
      output,
      html,
      puppeteerArgs: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });
    console.log('服务器状态图片生成成功！');
    callback(`[CQ:image,file=${path.join('send', 'mabi_other', 'server_status.png')}]`);
  } catch (error) {
    console.error('生成服务器状态图片失败:', error);
    callback('生成服务器状态图片失败，请稍后再试');
  }
};

// 主函数
const serverStatus = async (content, qq, groupId, callback) => {
  try {
    callback('正在检测服务器状态，请稍候...');
    const results = await testAllServers();
    await renderStatusImage(results, callback);
  } catch (error) {
    console.error('检测服务器状态失败:', error);
    callback('检测服务器状态失败，请稍后再试');
  }
};

module.exports = {
  serverStatus,
  testAllServers,
  SERVERS
};
