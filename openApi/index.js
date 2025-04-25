const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// 导入需要的功能函数
const { searchMabiRecipe } = require('../ai/mabinogi/recipeNew/searchRecipe');
const { mabiTelevision } = require('../ai/mabinogi/Television/new');
const { mabiGachaTv } = require('../ai/mabinogi/Television/gacha');
const { op } = require('../ai/mabinogi/optionset');
const { searchEquipUpgrade } = require('../ai/mabinogi/ItemUpgrade/index');

/**
 * 转换本地图片为Base64
 * @param {string} imagePath - 图片路径
 * @returns {string} - base64编码的图片数据
 */
function imageToBase64(imagePath) {
  try {
    // 根路径，对应CQ码中send/路径
    const basePath = path.join(__dirname, '..', '..', 'coolq-data', 'cq', 'data', 'image');
    const fullPath = path.join(basePath, imagePath);
    
    if (fs.existsSync(fullPath)) {
      const data = fs.readFileSync(fullPath);
      return data.toString('base64');
    } else {
      console.error(`图片文件不存在: ${fullPath}`);
      return null;
    }
  } catch (error) {
    console.error('转换图片为base64时出错:', error);
    return null;
  }
}

/**
 * 添加API根路由，提供基本使用说明
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    api: 'BaiBai Bot OpenAPI',
    version: '1.0.0',
    endpoints: [
      {
        path: '/openapi/mbi',
        description: '洛奇配方查询',
        params: ['content - 查询内容']
      },
      {
        path: '/openapi/mbd',
        description: '洛奇配方查询(带详情)',
        params: ['content - 查询内容']
      },
      {
        path: '/openapi/opt',
        description: '洛奇释放卷查询',
        params: ['content - 查询内容', 'from - 用户ID(可选)', 'name - 用户名称(可选)']
      },
      {
        path: '/openapi/meu',
        description: '洛奇装备升级查询',
        params: ['content - 查询内容', 'from - 用户ID(可选)', 'groupid - 群组ID(可选)']
      },
      {
        path: '/openapi/mbtv',
        description: '洛奇电视查询',
        params: ['content - 查询内容', 'from - 用户ID(可选)']
      },
      {
        path: '/openapi/mbcd',
        description: '洛奇抽卡电视查询',
        params: ['content - 查询内容', 'from - 用户ID(可选)']
      }
    ],
    example: '/openapi/mbi?content=工程手套'
  });
});

/**
 * 通用回调处理函数，将结果发送给客户端
 * @param {Object} res - Express响应对象
 * @returns {Function} 回调函数
 */
function createCallback(res) {
  return function(result) {
    // 检查result是否是图片路径字符串，如果是则进行特殊处理
    if (typeof result === 'string' && result.includes('[CQ:image,file=')) {
      // 提取图片路径
      const imgPathMatch = result.match(/\[CQ:image,file=([^\]]+)\]/);
      const imgPath = imgPathMatch ? imgPathMatch[1] : null;
      
      if (imgPath) {
        // 转换图片为base64
        const base64Data = imageToBase64(imgPath);
        if (base64Data) {
          res.json({
            status: 'ok',
            data: {
              type: 'image',
              path: imgPath,
              base64: base64Data,
              message: result.replace(/\[CQ:image,file=[^\]]+\]/, '').trim()
            }
          });
        } else {
          // 图片转换失败，返回路径信息
          res.json({
            status: 'ok',
            data: {
              type: 'image',
              path: imgPath,
              message: result.replace(/\[CQ:image,file=[^\]]+\]/, '').trim(),
              error: '图片转换失败'
            }
          });
        }
      } else {
        res.json({
          status: 'ok',
          data: {
            type: 'text',
            message: result
          }
        });
      }
    } else {
      res.json({
        status: 'ok',
        data: {
          type: 'text',
          message: result
        }
      });
    }
  };
}

/**
 * 处理错误
 * @param {Object} res - Express响应对象
 * @param {Error} error - 错误对象
 */
function handleError(res, error) {
  console.error('API错误:', error);
  res.status(500).json({
    status: 'error',
    message: '处理请求时发生错误'
  });
}

/**
 * mbi - 洛奇配方查询
 */
router.get('/mbi', (req, res) => {
  try {
    let content = '';
    if (req.query && req.query.content) {
      try {
        content = decodeURIComponent(req.query.content);
      } catch (e) {
        content = req.query.content;
      }
    }
    
    if (!content.trim()) {
      return res.json({
        status: 'error',
        message: '请提供查询内容'
      });
    }
    
    searchMabiRecipe(content, createCallback(res));
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * mbd - 洛奇配方查询(带详情)
 */
router.get('/mbd', (req, res) => {
  try {
    let content = '';
    if (req.query && req.query.content) {
      try {
        content = decodeURIComponent(req.query.content);
      } catch (e) {
        content = req.query.content;
      }
    }
    
    if (!content.trim()) {
      return res.json({
        status: 'error',
        message: '请提供查询内容'
      });
    }
    
    searchMabiRecipe(content, createCallback(res), true);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * opt - 洛奇释放卷查询
 */
router.get('/opt', (req, res) => {
  try {
    let content = '';
    if (req.query && req.query.content) {
      try {
        content = decodeURIComponent(req.query.content);
      } catch (e) {
        content = req.query.content;
      }
    }
    const from = req.query && req.query.from ? req.query.from : '0';
    const name = req.query && req.query.name ? req.query.name : 'API用户';
    
    if (!content.trim()) {
      return res.json({
        status: 'error',
        message: '请提供查询内容'
      });
    }
    
    // 使用'html'格式而不是'json'，因为opt函数没有处理json格式的逻辑
    // 我们在createCallback中会处理响应格式转换
    op(from, name, content, 'html', createCallback(res));
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * meu - 洛奇装备升级查询
 */
router.get('/meu', (req, res) => {
  try {
    let content = '';
    if (req.query && req.query.content) {
      try {
        content = decodeURIComponent(req.query.content);
      } catch (e) {
        content = req.query.content;
      }
    }
    const from = req.query && req.query.from ? req.query.from : '0';
    const groupid = req.query && req.query.groupid ? req.query.groupid : '0';
    
    if (!content.trim()) {
      return res.json({
        status: 'error',
        message: '请提供查询内容'
      });
    }
    
    searchEquipUpgrade(from, groupid, content, createCallback(res));
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * mbtv - 洛奇电视查询
 */
router.get('/mbtv', (req, res) => {
  try {
    let content = '';
    if (req.query && req.query.content) {
      try {
        content = decodeURIComponent(req.query.content);
      } catch (e) {
        content = req.query.content;
      }
    }
    const from = req.query && req.query.from ? req.query.from : '0';
    
    mabiTelevision(content, from, createCallback(res)).catch(err => {
      handleError(res, err);
    });
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * mbcd - 洛奇抽卡电视查询
 */
router.get('/mbcd', (req, res) => {
  try {
    let content = '';
    if (req.query && req.query.content) {
      try {
        content = decodeURIComponent(req.query.content);
      } catch (e) {
        content = req.query.content;
      }
    }
    const from = req.query && req.query.from ? req.query.from : '0';
    
    mabiGachaTv(content, from, createCallback(res)).catch(err => {
      handleError(res, err);
    });
  } catch (error) {
    handleError(res, error);
  }
});

module.exports = router;
