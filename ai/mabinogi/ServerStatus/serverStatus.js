const net = require('net');
const http = require('http');
const fs = require('fs');
const path = require('path');
const nodeHtmlToImage = require('node-html-to-image');
const font2base64 = require('node-font2base64');
const { IMAGE_DATA } = require(path.join(__dirname, '..', '..', '..', 'baibaiConfigs.js'));

// ============================================================
// 探测节点配置 - 从.secret.json读取
// ============================================================
const loadProbeNodes = () => {
  try {
    const secretPath = path.join(__dirname, '.secret.json');
    const secretData = JSON.parse(fs.readFileSync(secretPath, 'utf-8'));
    return secretData.PROBE_NODES || [];
  } catch (error) {
    console.error('加载探测节点配置失败:', error.message);
    // 默认返回本地节点
    return [{ id: 'beijing', name: '北京', type: 'local', enabled: true }];
  }
};

const PROBE_NODES = loadProbeNodes();

// 确保输出目录存在
const outputDir = path.join(IMAGE_DATA, 'mabi_other');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 字体加载
const Corp_Bold = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', '..', 'font', 'Corp-Bold.otf'));
const MalbergTrial = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', '..', 'font', 'MalbergTrial-Heavy.ttf'));

// 服务器配置
const SERVERS = [
  {
    id: "yiluxia",
    name: "伊鲁夏",
    ipPrefix: "211.147.76",
    loginServer: { name: "登录服务器", ip: "211.147.76.44", port: 11000 },
    // chatServer: { name: "聊天服务器", ip: "211.147.76.47", port: 11000 },
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
    loginServer: { name: "登录服务器", ip: "61.164.61.3", port: 11000 },
    // chatServer: { name: "聊天服务器", ip: "61.164.61.2", port: 11000 },
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
      loginServer: null,
      chatServer: null,
      channels: []
    };
    
    // 测试登录服务器（如果存在）
    if (server.loginServer) {
      const loginResult = await testConnection(server.loginServer.ip, server.loginServer.port);
      serverResult.loginServer = {
        ...server.loginServer,
        ...loginResult
      };
    }
    
    // 测试聊天服务器（如果存在）
    if (server.chatServer) {
      const chatResult = await testConnection(server.chatServer.ip, server.chatServer.port);
      serverResult.chatServer = {
        ...server.chatServer,
        ...chatResult
      };
    }
    
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

// 从远程探测节点获取数据
const fetchRemoteProbe = (url, timeout = 10000) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = http.get(url, { timeout }, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success && json.data) {
            resolve({
              success: true,
              data: json.data,
              latency: Date.now() - startTime
            });
          } else {
            resolve({ success: false, error: json.error || 'Invalid response' });
          }
        } catch (e) {
          resolve({ success: false, error: 'Parse error' });
        }
      });
    });
    
    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
  });
};

// 从所有启用的探测节点获取数据
const testAllNodes = async () => {
  const enabledNodes = PROBE_NODES.filter(node => node.enabled);
  const nodeResults = [];
  
  for (const node of enabledNodes) {
    const nodeResult = {
      id: node.id,
      name: node.name,
      type: node.type,
      success: false,
      data: null,
      error: null
    };
    
    if (node.type === 'local') {
      // 本地检测
      try {
        nodeResult.data = await testAllServers();
        nodeResult.success = true;
      } catch (error) {
        nodeResult.error = error.message;
      }
    } else if (node.type === 'remote') {
      // 远程探测节点
      const result = await fetchRemoteProbe(node.url);
      if (result.success) {
        nodeResult.data = result.data;
        nodeResult.success = true;
        nodeResult.latency = result.latency;
      } else {
        nodeResult.error = result.error;
      }
    }
    
    nodeResults.push(nodeResult);
  }
  
  return nodeResults;
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
  } else if (status === 'maintenance') {
    return { color: '#888888', bg: 'rgba(136, 136, 136, 0.15)', icon: '🔧', text: '维护中' };
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
    .badge-maintenance {
      background: rgba(136, 136, 136, 0.2);
      color: #888888;
      border: 1px solid rgba(136, 136, 136, 0.4);
    }
    .login-server {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 14px;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .login-label {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.9);
      font-weight: 500;
    }
    .login-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-family: 'Corp_Bold';
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
      // 检查登录服务器是否超时，如果超时则整个服务器处于维护状态
      const isLoginTimeout = server.loginServer && server.loginServer.status === 'timeout';
      
      const onlineCount = server.channels.filter(c => c.status === 'online').length;
      const totalCount = server.channels.length;
      let badgeClass = 'badge-online';
      let badgeText = '全部在线';
      
      if (isLoginTimeout) {
        badgeClass = 'badge-maintenance';
        badgeText = '维护中';
      } else if (onlineCount === 0) {
        badgeClass = 'badge-offline';
        badgeText = '全部离线';
      } else if (onlineCount < totalCount) {
        badgeClass = 'badge-partial';
        badgeText = `${onlineCount}/${totalCount} 在线`;
      }
      
      // 登录服务器状态 - 只显示在线/离线
      let loginServerHtml = '';
      if (server.loginServer) {
        const isOnline = server.loginServer.status === 'online';
        const statusText = isOnline ? '在线' : '离线';
        const statusColor = isOnline ? '#00ff88' : '#FF4444';
        const statusBg = isOnline ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 68, 68, 0.15)';
        const statusIcon = isOnline ? '●' : '○';
        loginServerHtml = `
          <div class="login-server" style="background: ${statusBg}; border: 1px solid ${statusColor}33;">
            <span class="login-label">🔐 ${server.loginServer.name}</span>
            <span class="login-status">
              <span style="color: ${statusColor};">${statusIcon}</span>
              <span style="color: ${statusColor};">${statusText}</span>
            </span>
          </div>
        `;
      }
      
      // 聊天服务器状态
      let chatServerHtml = '';
      if (server.chatServer) {
        const chatStyle = getStatusStyle(server.chatServer.status, server.chatServer.latency);
        const chatLatency = server.chatServer.latency >= 0 ? `${server.chatServer.latency}ms` : '--';
        chatServerHtml = `
          <div class="login-server" style="background: ${chatStyle.bg}; border: 1px solid ${chatStyle.color}33;">
            <span class="login-label">💬 ${server.chatServer.name}</span>
            <span class="login-status">
              <span style="color: ${chatStyle.color};">${chatStyle.icon}</span>
              <span style="color: ${chatStyle.color};">${chatLatency}</span>
              <span style="color: ${chatStyle.color}; opacity: 0.8;">${chatStyle.text}</span>
            </span>
          </div>
        `;
      }
      
      return `
        <div class="server-section">
          <div class="server-header">
            <span class="server-name">${server.name}</span>
            <span class="server-badge ${badgeClass}">${badgeText}</span>
          </div>
          ${loginServerHtml}
          ${chatServerHtml}
          <div class="channels-grid">
            ${server.channels.map(channel => {
              // 如果登录服务器超时，所有频道显示为维护中
              const channelStatus = isLoginTimeout ? 'maintenance' : channel.status;
              const channelLatency = isLoginTimeout ? -1 : channel.latency;
              const style = getStatusStyle(channelStatus, channelLatency);
              const latencyText = channelLatency >= 0 ? `${channelLatency}ms` : '--';
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

// 渲染多节点状态图片（合并显示模式）
const renderMultiNodeStatusImage = async (nodeResults, callback) => {
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

  // 获取所有成功的节点
  const successNodes = nodeResults.filter(n => n.success);
  
  // 如果没有成功的节点，使用错误提示
  if (successNodes.length === 0) {
    callback('所有探测节点都无法获取数据，请稍后再试');
    return;
  }

  // 找到本地（北京）节点用于登录服务器判断
  const localNode = successNodes.find(n => n.type === 'local') || successNodes[0];

  // 整合数据：按服务器和频道聚合所有节点的数据
  const mergedData = {};
  
  // 使用第一个成功节点的数据作为基础结构
  const baseData = successNodes[0].data;
  baseData.forEach(server => {
    mergedData[server.id] = {
      id: server.id,
      name: server.name,
      loginServer: null,  // 只存储本地节点的登录服务器数据
      channels: {}        // channelId -> { nodeId -> channelData }
    };
    
    // 初始化频道结构
    server.channels.forEach(channel => {
      mergedData[server.id].channels[channel.id] = {
        id: channel.id,
        name: channel.name,
        nodes: {}
      };
    });
  });
  
  // 填充所有节点的数据
  successNodes.forEach(node => {
    if (!node.data) return;
    node.data.forEach(server => {
      if (!mergedData[server.id]) return;
      
      // 登录服务器数据 - 只记录本地（北京）节点的数据
      if (server.loginServer && node.id === localNode.id) {
        mergedData[server.id].loginServer = {
          nodeName: node.name,
          ...server.loginServer
        };
      }
      
      // 频道数据 - 所有节点都记录
      server.channels.forEach(channel => {
        if (mergedData[server.id].channels[channel.id]) {
          mergedData[server.id].channels[channel.id].nodes[node.id] = {
            nodeName: node.name,
            status: channel.status,
            latency: channel.latency
          };
        }
      });
    });
  });

  // 判断服务器是否处于维护状态（本地节点的登录服务器离线/超时即为维护）
  const isServerMaintenance = (serverId) => {
    const loginData = mergedData[serverId].loginServer;
    if (!loginData) return false;
    return loginData.status === 'timeout' || loginData.status === 'error' || loginData.status === 'refused';
  };

  // 动态计算图片宽度 - 根据节点数量调整
  const nodeCount = successNodes.length;
  // 每个节点需要约40px宽度来显示名称+延迟，加上间距
  // 基础宽度针对2节点优化，每增加节点需要更多空间
  const widthByNodeCount = {
    1: 520,
    2: 580,
    3: 720,
    4: 860,
    5: 1000
  };
  const imageWidth = widthByNodeCount[nodeCount] || (520 + nodeCount * 100);

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
      width: ${imageWidth}px;
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
    .nodes-legend {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-bottom: 16px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    }
    .node-legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.8);
    }
    .node-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
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
      margin-bottom: 10px;
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
    .badge-maintenance {
      background: rgba(136, 136, 136, 0.2);
      color: #888888;
      border: 1px solid rgba(136, 136, 136, 0.4);
    }
    .login-server {
      display: flex;
      align-items: center;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .login-label {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.9);
      font-weight: 500;
      margin-right: 16px;
      min-width: 80px;
    }
    .login-nodes {
      display: flex;
      gap: 16px;
      flex: 1;
    }
    .login-node-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .login-node-name {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.9);
    }
    .login-node-latency {
      font-size: 13px;
      font-family: 'Corp_Bold';
    }
    .login-node-status {
      font-size: 9px;
    }
    .channels-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
    }
    .channel-card {
      padding: 10px 4px 8px;
      border-radius: 8px;
      text-align: center;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      overflow: hidden;
    }
    .channel-name {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.95);
      margin-bottom: 8px;
      font-weight: 600;
    }
    .channel-nodes {
      display: flex;
      justify-content: center;
      gap: ${nodeCount > 2 ? '6px' : '12px'};
      flex-wrap: wrap;
    }
    .channel-node-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0px;
      min-width: ${nodeCount > 3 ? '28px' : '32px'};
    }
    .channel-node-name {
      font-size: ${nodeCount > 3 ? '8px' : '9px'};
      color: rgba(255, 255, 255, 0.9);
    }
    .channel-node-latency {
      font-size: ${nodeCount > 3 ? '10px' : '12px'};
      font-family: 'Corp_Bold';
    }
    .channel-node-status {
      font-size: ${nodeCount > 3 ? '8px' : '9px'};
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
    
    <div class="nodes-legend">
      ${successNodes.map((node, index) => {
        const colors = ['#00d4ff', '#00ff88', '#ff6b9d', '#ffd700', '#ff8c00'];
        return `
          <div class="node-legend-item">
            <div class="node-dot" style="background: ${colors[index % colors.length]};"></div>
            <span>${node.name}</span>
          </div>
        `;
      }).join('')}
    </div>
    
    ${Object.values(mergedData).map(server => {
      const isMaintenance = isServerMaintenance(server.id);
      
      // 计算在线频道数（基于第一个节点）
      const channels = Object.values(server.channels);
      const firstNodeId = successNodes[0].id;
      const onlineCount = channels.filter(ch => 
        ch.nodes[firstNodeId] && ch.nodes[firstNodeId].status === 'online'
      ).length;
      const totalCount = channels.length;
      
      let badgeClass = 'badge-online';
      let badgeText = '全部在线';
      if (isMaintenance) {
        badgeClass = 'badge-maintenance';
        badgeText = '维护中';
      } else if (onlineCount === 0) {
        badgeClass = 'badge-offline';
        badgeText = '全部离线';
      } else if (onlineCount < totalCount) {
        badgeClass = 'badge-partial';
        badgeText = onlineCount + '/' + totalCount + ' 在线';
      }
      
      return `
        <div class="server-section">
          <div class="server-header">
            <span class="server-name">${server.name}</span>
            <span class="server-badge ${badgeClass}">${badgeText}</span>
          </div>
          
          ${server.loginServer ? `
            <div class="login-server">
              <span class="login-label">🔐 登录服务器</span>
              <div class="login-nodes">
                ${(() => {
                  const loginData = server.loginServer;
                  const isOnline = loginData.status === 'online';
                  const statusText = isOnline ? '在线' : '离线';
                  const statusColor = isOnline ? '#00ff88' : '#FF4444';
                  const statusIcon = isOnline ? '●' : '○';
                  return `
                    <div class="login-node-item">
                      <span class="login-node-latency" style="color: ${statusColor};">${statusIcon} ${statusText}</span>
                    </div>
                  `;
                })()}
              </div>
            </div>
          ` : ''}
          
          <div class="channels-grid">
            ${channels.map(channel => {
              return `
                <div class="channel-card">
                  <div class="channel-name">${channel.name}</div>
                  <div class="channel-nodes">
                    ${successNodes.map((node, index) => {
                      const nodeData = channel.nodes[node.id];
                      if (!nodeData) return '';
                      
                      const channelStatus = isMaintenance ? 'maintenance' : nodeData.status;
                      const channelLatency = isMaintenance ? -1 : nodeData.latency;
                      const style = getStatusStyle(channelStatus, channelLatency);
                      const latencyText = channelLatency >= 0 ? channelLatency + 'ms' : '--';
                      
                      return `
                        <div class="channel-node-item">
                          <span class="channel-node-name">${node.name}</span>
                          <span class="channel-node-latency" style="color: ${style.color};">${latencyText}</span>
                          <span class="channel-node-status" style="color: ${style.color};">${style.text}</span>
                        </div>
                      `;
                    }).join('')}
                  </div>
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
    
    // 检查是否有多个启用的探测节点
    const enabledNodes = PROBE_NODES.filter(n => n.enabled);
    
    if (enabledNodes.length > 1 || enabledNodes.some(n => n.type === 'remote')) {
      // 多节点模式
      const nodeResults = await testAllNodes();
      await renderMultiNodeStatusImage(nodeResults, callback);
    } else {
      // 单节点模式（向后兼容）
      const results = await testAllServers();
      await renderStatusImage(results, callback);
    }
  } catch (error) {
    console.error('检测服务器状态失败:', error);
    callback('检测服务器状态失败，请稍后再试');
  }
};

module.exports = {
  serverStatus,
  testAllServers,
  testAllNodes,
  fetchRemoteProbe,
  SERVERS,
  PROBE_NODES
};
