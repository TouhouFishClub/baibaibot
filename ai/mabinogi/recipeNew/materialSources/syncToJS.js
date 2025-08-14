const fs = require('fs');
const path = require('path');

/**
 * 将materialSources.txt的内容同步到MaterialSourcesData.js
 * 这样浏览器环境就能访问材料出处数据了
 */
function syncMaterialSourcesToJS() {
  const txtPath = path.join(__dirname, 'materialSources.txt');
  const jsPath = path.join(__dirname, 'MaterialSourcesData.js');
  
  if (!fs.existsSync(txtPath)) {
    console.log('materialSources.txt 文件不存在');
    return;
  }
  
  try {
    // 读取txt文件
    const content = fs.readFileSync(txtPath, 'utf-8');
    const lines = content.split('\n');
    
    const sources = {};
    
    lines.forEach(line => {
      line = line.trim();
      if (!line) return;
      
      const spaceIndex = line.indexOf(' ');
      if (spaceIndex === -1) return;
      
      const materialName = line.substring(0, spaceIndex);
      const sourceText = line.substring(spaceIndex + 1);
      
      sources[materialName] = sourceText;
    });
    
    // 生成JS文件内容
    const jsContent = `// 材料出处数据 - 从materialSources.txt文件自动生成
// 这个文件在浏览器环境中使用，不依赖Node.js的require函数
// 最后更新时间: ${new Date().toLocaleString()}

var MaterialSourcesData = ${JSON.stringify(sources, null, 2)};

// 获取材料出处的函数（浏览器环境）
function getMaterialSourceInBrowser(materialName) {
  return MaterialSourcesData[materialName] || "？";
}`;
    
    // 写入JS文件
    fs.writeFileSync(jsPath, jsContent, 'utf-8');
    
    console.log(`✅ 同步完成! 已将 ${Object.keys(sources).length} 个材料出处同步到 MaterialSourcesData.js`);
    console.log('📁 生成的文件:', jsPath);
    
  } catch (error) {
    console.error('❌ 同步失败:', error);
  }
}

// 如果作为脚本直接运行
if (require.main === module) {
  syncMaterialSourcesToJS();
}

module.exports = {
  syncMaterialSourcesToJS
};
