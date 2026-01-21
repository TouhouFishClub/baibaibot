/**
 * 洛奇服务器状态探测节点
 * 
 * 这是一个独立的探测服务，可以部署到任意服务器（如上海、广州等）
 * 用于检测游戏服务器的延迟，并通过 API 提供给主服务器调用
 * 
 * 启动方式: node probeServer.js
 * 默认端口: 3721 (可通过环境变量 PROBE_PORT 修改)
 * 
 * API 接口:
 * - GET /api/probe - 获取所有服务器延迟数据
 * - GET /api/probe/:serverId - 获取指定服务器延迟数据
 * - GET /api/health - 健康检查
 */

const http = require('http');
const net = require('net');
const url = require('url');

// 配置
const PORT = process.env.PROBE_PORT || 3721;
const PROBE_NAME = process.env.PROBE_NAME || '探测节点';
const PROBE_LOCATION = process.env.PROBE_LOCATION || '未知';

// 服务器配置（与主服务器保持一致）
const SERVERS = [
  {
    id: "yiluxia",
    name: "伊鲁夏",
    loginServer: { name: "登录服务器", ip: "211.147.76.44", port: 11000 },
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
    loginServer: { name: "登录服务器", ip: "61.164.61.3", port: 11000 },
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
      if (err.code === 'ECONNREFUSED') {
        resolve({ status: 'refused', latency: Date.now() - startTime });
      } else {
        resolve({ status: 'error', latency: -1 });
      }
    });
    
    socket.connect(port, ip);
  });
};

// 测试指定服务器
const testServer = async (server) => {
  const result = {
    id: server.id,
    name: server.name,
    loginServer: null,
    channels: []
  };
  
  // 测试登录服务器
  if (server.loginServer) {
    const loginResult = await testConnection(server.loginServer.ip, server.loginServer.port);
    result.loginServer = {
      ...server.loginServer,
      ...loginResult
    };
  }
  
  // 并行测试所有频道
  const channelPromises = server.channels.map(async (channel) => {
    const testResult = await testConnection(channel.ip, channel.port);
    return {
      ...channel,
      ...testResult
    };
  });
  
  result.channels = await Promise.all(channelPromises);
  return result;
};

// 测试所有服务器
const testAllServers = async () => {
  const results = [];
  for (const server of SERVERS) {
    const result = await testServer(server);
    results.push(result);
  }
  return results;
};

// 设置 CORS 头
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
};

// 发送 JSON 响应
const sendJson = (res, statusCode, data) => {
  setCorsHeaders(res);
  res.writeHead(statusCode);
  res.end(JSON.stringify(data, null, 2));
};

// HTTP 服务器
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // OPTIONS 请求（CORS 预检）
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }
  
  // 健康检查
  if (pathname === '/api/health') {
    sendJson(res, 200, {
      status: 'ok',
      probe: {
        name: PROBE_NAME,
        location: PROBE_LOCATION
      },
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  // 探测所有服务器
  if (pathname === '/api/probe') {
    try {
      const startTime = Date.now();
      const results = await testAllServers();
      const duration = Date.now() - startTime;
      
      sendJson(res, 200, {
        success: true,
        probe: {
          name: PROBE_NAME,
          location: PROBE_LOCATION
        },
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        data: results
      });
    } catch (error) {
      sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
    return;
  }
  
  // 探测指定服务器
  const probeMatch = pathname.match(/^\/api\/probe\/(\w+)$/);
  if (probeMatch) {
    const serverId = probeMatch[1];
    const server = SERVERS.find(s => s.id === serverId);
    
    if (!server) {
      sendJson(res, 404, {
        success: false,
        error: `Server '${serverId}' not found`
      });
      return;
    }
    
    try {
      const startTime = Date.now();
      const result = await testServer(server);
      const duration = Date.now() - startTime;
      
      sendJson(res, 200, {
        success: true,
        probe: {
          name: PROBE_NAME,
          location: PROBE_LOCATION
        },
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        data: result
      });
    } catch (error) {
      sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
    return;
  }
  
  // 404
  sendJson(res, 404, {
    success: false,
    error: 'Not found',
    availableEndpoints: [
      'GET /api/health - 健康检查',
      'GET /api/probe - 探测所有服务器',
      'GET /api/probe/:serverId - 探测指定服务器 (yiluxia/yate)'
    ]
  });
});

server.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`  洛奇服务器状态探测节点已启动`);
  console.log(`========================================`);
  console.log(`  节点名称: ${PROBE_NAME}`);
  console.log(`  节点位置: ${PROBE_LOCATION}`);
  console.log(`  监听端口: ${PORT}`);
  console.log(`----------------------------------------`);
  console.log(`  API 接口:`);
  console.log(`  - GET /api/health`);
  console.log(`  - GET /api/probe`);
  console.log(`  - GET /api/probe/:serverId`);
  console.log(`========================================`);
});

module.exports = { testConnection, testServer, testAllServers, SERVERS };
