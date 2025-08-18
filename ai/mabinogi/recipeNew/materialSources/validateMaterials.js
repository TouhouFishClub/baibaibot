const fs = require('fs');
const path = require('path');

/**
 * 验证materialSources.txt中的所有材料是否在Item.js中存在
 */
function validateAllMaterials() {
  const txtPath = path.join(__dirname, 'materialSources.txt');
  const itemJsPath = path.join(__dirname, '..', 'js', 'Item.js');
  
  if (!fs.existsSync(txtPath)) {
    console.log('❌ materialSources.txt 文件不存在');
    return;
  }
  
  if (!fs.existsSync(itemJsPath)) {
    console.log('❌ Item.js 文件不存在');
    return;
  }
  
  try {
    // 读取文件
    const txtContent = fs.readFileSync(txtPath, 'utf-8');
    const itemContent = fs.readFileSync(itemJsPath, 'utf-8');
    
    const lines = txtContent.split('\n');
    const materials = [];
    const validMaterials = [];
    const invalidMaterials = [];
    
    // 解析材料列表
    lines.forEach(line => {
      line = line.trim();
      if (!line) return;
      
      const spaceIndex = line.indexOf(' ');
      if (spaceIndex === -1) return;
      
      const materialName = line.substring(0, spaceIndex);
      materials.push(materialName);
    });
    
    // 验证每个材料
    materials.forEach(materialName => {
      if (itemContent.includes(`"${materialName}"`)) {
        validMaterials.push(materialName);
      } else {
        invalidMaterials.push(materialName);
      }
    });
    
    // 输出结果
    console.log('📊 材料验证结果');
    console.log('================');
    console.log(`总材料数: ${materials.length}`);
    console.log(`✅ 有效材料: ${validMaterials.length}`);
    console.log(`❌ 无效材料: ${invalidMaterials.length}`);
    
    if (validMaterials.length > 0) {
      console.log('\n✅ 有效材料列表:');
      validMaterials.forEach(name => console.log(`  - ${name}`));
    }
    
    if (invalidMaterials.length > 0) {
      console.log('\n❌ 无效材料列表 (在Item.js中不存在):');
      invalidMaterials.forEach(name => console.log(`  - ${name}`));
      console.log('\n⚠️  建议删除这些无效材料的出处信息');
    }
    
    if (invalidMaterials.length === 0) {
      console.log('\n🎉 所有材料都有效！');
    }
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
  }
}

// 如果作为脚本直接运行
if (require.main === module) {
  validateAllMaterials();
}

module.exports = {
  validateAllMaterials
};




