const fs = require('fs');
const request = require('request'); // 需要安装 request 模块

// 转换本地图片为Base64
function localImageToBase64(localImagePath) {
  const data = fs.readFileSync(localImagePath);
  return data.toString('base64');
}

// 转换网络图片为Base64
function remoteImageToBase64(remoteImageUrl, callback) {
  request.get({ url: remoteImageUrl, encoding: 'binary' }, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const data = Buffer.from(body, 'binary').toString('base64');
      callback(data);
    } else {
      console.error('无法下载图片:', error);
    }
  });
}

module.exports = {
  localImageToBase64,
  remoteImageToBase64
}

// // 用法示例
// const localImagePath = 'path/to/your/local/image.jpg';
// const remoteImageUrl = 'https://example.com/your/remote/image.jpg';
//
// // 转换本地图片为Base64
// const localImageBase64 = localImageToBase64(localImagePath);
// console.log('本地图片Base64:', localImageBase64);
//
// // 转换网络图片为Base64
// remoteImageToBase64(remoteImageUrl, (remoteImageBase64) => {
//   console.log('网络图片Base64:', remoteImageBase64);
// });
