// 材料出处数据 - 从materialSources.txt文件自动生成
// 这个文件在浏览器环境中使用，不依赖Node.js的require函数
// 最后更新时间: 2025/8/12 17:29:50

var MaterialSourcesData = {
  "附有深渊的宝珠": "塔赫杜因-佩斯皮亚德(困难)"
};

// 获取材料出处的函数（浏览器环境）
function getMaterialSourceInBrowser(materialName) {
  return MaterialSourcesData[materialName] || "？";
}