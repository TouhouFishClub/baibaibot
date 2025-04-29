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
const { saveTxt, answer } = require('../lib/mongo.js');
const { BossWork } = require('../ai/mabinogi/BossWork/BossWork');
const { calendar } = require('../ai/calendar.js');
const { cal } = require('../ai/calculator');
const { menu } = require('../ai/menu');
const { mabiGacha, selectGachaGroup } = require('../ai/mabinogi/gacha/index');
const { tcArticle } = require('../ai/mabinogi/newArticle');

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
      },
      {
        path: '/openapi/uni',
        description: '通用内容存储和查询接口',
        params: [
          'content - 根据不同内容提供不同功能：',
          '- bosswork/boss/boss工作表：查询洛奇BOSS刷新时间表',
          '- xxx日历：查询xxx项目的日历',
          '- 日历设置xxx：设置日历',
          '- 日历修改xxx：修改日历',
          '- 日历删除xxx：删除日历',
          '- 选择日历xxx：选择特定日历进行修改',
          '- 选择删除xxx：选择特定日历进行删除',
          '- 关键词|内容：保存关键词和对应内容(问答模块)',
          '- 关键词|：删除关键词对应内容(问答模块)',
          '- 关键词：查询关键词对应内容(问答模块)',
          'group - 群组ID(必需)',
          'from - 用户ID(可选)',
          'name - 用户名称(可选，默认为OPENAPI-用户ID)',
          'groupName - 群组名称(可选，默认为OPENAPI-群组ID)'
        ]
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
 * 增强版回调处理函数，在没有结果时尝试使用cal函数
 * @param {Object} res - Express响应对象
 * @param {string} content - 用户输入内容
 * @returns {Function} 回调函数
 */
function createCallbackWithCalFallback(res, content) {
  let hasResponse = false;
  
  return function(result) {
    // console.log(`\n\n\n===\nresult: ${result}\n\n`)
    if (result) {
      hasResponse = true;
      // 使用原始callback处理结果
      createCallback(res)(result);
    } else {
      // 如果answer没有返回结果(result为空、null或undefined)，尝试使用cal函数
      const calResult = cal(content.trim());
      if (calResult) {
        res.json({
          status: 'ok',
          data: {
            type: 'text',
            message: `${content.trim()}=${calResult}`
          }
        });
      } else {
        // 如果cal也没有结果，返回错误状态
        res.json({
          status: 'error',
          message: '未找到相关内容'
        });
      }
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

/**
 * uni - 通用内容存储和查询接口
 * 支持多种操作，通过content参数判断
 * 对于问答模块：
 * - content=关键词：查询关键词对应内容
 * - content=关键词|内容：保存关键词和对应内容
 * - content=关键词|：删除关键词对应内容
 */
router.get('/uni', (req, res) => {
  try {
    // 获取并处理content参数
    let content = '';
    if (req.query && req.query.content) {
      try {
        content = decodeURIComponent(req.query.content);
      } catch (e) {
        content = req.query.content;
      }
    }
    
    // 获取其他参数
    const from = req.query && req.query.from ? req.query.from : '0';
    const group = req.query && req.query.group ? req.query.group : '0';
    
    // 为问答模块设置默认名称格式
    let name = 'API用户';
    if (req.query && req.query.name) {
      name = req.query.name;
    } else if (from !== '0') {
      name = `OPENAPI-${from}`;
    }
    
    let groupName = '';
    if (req.query && req.query.groupName) {
      groupName = req.query.groupName;
    } else if (group !== '0') {
      groupName = `OPENAPI-${group}`;
    }
    
    if (!content.trim()) {
      return res.json({
        status: 'error',
        message: '请提供content参数'
      });
    }
    
    // 根据content内容匹配不同功能
    if (content.toLowerCase() === 'bosswork' || content.toLowerCase() === 'boss' || content.startsWith('boss工作表')) {
      // BOSS工作表
      BossWork(from, group, createCallback(res));
    } else if (content.startsWith('日历设置')) {
      // 日历设置功能
      calendar(content.substring(4), from, group, createCallback(res));
    } else if (content.startsWith('日历修改')) {
      // 日历修改功能
      calendar(content.substring(4), from, group, createCallback(res), 'insert');
    } else if (content.startsWith('选择日历')) {
      // 日历选择功能
      calendar(content.substring(4), from, group, createCallback(res), 'insert-select');
    } else if (content.startsWith('日历删除')) {
      // 日历删除功能
      calendar(content.substring(4), from, group, createCallback(res), 'delete');
    } else if (content.startsWith('选择删除')) {
      // 日历删除选择功能
      calendar(content.substring(4), from, group, createCallback(res), 'delete-select');
    } else if (content.endsWith('日历')) {
      // 日历查询功能
      calendar(content.substring(0, content.length - 2), from, group, createCallback(res), 'search');
    } else if (content.startsWith('菜单') || content.startsWith('menu')) {
      // 菜单功能
      menu(content, group, createCallback(res));
    } else if (content === '洛奇来一发') {
      // 洛奇抽卡一次
      mabiGacha(from, group, createCallback(res), 1);
    } else if (content === '洛奇来十连') {
      // 洛奇抽卡十连
      mabiGacha(from, group, createCallback(res), 11);
    } else if (content === '洛奇来一单') {
      // 洛奇抽卡一单
      mabiGacha(from, group, createCallback(res), 60);
    } else if (content === '洛奇来十单') {
      // 洛奇抽卡十单
      mabiGacha(from, group, createCallback(res), 600);
    } else if (content.startsWith('洛奇蛋池')) {
      // 选择洛奇抽卡池
      selectGachaGroup(from, group, createCallback(res), content.substring(4).trim());
    } else if (content.toUpperCase().startsWith('TC公告')) {
      // 获取洛奇TC公告
      tcArticle(content.substring(4), createCallback(res));
    } else if (content.includes('|')) {
      // 包含"|"，执行保存或删除操作（问答模块）
      const parts = content.split('|');
      const key = parts[0].trim();
      const value = parts.length > 1 ? parts.slice(1).join('|').trim() : '';
      
      if (!key) {
        return res.json({
          status: 'error',
          message: '请提供关键词'
        });
      }
      
      // 如果value为空，执行删除操作
      saveTxt(key, value, name, groupName, createCallback(res), from, group);
    } else {
      // 默认为查询操作（问答模块）
      // 使用增强版回调，在answer没有结果时尝试cal函数
      answer(content.trim(), name, groupName, createCallbackWithCalFallback(res, content), group, from);
    }
  } catch (error) {
    handleError(res, error);
  }
});

module.exports = router;
