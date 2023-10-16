const WebSocket = require('ws');
const http = require('http');
const {handleMsg} = require('./baibai2')
const wsport = 30015

// 创建一个 HTTP 服务器
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server is running.');
});

// 创建 WebSocket 服务器，将其与 HTTP 服务器关联
const wss = new WebSocket.Server({ server });

// 事件处理：当 WebSocket 连接建立时
wss.on('connection', (ws) => {
  console.log('WebSocket connection established.');

  // 事件处理：当收到消息时
  ws.on('message', (message) => {
    // console.log(`Received message: ${message}`);
    let context = JSON.parse(message.toString())

    if(context.message == 'HELLO') {
      console.log(`\n\n\n TARGET \n\n\n`)
      ws.send(JSON.stringify({
        "action": "send_message",
        "params": {
          "detail_type": "group",
          "group_id": context.group_id,
          "message": 'WORLD'
        }
      }));
      return
    }

    handleMsg(context, wsport, Object.assign({
      reverseWs: true,
      ws,
    }))
  });
});

// 启动 HTTP 服务器，监听指定端口
server.listen(wsport, () => {
  console.log(`HTTP server and WebSocket server are listening on port ${port}`);
});
