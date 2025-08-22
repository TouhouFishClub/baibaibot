const fs = require('fs');
const path = require('path');

// 材料出处数据映射
let materialSourcesMap = new Map();
let isLoaded = false;

/**
 * 加载材料出处数据文件
 * @param {string} filePath - 材料出处文件路径
 */
function loadMaterialSources(filePath = null) {
  try {
    // 默认文件路径
    const defaultPath = path.join(__dirname, '..', 'materialSources', 'materialSources.txt');
    const targetPath = filePath || defaultPath;
    
    if (!fs.existsSync(targetPath)) {
      console.log('材料出处文件不存在:', targetPath);
      return;
    }

    const content = fs.readFileSync(targetPath, 'utf-8');
    const lines = content.split('\n');
    
    materialSourcesMap.clear();
    
    lines.forEach(line => {
      line = line.trim();
      if (!line) return;
      
      // 解析格式: 材料名 出处1<br/>出处2
      const spaceIndex = line.indexOf(' ');
      if (spaceIndex === -1) return;
      
      const materialName = line.substring(0, spaceIndex);
      const sources = line.substring(spaceIndex + 1);
      
      materialSourcesMap.set(materialName, sources);
    });
    
    isLoaded = true;
    console.log(`成功加载 ${materialSourcesMap.size} 个材料出处信息`);
    
  } catch (error) {
    console.error('加载材料出处文件时出错:', error);
  }
}

/**
 * 获取材料的出处信息
 * @param {string} materialName - 材料名称
 * @returns {string} - 出处信息，如果没有找到返回原始的"？"
 */
function getMaterialSource(materialName) {
  if (!isLoaded) {
    loadMaterialSources();
  }
  
  return materialSourcesMap.get(materialName) || '？';
}

/**
 * 重新加载材料出处数据
 */
function reloadMaterialSources() {
  isLoaded = false;
  loadMaterialSources();
}

module.exports = {
  loadMaterialSources,
  getMaterialSource,
  reloadMaterialSources
};
