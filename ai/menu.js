const MongoClient = require('mongodb').MongoClient
const MONGO_URL = require('../baibaiConfigs').mongourl
const _ = require('lodash')
const path = require('path')
const nodeHtmlToImage = require('node-html-to-image')
const { IMAGE_DATA } = require(path.join(__dirname, '..', 'baibaiConfigs.js'))

let client

const renderMenu = async (group, callback, searchChars = []) => {
  try {
    let keywords = await client.db('db_bot').collection('cl_menu').find({g: parseInt(`${group}`)}).toArray()
    if(!keywords.length) {
      callback('该群组暂无菜单项，请使用 [菜单 增加 项目名] 添加菜单项')
      return
    }
    
    // 高亮匹配的字符
    const highlightText = (text) => {
      if (!searchChars.length) return text
      let result = ''
      for (const char of text) {
        if (searchChars.includes(char)) {
          result += `<span style="color: red;">${char}</span>`
        } else {
          result += char
        }
      }
      return result
    }
    
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Title</title>
  <style>
    * {
      border: 0;
      padding: 0;
      margin: 0;
    }
    body {
      width: 1040px;
      min-height: 20px;
      padding: 20px;
      box-sizing: border-box;
    }
    .main-table{
      border: 1px solid;
      border-collapse: collapse;
      width: 1000px;
    }
    .main-table tr td{
      border: 1px solid;
      padding: 3px 10px;
      box-sizing: border-box;
      width: 200px;
    }
  </style>
</head>
<body>
  <table class="main-table" id="body">
  ${_.chunk(keywords.map(x => highlightText(x.d)), 5).map(tr => `<tr>${tr.map(td => `<td>${td}</td>`).join('')}</tr>`).join('')}
  </table>
</body>
</html>`
  let output = path.join(IMAGE_DATA, 'menu', `${group}.png`)
  nodeHtmlToImage({
    output,
    html
  })
    .then(() => {
      console.log(`保存${group}.png成功！`)
      let imgMsg = `[CQ:image,file=${path.join('send', 'menu', `${group}.png`)}]`
      callback(imgMsg)
    })
    .catch(err => {
      console.error('生成菜单图片失败:', err)
      callback('生成菜单失败，请稍后重试')
    })
  } catch (error) {
    console.error('菜单渲染错误:', error)
    callback('菜单功能暂时不可用，请稍后重试')
  }
}

const menu = async (content, group, callback) => {
  if(!client) {
    try {
      client = await MongoClient.connect(MONGO_URL)
    } catch (e) {
      console.log('MONGO ERROR FOR MENU MODULE!!')
      console.log(e)
      callback('数据库连接失败，菜单功能暂时不可用')
      return
    }
  }
  try {
    let sp = content.split(' ').filter(x => x && x.indexOf('[CQ') == -1)
    switch (sp[1]) {
      case 'add':
      case '增加':
        sp = sp.splice(2)
        for(let i = 0; i < sp.length; i ++) {
          await client.db('db_bot').collection('cl_menu').save({
            g: group,
            d: sp[i]
          })
        }
        callback('保存成功')
        break
      case 'remove':
      case '删除':
        await client.db('db_bot').collection('cl_menu').remove({g: group, d: sp[2]})
        callback('已删除')
        break
      case 'help':
        callback(`[menu add xxx xxx] 或 [菜单 增加 xxx xxx]:\n 增加记录，可增加多条记录，使用空格分隔\n[menu remove xxx] 或 [菜单 删除 xxx]:\n 删除记录，每次仅可删除一条`)
        break
      default:
        // 将搜索词拆成单个字符用于高亮
        const searchChars = sp[1] ? [...sp[1]] : []
        await renderMenu(group, callback, searchChars)
    }
  } catch (error) {
    console.error('菜单操作错误:', error)
    callback('菜单操作失败，请稍后重试')
  }
}

module.exports = {
  menu
}
