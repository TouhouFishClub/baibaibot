const fs = require('fs')
const path = require('path')
const { IMAGE_DATA } = require(path.join(__dirname, '..', '..', '..', 'baibaiConfigs.js'))
const puppeteer = require('puppeteer');

const renderRecipeImage = async (data, name, showDesc = false, callback, msg = '', order = 'IF') => {
  let {skillId, itemId} = data

  const browser = await puppeteer.launch(); // 启动浏览器
  const page = await browser.newPage(); // 打开一个新页面

  // 导航到本地网页
  await page.goto('file://' + __dirname + '/ErinnFormula.html'); // 将路径替换为你的本地网页路径

  // 等待一段时间，确保网页加载完成
  await page.waitForTimeout(1000); // 可根据需要调整等待时间

  // 查找页面中的某个元素，例如一个按钮，然后模拟点击它
  await page.click(`#Skill${skillId}`); // 将选择器替换为你要点击的元素的实际选择器

  // 等待一段时间，确保点击操作完成或页面加载完成
  await page.waitForTimeout(500); // 可根据需要调整等待时间

  // 查找页面中的某个元素，例如一个按钮，然后模拟点击它
  await page.click(`#Cuisine${itemId}`); // 将选择器替换为你要点击的元素的实际选择器

  // 等待一段时间，确保点击操作完成或页面加载完成
  await page.waitForTimeout(500); // 可根据需要调整等待时间

  // 获取特定元素的位置和尺寸
  if(showDesc) {
    await page.addStyleTag({ content: '#MainBody { height: 10000px; }' }); // 替换为你自定义的 CSS
  }
  const element = await page.$(showDesc ? '#MainBodySpan' : '#MainBody'); // 将选择器替换为你要截取的元素的选择器

  const boundingBox = await element.boundingBox();

  const output = path.join(IMAGE_DATA, 'mabi_recipe', `${name}.png`)

  if (boundingBox) {
    // 截取特定区域并保存为图片
    await page.screenshot({
      path: output,
      clip: {
        x: boundingBox.x,
        y: boundingBox.y,
        width: boundingBox.width,
        height: boundingBox.height
      }
    });

    console.log(`保存${name}.png成功！`)
    let imgMsg = `[CQ:image,file=${path.join('send', 'mabi_recipe', `${name}.png`)}]`, mixMsg = ''
    switch(order){
      case 'IF':
        mixMsg = `${imgMsg}${msg.length ? `\n${msg}` : ''}`
        break
      case 'MF':
        mixMsg = `${msg.length ? `${msg}\n` : ''}${imgMsg}`
        break
    }
    callback(mixMsg)

  } else {
    console.error('Element not found or not visible');
  }

  await browser.close(); // 关闭浏览器
}

module.exports = {
  renderRecipeImage
}
